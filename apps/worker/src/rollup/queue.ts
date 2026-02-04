import { Queue } from 'bullmq';

const ROLLUPS_QUEUE_NAME = 'rollups';
const ROLLUP_TICK_REPEAT_MS = 5 * 60 * 1000; // 5 minutes

const JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
};

let rollupQueue: Queue | null = null;

export interface RollupTickJobData {
  type: 'rollup_tick';
}

export interface RollupSiteJobData {
  type: 'rollup_site';
  site_id: string;
}

export type RollupJobData = RollupTickJobData | RollupSiteJobData;

export function getRollupQueue(connection: { host: string; port: number; password?: string; db?: number }): Queue<RollupJobData> {
  if (!rollupQueue) {
    rollupQueue = new Queue<RollupJobData>(ROLLUPS_QUEUE_NAME, {
      connection,
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return rollupQueue;
}

export async function scheduleRollupTick(connection: { host: string; port: number; password?: string; db?: number }): Promise<void> {
  const queue = getRollupQueue(connection);
  await queue.add(
    'rollup_tick',
    { type: 'rollup_tick' },
    {
      ...JOB_OPTIONS,
      repeat: { every: ROLLUP_TICK_REPEAT_MS },
    }
  );
}

/** Add a one-off rollup_tick job (e.g. for manual "run rollup now"). */
export async function addRollupTickJob(connection: { host: string; port: number; password?: string; db?: number }): Promise<void> {
  const queue = getRollupQueue(connection);
  await queue.add('rollup_tick', { type: 'rollup_tick' }, JOB_OPTIONS);
}

export async function addRollupSiteJob(
  connection: { host: string; port: number; password?: string; db?: number },
  siteId: string
): Promise<void> {
  const queue = getRollupQueue(connection);
  await queue.add(
    'rollup_site',
    { type: 'rollup_site', site_id: siteId },
    {
      ...JOB_OPTIONS,
      jobId: `rollup_site-${siteId}`,
    }
  );
}

export { ROLLUPS_QUEUE_NAME };
