import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  fastify.register(cors, {
    origin: (origin, cb) => {
      // In development, allow all origins (for testing)
      if (isDevelopment) {
        cb(null, true);
        return;
      }
      
      // In production, use whitelist
      const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
      
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Content-Type'],
  });
};

export default fp(corsPlugin);
