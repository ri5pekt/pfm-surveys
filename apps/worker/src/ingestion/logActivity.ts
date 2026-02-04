import { db } from '../db/connection';

const SERVICE = 'worker-ingestion';
const JOB_NAME = 'ingest_events';
const QUEUE = 'event-ingestion';

const workerId = process.env.HOSTNAME || process.env.WORKER_ID || `worker-${process.pid}`;
const env = process.env.NODE_ENV || 'development';

export interface LogActivityParams {
  jobId: string;
  siteId: string;
  status: 'started' | 'success' | 'failed';
  itemsIn: number;
  itemsOut?: number;
  durationMs?: number;
  attempt?: number;
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const {
    jobId,
    siteId,
    status,
    itemsIn,
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
      job_name: JOB_NAME,
      job_id: jobId,
      queue: QUEUE,
      site_id: siteId,
      survey_id: null,
      from_event_id: null,
      to_event_id: null,
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
