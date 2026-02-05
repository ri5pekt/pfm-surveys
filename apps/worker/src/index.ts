import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Worker } from "bullmq";
import pino from "pino";
import { processIngestionJob } from "./ingestion/processor";
// Rollup disabled - not using rollup tables yet
// import { runRollupTick } from "./rollup/tick";
// import { processRollupSiteJob } from "./rollup/rollupSite";
// import { getRollupQueue, scheduleRollupTick, ROLLUPS_QUEUE_NAME, type RollupJobData } from "./rollup/queue";

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport:
        process.env.LOG_PRETTY_PRINT === "true"
            ? {
                  target: "pino-pretty",
                  options: {
                      translateTime: "HH:MM:ss Z",
                      ignore: "pid,hostname",
                  },
              }
            : undefined,
});

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || "0", 10);

const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD || undefined,
    db: REDIS_DB,
};

const EVENT_INGESTION_QUEUE = "event-ingestion";

logger.info("Starting worker service...");

const ingestionWorker = new Worker(
    EVENT_INGESTION_QUEUE,
    async (job) => {
        logger.info(
            { jobId: job.id, name: job.name, data: { site_id: job.data?.site_id, events: job.data?.events?.length } },
            "Processing ingestion job"
        );
        await processIngestionJob(job);
        logger.info({ jobId: job.id }, "Ingestion job completed");
    },
    {
        connection,
        concurrency: 5,
    }
);

ingestionWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err?.message }, "Ingestion job failed");
});

ingestionWorker.on("error", (err) => {
    logger.error({ err }, "Ingestion worker error");
});

logger.info({ redis: connection, queue: EVENT_INGESTION_QUEUE }, "Ingestion worker started");
const hasGeoKey = !!process.env.IP_API_KEY?.trim();
logger.info(
    { geoLookup: hasGeoKey ? "enabled" : "disabled" },
    hasGeoKey
        ? "Location (country/state/city) will be fetched from IP"
        : "Set IP_API_KEY in .env to enable location in responses"
);

// Rollup worker DISABLED - not using rollup tables yet
// const rollupWorker = new Worker<RollupJobData>(
//     ROLLUPS_QUEUE_NAME,
//     async (job) => {
//         const data = job.data;
//         if (data.type === "rollup_tick") {
//             logger.info({ jobId: job.id }, "Processing rollup_tick");
//             await runRollupTick(String(job.id), job.attemptsMade + 1, connection);
//             logger.info({ jobId: job.id }, "rollup_tick completed");
//         } else if (data.type === "rollup_site") {
//             logger.info({ jobId: job.id, site_id: data.site_id }, "Processing rollup_site");
//             await processRollupSiteJob(data.site_id, String(job.id), job.attemptsMade + 1);
//             logger.info({ jobId: job.id }, "rollup_site completed");
//         }
//     },
//     {
//         connection,
//         concurrency: 3,
//     }
// );
//
// rollupWorker.on("failed", (job, err) => {
//     logger.error({ jobId: job?.id, error: err?.message }, "Rollup job failed");
// });
//
// rollupWorker.on("error", (err) => {
//     logger.error({ err }, "Rollup worker error");
// });
//
// // Schedule repeatable rollup_tick (every 5 min)
// getRollupQueue(connection);
// scheduleRollupTick(connection)
//     .then(() => {
//         logger.info("Repeatable rollup_tick scheduled");
//     })
//     .catch((err) => {
//         logger.warn({ err }, "Could not schedule rollup_tick (may already exist)");
//     });
//
// logger.info({ queue: ROLLUPS_QUEUE_NAME }, "Rollup worker started");

logger.info("Rollup worker disabled (not using rollup tables yet)");

async function shutdown() {
    logger.info("Shutting down worker...");
    await ingestionWorker.close();
    // await rollupWorker.close(); // Rollup worker disabled
    process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
