import { Worker } from 'bullmq';
import pino from 'pino';
import 'dotenv/config';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.LOG_PRETTY_PRINT === 'true' ? {
    target: 'pino-pretty',
    options: {
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

logger.info('Starting worker service...');

// Placeholder - workers will be implemented later
const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

logger.info({ redis: connection }, 'Worker service initialized');

// Prevent immediate exit
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
