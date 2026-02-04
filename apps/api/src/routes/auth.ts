import type { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  tenant_name: z.string().min(1),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await AuthService.findUserByEmail(email);

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const isValidPassword = await AuthService.comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          tenant_id: user.tenant_id,
          tenant_name: (user as any).tenant_name,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Register (creates tenant + user)
  fastify.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await AuthService.findUserByEmail(data.email);
      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Create tenant
      const tenant = await AuthService.createTenant(data.tenant_name);

      // Create user
      const user = await AuthService.createUser({
        tenant_id: tenant.id,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          tenant_id: user.tenant_id,
          tenant_name: tenant.name,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user (protected route)
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await AuthService.findUserByEmail((request.user as any).email);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        tenant_id: user.tenant_id,
        tenant_name: (user as any).tenant_name,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
