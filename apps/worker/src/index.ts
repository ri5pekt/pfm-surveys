import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Worker } from "bullmq";
import pino from "pino";
import { processIngestionJob } from "./ingestion/processor";

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

async function shutdown() {
    logger.info("Shutting down worker...");
    await ingestionWorker.close();
    process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
