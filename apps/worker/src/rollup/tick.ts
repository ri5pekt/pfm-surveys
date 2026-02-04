import { db } from '../db/connection';
import { logRollupActivity } from './logActivity';
import { addRollupSiteJob } from './queue';
import { sql } from 'kysely';

export async function runRollupTick(
  jobId: string,
  attempt: number,
  connection: { host: string; port: number; password?: string; db?: number }
): Promise<void> {
  const startedAt = Date.now();

  try {
    // Sites with new events: max(event.id) per site > rollup_state.last_processed_event_id (or no rollup_state row)
    const result = await sql<{ site_id: string }>`
      SELECT e.site_id
      FROM (SELECT site_id, max(id) AS max_id FROM events GROUP BY site_id) e
      LEFT JOIN rollup_state r ON r.site_id = e.site_id
      WHERE r.last_processed_event_id IS NULL OR e.max_id > r.last_processed_event_id
    `.execute(db);

    // Kysely/pg may return { rows } or array-like; be defensive
    const rows = (result as { rows?: { site_id: string }[] }).rows ?? (result as unknown as { site_id: string }[]);
    const siteIds = Array.isArray(rows) ? rows.map((r) => r.site_id) : [];

    for (const siteId of siteIds) {
      await addRollupSiteJob(connection, siteId);
    }

    const durationMs = Date.now() - startedAt;
    await logRollupActivity({
      jobId,
      jobName: 'rollup_tick',
      siteId: null,
      status: 'success',
      itemsIn: siteIds.length,
      itemsOut: siteIds.length,
      durationMs,
      attempt,
      meta: { sites_enqueued: siteIds.length, site_ids: siteIds },
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err instanceof Error ? err.message : String(err);
    await logRollupActivity({
      jobId,
      jobName: 'rollup_tick',
      siteId: null,
      status: 'failed',
      durationMs,
      attempt,
      errorMessage,
    });
    throw err;
  }
}
