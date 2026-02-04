import { db } from '../db/connection';

const SERVICE = 'worker-rollups';
const QUEUE = 'rollups';

const workerId = process.env.HOSTNAME || process.env.WORKER_ID || `worker-${process.pid}`;
const env = process.env.NODE_ENV || 'development';

export interface LogRollupActivityParams {
  jobId: string;
  jobName: string;
  siteId: string | null;
  status: 'started' | 'success' | 'failed';
  fromEventId?: number | null;
  toEventId?: number | null;
  itemsIn?: number | null;
  itemsOut?: number | null;
  durationMs?: number | null;
  attempt?: number | null;
  errorMessage?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function logRollupActivity(params: LogRollupActivityParams): Promise<void> {
  const {
    jobId,
    jobName,
    siteId,
    status,
    fromEventId = null,
    toEventId = null,
    itemsIn = null,
    itemsOut = null,
    durationMs = null,
    attempt = null,
    errorMessage = null,
    meta = null,
  } = params;

  await db
    .insertInto('worker_activity_logs')
    .values({
      env,
      service: SERVICE,
      worker_id: workerId,
      job_name: jobName,
      job_id: jobId,
      queue: QUEUE,
      site_id: siteId,
      survey_id: null,
      from_event_id: fromEventId,
      to_event_id: toEventId,
      items_in: itemsIn,
      items_out: itemsOut,
      status,
      duration_ms: durationMs,
      attempt,
      error_code: null,
      error_message: errorMessage ? String(errorMessage).slice(0, 500) : null,
      meta: meta ? JSON.stringify(meta) : null,
    } as any)
    .execute();
}
