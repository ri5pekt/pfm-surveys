import type { FastifyInstance} from 'fastify';
import { db } from '../db/connection';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const createSiteSchema = z.object({
  name: z.string().min(1),
  domains: z.array(z.string()).optional(),
  allow_any_domain: z.boolean().optional(),
});

export default async function sitesRoutes(fastify: FastifyInstance) {
  // Get all sites for current user's tenant
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as any;

      const sites = await db
        .selectFrom('sites')
        .selectAll()
        .where('tenant_id', '=', tenant_id)
        .orderBy('created_at', 'desc')
        .execute();

      return { sites };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create a new site
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as any;
      const data = createSiteSchema.parse(request.body);

      const siteId = AuthService.generateSiteId();
      const siteSecret = AuthService.generateSiteSecret();

      const site = await db
        .insertInto('sites')
        .values({
          tenant_id,
          name: data.name,
          site_id: siteId,
          site_secret: siteSecret,
          domains: data.domains || null,
          allow_any_domain: data.allow_any_domain || false,
          active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return { site };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get single site
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as any;
      const { id } = request.params as { id: string };

      const site = await db
        .selectFrom('sites')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenant_id)
        .executeTakeFirst();

      if (!site) {
        return reply.status(404).send({ error: 'Site not found' });
      }

      return { site };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update site
  fastify.put('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as any;
      const { id } = request.params as { id: string };
      const data = createSiteSchema.parse(request.body);

      const site = await db
        .updateTable('sites')
        .set({
          name: data.name,
          domains: data.domains || null,
          allow_any_domain: data.allow_any_domain !== undefined ? data.allow_any_domain : false,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', tenant_id)
        .returningAll()
        .executeTakeFirst();

      if (!site) {
        return reply.status(404).send({ error: 'Site not found' });
      }

      return { site };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete site
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as any;
      const { id } = request.params as { id: string };

      const result = await db
        .deleteFrom('sites')
        .where('id', '=', id)
        .where('tenant_id', '=', tenant_id)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        return reply.status(404).send({ error: 'Site not found' });
      }

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
