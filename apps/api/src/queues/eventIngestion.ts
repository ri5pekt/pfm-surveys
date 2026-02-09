import { Queue } from "bullmq";
import { getRedis } from "../redis";

const QUEUE_NAME = "event-ingestion";

const JOB_OPTIONS = {
    attempts: 5,
    backoff: { type: "exponential" as const, delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
};

let queue: Queue | null = null;

export interface EventIngestionJobData {
    site_id: string; // internal UUID from sites.id
    events: Array<{
        event_type: string;
        client_event_id: string;
        timestamp: string | number;
        survey_id?: string | null;
        anonymous_user_id?: string | null;
        session_id?: string | null;
        page_url?: string | null;
        event_data?: unknown;
        browser?: string | null;
        os?: string | null;
        ip?: string | null;
    }>;
}

function getQueue(): Queue<EventIngestionJobData> {
    if (!queue) {
        const connection = getRedis();
        queue = new Queue<EventIngestionJobData>(QUEUE_NAME, {
            connection: connection as any,
            defaultJobOptions: JOB_OPTIONS,
        });
    }
    return queue;
}

/**
 * Enqueue a batch of events for the ingestion worker.
 * Batches should be 20–100 events per job (caller is responsible for chunking).
 */
export async function addEventIngestionJob(siteId: string, events: EventIngestionJobData["events"]): Promise<void> {
    if (events.length === 0) return;
    const q = getQueue();
    await q.add("ingest", { site_id: siteId, events }, JOB_OPTIONS);
}

/**
 * Enqueue multiple batches (e.g. one job per chunk of 50 events).
 */
export async function addEventIngestionJobs(
    siteId: string,
    events: EventIngestionJobData["events"],
    batchSize: number = 50,
): Promise<number> {
    let count = 0;
    for (let i = 0; i < events.length; i += batchSize) {
        const chunk = events.slice(i, i + batchSize);
        await addEventIngestionJob(siteId, chunk);
        count += 1;
    }
    return count;
}

/**
 * Clean up pending events for a deleted survey from the queue.
 * This prevents foreign key constraint violations when the worker processes orphaned events.
 * Note: This only affects jobs in "waiting" and "delayed" states. Active/completed jobs are not affected.
 */
export async function cleanupSurveyEvents(surveyId: string): Promise<number> {
    const q = getQueue();
    let removedCount = 0;

    try {
        // Get all waiting and delayed jobs
        const [waitingJobs, delayedJobs] = await Promise.all([
            q.getJobs(["waiting"]),
            q.getJobs(["delayed"]),
        ]);

        const allJobs = [...waitingJobs, ...delayedJobs];

        // Check each job and remove if it contains events for the deleted survey
        for (const job of allJobs) {
            if (!job || !job.data?.events) continue;

            const hasDeletedSurvey = job.data.events.some(
                (event: any) => event.survey_id === surveyId
            );

            if (hasDeletedSurvey) {
                await job.remove();
                removedCount++;
            }
        }

        return removedCount;
    } catch (error) {
        console.error(`[Queue] Error cleaning up events for survey ${surveyId}:`, error);
        return removedCount;
    }
}
