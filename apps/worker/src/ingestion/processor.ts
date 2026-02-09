import { Job } from "bullmq";
import { sql } from "kysely";
import { db } from "../db/connection";
import { logActivity } from "./logActivity";

/** Geo result from ip-api.com Pro (country/state/city). */
export interface GeoResult {
    country?: string;
    state?: string;
    state_name?: string;
    city?: string;
}

const GEO_TIMEOUT_MS = 4000;
const IP_API_BASE = "https://pro.ip-api.com/json";

/**
 * Fetch geolocation from database cache or API
 * 1. Check database cache first
 * 2. If not found, call IP API
 * 3. Save result to database cache
 * 4. Update last_seen_at and lookup_count on cache hit
 */
async function fetchGeoForIp(ip: string, apiKey: string): Promise<GeoResult | null> {
    const cached = await db
        .selectFrom("ip_geolocation_cache")
        .selectAll()
        .where("ip", "=", ip)
        .executeTakeFirst();

    if (cached) {
        await db
            .updateTable("ip_geolocation_cache")
            .set({
                last_seen_at: new Date(),
                lookup_count: cached.lookup_count + 1,
            })
            .where("ip", "=", ip)
            .execute();

        return {
            country: cached.country ?? undefined,
            state: cached.state ?? undefined,
            state_name: cached.state_name ?? undefined,
            city: cached.city ?? undefined,
        };
    }

    const url = `${IP_API_BASE}/${encodeURIComponent(
        ip
    )}?fields=status,countryCode,region,regionName,city&key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal, headers: { "Cache-Control": "no-cache" } });
        clearTimeout(timeout);
        const body = (await res.json()) as {
            status?: string;
            countryCode?: string;
            region?: string;
            regionName?: string;
            city?: string;
        };

        if (body?.status !== "success") return null;

        const country = body.countryCode != null ? String(body.countryCode).toUpperCase() : undefined;
        const state = body.region != null ? String(body.region).toUpperCase() : undefined;
        const state_name = body.regionName != null ? String(body.regionName) : undefined;
        const city = body.city != null ? String(body.city) : undefined;

        const result: GeoResult = { country, state, state_name, city };

        try {
            await db
                .insertInto("ip_geolocation_cache")
                .values({
                    ip,
                    country: country ?? null,
                    state: state ?? null,
                    state_name: state_name ?? null,
                    city: city ?? null,
                    lookup_count: 1,
                    first_seen_at: new Date(),
                    last_seen_at: new Date(),
                    created_at: new Date(),
                })
                .execute();
        } catch {
            // Ignore duplicate key (race between workers)
        }

        return result;
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

export interface IngestEventPayload {
    event_type: string;
    client_event_id: string;
    timestamp: string | number;
    survey_id?: string | null;
    anonymous_user_id?: string | null;
    session_id?: string | null;
    page_url?: string | null;
    event_data?: {
        answers?: Array<{ question_id: string; answer_option_id?: string; answer_text?: string }>;
        reason?: string; // for dismiss: "close" | "minimize" | "auto_close"
    };
    browser?: string | null;
    os?: string | null;
    device?: string | null;
    ip?: string | null;
}

export interface IngestJobData {
    site_id: string;
    events: IngestEventPayload[];
}

function toTimestamp(ts: string | number): Date {
    if (typeof ts === "number") return new Date(ts);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
}

const COUNTER_MAP: Record<string, string> = {
    impression: "total_impressions",
    answer: "total_responses",
    dismiss: "total_dismissals",
    close: "total_closes",
    minimize: "total_minimizes",
    interact: "total_interacts",
};

export async function processIngestionJob(job: Job<IngestJobData>): Promise<void> {
    const { site_id: siteId, events } = job.data;
    const jobId = job.id ?? "unknown";
    const startedAt = Date.now();
    const itemsIn = events.length;

    await logActivity({
        jobId: String(jobId),
        siteId,
        status: "started",
        itemsIn,
        attempt: job.attemptsMade + 1,
    });

    let eventsSkippedDuplicate = 0;
    let responsesInserted = 0;
    let validationRejects = 0;
    let countersIncremented = 0;

    const apiKey = process.env.IP_API_KEY?.trim() || null;
    const geoCache = new Map<string, GeoResult | null>();
    const uniqueIps = [
        ...new Set(events.map((e) => e?.ip).filter((ip): ip is string => typeof ip === "string" && ip.length > 0)),
    ];
    if (apiKey && uniqueIps.length > 0) {
        await Promise.all(
            uniqueIps.map(async (ip) => {
                const geo = await fetchGeoForIp(ip, apiKey);
                geoCache.set(ip, geo);
            })
        );
    }

    try {
        for (const ev of events) {
            if (!ev || typeof ev.event_type !== "string") {
                validationRejects += 1;
                continue;
            }

            // Require client_event_id — reject missing IDs (otherwise duplicates slip in)
            if (!ev.client_event_id || typeof ev.client_event_id !== "string") {
                console.warn("Event missing client_event_id — REJECTED (validation failure)");
                validationRejects += 1;
                continue;
            }

            // Require survey_id for dedup and counters (event_dedup.survey_id NOT NULL)
            if (!ev.survey_id) {
                validationRejects += 1;
                continue;
            }

            // 1. Race-safe deduplication: only one worker wins the INSERT
            const dedupResult = await db
                .insertInto("event_dedup")
                .values({
                    event_uid: ev.client_event_id,
                    event_type: ev.event_type,
                    survey_id: ev.survey_id,
                    processed_at: new Date(),
                })
                .onConflict((oc) => oc.column("event_uid").doNothing())
                .returning(["event_uid"])
                .executeTakeFirst();

            if (!dedupResult) {
                eventsSkippedDuplicate += 1;
                continue;
            }

            const timestamp = toTimestamp(ev.timestamp ?? Date.now());
            const geo = ev.ip ? geoCache.get(ev.ip) ?? null : null;

            // 2. If answer event, insert into responses with metadata
            if (
                ev.event_type === "answer" &&
                ev.event_data &&
                Array.isArray(ev.event_data.answers)
            ) {
                const answers = ev.event_data.answers;
                for (let answerIndex = 0; answerIndex < answers.length; answerIndex += 1) {
                    const a = answers[answerIndex];
                    if (!a || !a.question_id) continue;
                    try {
                        await db
                            .insertInto("responses")
                            .values({
                                survey_id: ev.survey_id,
                                question_id: a.question_id,
                                answer_option_id: a.answer_option_id ?? null,
                                answer_text: a.answer_text ?? null,
                                answer_index: answerIndex,
                                anonymous_user_id: ev.anonymous_user_id ?? null,
                                page_url: ev.page_url ?? null,
                                timestamp,
                                browser: ev.browser ?? null,
                                os: ev.os ?? null,
                                device: ev.device ?? null,
                                ip: ev.ip ?? null,
                                country: geo?.country ?? null,
                                state: geo?.state ?? null,
                                state_name: geo?.state_name ?? null,
                                city: geo?.city ?? null,
                                session_id: ev.session_id ?? null,
                            })
                            .execute();
                        responsesInserted += 1;
                    } catch (insertErr) {
                        const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
                        if (errMsg.includes("foreign key constraint") || errMsg.includes("violates")) {
                            validationRejects += 1;
                            break;
                        }
                        throw insertErr;
                    }
                }
            }

            // 3. Increment counter in survey_stats (explicit mapping, no dynamic columns)
            const counterColumn = COUNTER_MAP[ev.event_type];
            if (!counterColumn) {
                console.warn(`Unknown event_type: ${ev.event_type}, skipping counter update`);
                continue;
            }

            try {
                const now = new Date();
                await db
                    .insertInto("survey_stats")
                    .values({
                        survey_id: ev.survey_id,
                        [counterColumn]: 1,
                        first_impression_at: ev.event_type === "impression" ? now : null,
                        last_activity_at: now,
                        updated_at: now,
                    } as any)
                    .onConflict((oc) =>
                        oc.column("survey_id").doUpdateSet({
                            [counterColumn]: sql`survey_stats.${sql.raw(counterColumn)} + 1`,
                            last_activity_at: now,
                            updated_at: now,
                        } as any)
                    )
                    .execute();
                countersIncremented += 1;

                // For "dismiss" events, also increment close vs minimize from event_data.reason (embed sends reason in event_data)
                if (ev.event_type === "dismiss" && ev.survey_id) {
                    const eventData = ev.event_data && typeof ev.event_data === "object" ? ev.event_data : {};
                    const reason = typeof (eventData as { reason?: string }).reason === "string"
                        ? (eventData as { reason: string }).reason
                        : "close";
                    const subColumn = reason === "minimize" ? "total_minimizes" : "total_closes";
                    await db
                        .insertInto("survey_stats")
                        .values({
                            survey_id: ev.survey_id,
                            [subColumn]: 1,
                            last_activity_at: now,
                            updated_at: now,
                        } as any)
                        .onConflict((oc) =>
                            oc.column("survey_id").doUpdateSet({
                                [subColumn]: sql`survey_stats.${sql.raw(subColumn)} + 1`,
                                last_activity_at: now,
                                updated_at: now,
                            } as any)
                        )
                        .execute();
                    countersIncremented += 1;
                }
            } catch (counterErr) {
                const errMsg = counterErr instanceof Error ? counterErr.message : String(counterErr);
                if (errMsg.includes("foreign key constraint") || errMsg.includes("violates")) {
                    validationRejects += 1;
                    continue;
                }
                throw counterErr;
            }
        }

        const durationMs = Date.now() - startedAt;
        await logActivity({
            jobId: String(jobId),
            siteId,
            status: "success",
            itemsIn,
            itemsOut: responsesInserted + countersIncremented,
            durationMs,
            attempt: job.attemptsMade + 1,
            meta: {
                responses_inserted: responsesInserted,
                events_skipped_duplicate: eventsSkippedDuplicate,
                validation_rejects: validationRejects,
                counters_incremented: countersIncremented,
            },
        });
    } catch (err) {
        const durationMs = Date.now() - startedAt;
        const errorMessage = err instanceof Error ? err.message : String(err);
        await logActivity({
            jobId: String(jobId),
            siteId,
            status: "failed",
            itemsIn,
            itemsOut: responsesInserted,
            durationMs,
            attempt: job.attemptsMade + 1,
            errorMessage,
            meta: {
                responses_inserted: responsesInserted,
                events_skipped_duplicate: eventsSkippedDuplicate,
                validation_rejects: validationRejects,
            },
        });
        throw err;
    }
}
