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
import autocompleteRoutes from './routes/autocomplete';

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

// Root: simple info so GET / is not 404
fastify.get('/', async (_request, reply) => {
  return reply.send({
    service: 'PFM Surveys API',
    health: '/health',
    embed: '/embed/script.js',
    timestamp: new Date().toISOString(),
  });
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
fastify.register(autocompleteRoutes);

// When DB/Redis are unreachable, return 503 with a clear message instead of 500
fastify.setErrorHandler((err, request, reply) => {
  const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : null;
  const isUnreachable = code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT';
  if (isUnreachable) {
    reply.code(503).send({
      error: 'Service temporarily unavailable',
      message: 'Database or Redis is unreachable. Start them with: docker compose up -d postgres redis',
    });
  } else {
    fastify.log.error(err);
    reply.code(err.statusCode ?? 500).send({
      error: err.message ?? 'Internal server error',
      statusCode: err.statusCode ?? 500,
    });
  }
});

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

