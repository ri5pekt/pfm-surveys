import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from workspace root (2 levels up from this file)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { testConnection } from './db/connection';
import { getRedis } from './redis';
import corsPlugin from './plugins/cors';
import jwtPlugin from './plugins/jwt';
import authRoutes from './routes/auth';
import sitesRoutes from './routes/sites';
import surveysRoutes from './routes/surveys';
import teamRoutes from './routes/team';
import userRoutes from './routes/user';
import embedRoutes from './routes/embed';
import operationsRoutes from './routes/operations';

const PORT = parseInt(process.env.API_PORT || '3000', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.LOG_PRETTY_PRINT === 'true' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
  bodyLimit: 1048576, // 1MB global body limit
});

// Register plugins
fastify.register(corsPlugin);
fastify.register(jwtPlugin);

// Global rate limiting (catch general abuse)
fastify.register(rateLimit, {
  global: true,
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000', 10),
  timeWindow: '15 minutes',
  redis: getRedis(),
  skipOnError: true, // Graceful degradation if Redis is down
  allowList: ['127.0.0.1'],
  nameSpace: 'rl:global:',
});

// Health check route
fastify.get('/health', async () => {
  const dbHealthy = await testConnection();
  return {
    status: dbHealthy ? 'ok' : 'degraded',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(sitesRoutes, { prefix: '/api/sites' });
fastify.register(surveysRoutes, { prefix: '/api/surveys' });
fastify.register(teamRoutes);
fastify.register(userRoutes);
fastify.register(embedRoutes); // Public embed script and event tracking
fastify.register(operationsRoutes, { prefix: '/api/operations' });

// Start server
const start = async () => {
  try {
    // Test database connection
    const dbHealthy = await testConnection();
    if (!dbHealthy) {
      fastify.log.warn('Database connection failed, but starting server anyway');
    } else {
      fastify.log.info('Database connection successful');
    }

    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`API server listening on ${HOST}:${PORT}`);
    fastify.log.info(`Health check: http://${HOST}:${PORT}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

