import { Job } from "bullmq";
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

async function fetchGeoForIp(ip: string, apiKey: string): Promise<GeoResult | null> {
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
        return { country, state, state_name, city };
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
    event_data?: { answers?: Array<{ question_id: string; answer_option_id?: string; answer_text?: string }> };
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

    let eventsInserted = 0;
    let eventsSkippedDuplicate = 0;
    let answersInserted = 0;
    let validationRejects = 0;

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
            if (!ev || typeof ev.event_type !== "string" || typeof ev.client_event_id !== "string") {
                validationRejects += 1;
                continue;
            }

            const timestamp = toTimestamp(ev.timestamp ?? Date.now());
            const geo = ev.ip ? geoCache.get(ev.ip) ?? null : null;

            const inserted = await db
                .insertInto("events")
                .values({
                    site_id: siteId,
                    survey_id: ev.survey_id ?? null,
                    event_type: ev.event_type,
                    client_event_id: ev.client_event_id,
                    anonymous_user_id: ev.anonymous_user_id ?? null,
                    session_id: ev.session_id ?? null,
                    page_url: ev.page_url ?? null,
                    event_data: (() => {
                        const data = ev.event_data
                            ? { ...(typeof ev.event_data === "object" ? ev.event_data : {}) }
                            : {};
                        if (ev.browser != null) (data as any).browser = ev.browser;
                        if (ev.os != null) (data as any).os = ev.os;
                        if (ev.device != null) (data as any).device = ev.device;
                        if (ev.ip != null) (data as any).ip = ev.ip;
                        if (geo) {
                            if (geo.country != null) (data as any).country = geo.country;
                            if (geo.state != null) (data as any).state = geo.state;
                            if (geo.state_name != null) (data as any).state_name = geo.state_name;
                            if (geo.city != null) (data as any).city = geo.city;
                        }
                        return Object.keys(data).length > 0 ? JSON.stringify(data) : null;
                    })(),
                    timestamp,
                } as any)
                .onConflict((oc) => oc.column("client_event_id").doNothing())
                .returning(["id"])
                .executeTakeFirst();

            let eventId: number | null = null;
            if (inserted) {
                eventsInserted += 1;
                eventId = inserted.id;
            } else {
                eventsSkippedDuplicate += 1;
                // On retry the event may already exist; fetch id so we still insert answers (no data loss)
                const existing = await db
                    .selectFrom("events")
                    .select("id")
                    .where("client_event_id", "=", ev.client_event_id)
                    .where("site_id", "=", siteId)
                    .executeTakeFirst();
                eventId = existing?.id ?? null;
            }

            if (
                eventId != null &&
                ev.event_type === "answer" &&
                ev.survey_id &&
                ev.event_data &&
                Array.isArray(ev.event_data.answers)
            ) {
                const surveyId = ev.survey_id;
                const answers = ev.event_data.answers as Array<{
                    question_id: string;
                    answer_option_id?: string;
                    answer_text?: string;
                }>;
                for (let answerIndex = 0; answerIndex < answers.length; answerIndex += 1) {
                    const a = answers[answerIndex];
                    if (!a || !a.question_id) continue;
                    try {
                        await db
                            .insertInto("answers")
                            .values({
                                event_id: eventId,
                                survey_id: surveyId,
                                question_id: a.question_id,
                                answer_option_id: a.answer_option_id ?? null,
                                answer_text: a.answer_text ?? null,
                                answer_index: answerIndex,
                                anonymous_user_id: ev.anonymous_user_id ?? null,
                                page_url: ev.page_url ?? null,
                                timestamp,
                            } as any)
                            .onConflict((oc) => oc.columns(["event_id", "answer_index"]).doNothing())
                            .execute();
                        answersInserted += 1;
                    } catch {
                        // ignore duplicate or constraint errors
                    }
                }
            }
        }

        const durationMs = Date.now() - startedAt;
        await logActivity({
            jobId: String(jobId),
            siteId,
            status: "success",
            itemsIn,
            itemsOut: eventsInserted,
            durationMs,
            attempt: job.attemptsMade + 1,
            meta: {
                events_inserted: eventsInserted,
                events_skipped_duplicate: eventsSkippedDuplicate,
                answers_inserted: answersInserted,
                validation_rejects: validationRejects,
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
            itemsOut: eventsInserted,
            durationMs,
            attempt: job.attemptsMade + 1,
            errorMessage,
            meta: {
                events_inserted: eventsInserted,
                events_skipped_duplicate: eventsSkippedDuplicate,
                answers_inserted: answersInserted,
                validation_rejects: validationRejects,
            },
        });
        throw err;
    }
}
