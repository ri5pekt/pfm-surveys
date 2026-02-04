import { sql } from "kysely";
import { db } from "../db/connection";
import { logRollupActivity } from "./logActivity";

const CHUNK_SIZE = 1000;
const ROLLUP_EVENT_TYPES = new Set(["impression", "answer", "dismiss"]);

function toDateUtc(ts: Date): string {
    const d = new Date(ts);
    return d.toISOString().slice(0, 10);
}

export async function processRollupSiteJob(siteId: string, jobId: string, attempt: number): Promise<void> {
    const startedAt = Date.now();

    await logRollupActivity({
        jobId,
        jobName: "rollup_site",
        siteId,
        status: "started",
        attempt,
    });

    try {
        const trx = await db.transaction().execute(async (trx) => {
            // 1) Get watermark for site (insert if missing)
            let state = await trx
                .selectFrom("rollup_state")
                .select(["last_processed_event_id"])
                .where("site_id", "=", siteId)
                .executeTakeFirst();

            const watermarkBefore = state?.last_processed_event_id ?? 0;

            if (!state) {
                await trx
                    .insertInto("rollup_state")
                    .values({ site_id: siteId, last_processed_event_id: 0 } as any)
                    .execute();
            }

            // 2) Next chunk of events
            const chunk = await trx
                .selectFrom("events")
                .select(["id", "site_id", "survey_id", "event_type", "anonymous_user_id", "timestamp"])
                .where("site_id", "=", siteId)
                .where("id", ">", watermarkBefore)
                .orderBy("id", "asc")
                .limit(CHUNK_SIZE)
                .execute();

            if (chunk.length === 0) {
                return {
                    minId: watermarkBefore,
                    maxId: watermarkBefore,
                    itemsIn: 0,
                    itemsOut: 0,
                    meta: { watermark_before: watermarkBefore, no_events: true },
                };
            }

            const eventIds = chunk.map((e) => e.id);
            const minId = chunk[0].id;
            const maxId = chunk[chunk.length - 1].id;

            // 3) Bulk insert into processed_events ON CONFLICT DO NOTHING RETURNING event_id
            const inserted = await trx
                .insertInto("processed_events")
                .values(eventIds.map((event_id) => ({ event_id })) as any)
                .onConflict((oc) => oc.column("event_id").doNothing())
                .returning(["event_id"])
                .execute();

            const newlyProcessedIds = inserted.map((r) => r.event_id);
            if (newlyProcessedIds.length === 0) {
                await trx
                    .updateTable("rollup_state")
                    .set({
                        last_processed_event_id: maxId,
                        last_processed_at: new Date(),
                        updated_at: new Date(),
                    })
                    .where("site_id", "=", siteId)
                    .execute();
                return {
                    minId,
                    maxId,
                    itemsIn: chunk.length,
                    itemsOut: 0,
                    meta: {
                        watermark_before: watermarkBefore,
                        watermark_after: maxId,
                        processed_events_inserted: 0,
                        all_skipped: true,
                    },
                };
            }

            const newEventsSet = new Set(newlyProcessedIds);
            const newEvents = chunk.filter((e) => newEventsSet.has(e.id));

            // 4) Aggregate by (site_id, survey_id, date_utc, event_type) and distinct (site_id, survey_id, date_utc, anonymous_user_id) for impression/answer/dismiss
            type GroupKey = string;
            const counts: Record<
                GroupKey,
                { impressions: number; responses: number; dismissals: number; uniqueUserIds: Set<string> }
            > = {};

            for (const e of newEvents) {
                if (!e.survey_id) continue; // skip events without survey (e.g. page_view)
                const surveyId = e.survey_id;
                const dateUtc = toDateUtc(e.timestamp);
                const key: GroupKey = `${e.site_id}|${surveyId}|${dateUtc}`;
                if (!counts[key]) {
                    counts[key] = { impressions: 0, responses: 0, dismissals: 0, uniqueUserIds: new Set() };
                }
                const g = counts[key];
                if (e.event_type === "impression") g.impressions += 1;
                else if (e.event_type === "answer") g.responses += 1;
                else if (e.event_type === "dismiss") g.dismissals += 1;
                if (ROLLUP_EVENT_TYPES.has(e.event_type) && e.anonymous_user_id) {
                    g.uniqueUserIds.add(e.anonymous_user_id);
                }
            }

            // 5) Insert daily_unique_users and count new inserts per group (avoid double-counting unique_users)
            const newUniqueCountByKey: Record<string, number> = {};
            let dailyUniqueAttempted = 0;
            for (const [key, g] of Object.entries(counts)) {
                const [site_id, survey_id, dateStr] = key.split("|");
                if (!site_id || !survey_id) continue;
                const date = new Date(dateStr + "T00:00:00.000Z");
                let newForGroup = 0;
                for (const anonymous_user_id of g.uniqueUserIds) {
                    try {
                        const inserted = await trx
                            .insertInto("daily_unique_users")
                            .values({ site_id, survey_id, date, anonymous_user_id } as any)
                            .onConflict((oc) =>
                                oc.columns(["site_id", "survey_id", "date", "anonymous_user_id"]).doNothing(),
                            )
                            .returning(["anonymous_user_id"])
                            .executeTakeFirst();
                        if (inserted) newForGroup += 1;
                    } catch {
                        // ignore duplicate
                    }
                    dailyUniqueAttempted += 1;
                }
                newUniqueCountByKey[key] = newForGroup;
            }

            // 6) Upsert rollups_daily (increment unique_users only by newly inserted users)
            for (const [key, g] of Object.entries(counts)) {
                const [site_id, survey_id, dateStr] = key.split("|");
                if (!site_id || !survey_id) continue;
                const date = new Date(dateStr + "T00:00:00.000Z");
                const newUniqueUsers = newUniqueCountByKey[key] ?? 0;
                await trx
                    .insertInto("rollups_daily")
                    .values({
                        site_id,
                        survey_id,
                        date,
                        impressions: g.impressions,
                        responses: g.responses,
                        dismissals: g.dismissals,
                        unique_users: newUniqueUsers,
                        updated_at: new Date(),
                    } as any)
                    .onConflict((oc) =>
                        oc.columns(["site_id", "survey_id", "date"]).doUpdateSet({
                            impressions: sql`rollups_daily.impressions + ${g.impressions}`,
                            responses: sql`rollups_daily.responses + ${g.responses}`,
                            dismissals: sql`rollups_daily.dismissals + ${g.dismissals}`,
                            unique_users: sql`rollups_daily.unique_users + ${newUniqueUsers}`,
                            updated_at: new Date(),
                        }),
                    )
                    .execute();
            }

            // 7) Advance watermark to max event id in chunk
            await trx
                .updateTable("rollup_state")
                .set({
                    last_processed_event_id: maxId,
                    last_processed_at: new Date(),
                    updated_at: new Date(),
                })
                .where("site_id", "=", siteId)
                .execute();

            const rollupRowsUpserted = Object.keys(counts).length;
            return {
                minId,
                maxId,
                itemsIn: chunk.length,
                itemsOut: newlyProcessedIds.length,
                meta: {
                    watermark_before: watermarkBefore,
                    watermark_after: maxId,
                    processed_events_inserted: newlyProcessedIds.length,
                    rollup_rows_upserted: rollupRowsUpserted,
                    daily_unique_users_attempted: dailyUniqueAttempted,
                },
            };
        });

        const durationMs = Date.now() - startedAt;
        await logRollupActivity({
            jobId,
            jobName: "rollup_site",
            siteId,
            status: "success",
            fromEventId: (trx as any).minId,
            toEventId: (trx as any).maxId,
            itemsIn: (trx as any).itemsIn,
            itemsOut: (trx as any).itemsOut,
            durationMs,
            attempt,
            meta: (trx as any).meta,
        });
    } catch (err) {
        const durationMs = Date.now() - startedAt;
        const errorMessage = err instanceof Error ? err.message : String(err);
        await logRollupActivity({
            jobId,
            jobName: "rollup_site",
            siteId,
            status: "failed",
            durationMs,
            attempt,
            errorMessage,
        });
        throw err;
    }
}
