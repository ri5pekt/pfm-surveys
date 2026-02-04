import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection';

export default async function operationsRoutes(fastify: FastifyInstance) {
  // GET /api/operations/activity — worker activity logs (read-only), filtered by tenant's sites
  fastify.get('/activity', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as { tenant_id: string };
      const { service, status, site_id, from_date, to_date, limit } = request.query as {
        service?: string;
        status?: string;
        site_id?: string;
        from_date?: string;
        to_date?: string;
        limit?: string;
      };

      // Only show logs for sites belonging to the tenant
      const tenantSiteIds = await db
        .selectFrom('sites')
        .select('id')
        .where('tenant_id', '=', tenant_id)
        .execute();

      const siteIds = tenantSiteIds.map((r) => r.id);
      if (siteIds.length === 0) {
        return reply.send({ logs: [], total: 0 });
      }

      let query = db
        .selectFrom('worker_activity_logs')
        .selectAll()
        .where((eb) => eb('site_id', 'in', siteIds).or('site_id', 'is', null));

      if (service) {
        query = query.where('service', '=', service);
      }
      if (status) {
        query = query.where('status', '=', status);
      }
      if (site_id) {
        query = query.where('site_id', '=', site_id);
      }
      if (from_date) {
        query = query.where('created_at', '>=', new Date(from_date));
      }
      if (to_date) {
        query = query.where('created_at', '<=', new Date(to_date + 'T23:59:59.999Z'));
      }

      const cap = Math.min(parseInt(limit || '100', 10), 500);
      const logs = await query
        .orderBy('created_at', 'desc')
        .limit(cap)
        .execute();

      return reply.send({ logs, total: logs.length });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/operations/health — last success time per service (for health summary widget)
  fastify.get('/health', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as { tenant_id: string };

      const tenantSiteIds = await db
        .selectFrom('sites')
        .select('id')
        .where('tenant_id', '=', tenant_id)
        .execute();

      const siteIds = tenantSiteIds.map((r) => r.id);

      if (siteIds.length === 0) {
        return reply.send({
          last_ingestion_success: null,
          last_rollup_success: null,
        });
      }

      const lastSuccess = await db
        .selectFrom('worker_activity_logs')
        .select(['service', 'created_at'])
        .where('status', '=', 'success')
        .where((eb) => eb('site_id', 'in', siteIds).or('site_id', 'is', null))
        .orderBy('created_at', 'desc')
        .execute();

      const byService: Record<string, string> = {};
      for (const row of lastSuccess) {
        if (!byService[row.service]) {
          byService[row.service] = row.created_at.toISOString();
        }
      }

      return reply.send({
        last_ingestion_success: byService['worker-ingestion'] ?? null,
        last_rollup_success: byService['worker-rollups'] ?? null,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/operations/events — events stream (read-only), scoped to tenant's sites
  fastify.get('/events', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as { tenant_id: string };
      const { site_id, survey_id, event_type, from_date, to_date, limit } = request.query as {
        site_id?: string;
        survey_id?: string;
        event_type?: string;
        from_date?: string;
        to_date?: string;
        limit?: string;
      };

      const tenantSiteIds = await db
        .selectFrom('sites')
        .select('id')
        .where('tenant_id', '=', tenant_id)
        .execute();

      const siteIds = tenantSiteIds.map((r) => r.id);
      if (siteIds.length === 0) {
        return reply.send({ events: [], total: 0 });
      }

      let query = db
        .selectFrom('events')
        .select(['id', 'site_id', 'survey_id', 'event_type', 'client_event_id', 'anonymous_user_id', 'session_id', 'page_url', 'timestamp'])
        .where('site_id', 'in', siteIds);

      if (site_id) query = query.where('site_id', '=', site_id);
      if (survey_id) query = query.where('survey_id', '=', survey_id);
      if (event_type) query = query.where('event_type', '=', event_type);
      if (from_date) query = query.where('timestamp', '>=', new Date(from_date));
      if (to_date) query = query.where('timestamp', '<=', new Date(to_date + 'T23:59:59.999Z'));

      const cap = Math.min(parseInt(limit || '100', 10), 500);
      const events = await query
        .orderBy('id', 'desc')
        .limit(cap)
        .execute();

      return reply.send({ events, total: events.length });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/operations/responses — answers/responses (read-only), scoped to tenant's sites
  fastify.get('/responses', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tenant_id } = request.user as { tenant_id: string };
      const { site_id, survey_id, limit } = request.query as {
        site_id?: string;
        survey_id?: string;
        limit?: string;
      };

      const tenantSites = await db
        .selectFrom('sites')
        .select('id')
        .where('tenant_id', '=', tenant_id)
        .execute();

      const siteIds = tenantSites.map((r) => r.id);
      if (siteIds.length === 0) {
        return reply.send({ responses: [], total: 0 });
      }

      let query = db
        .selectFrom('answers')
        .innerJoin('events', 'events.id', 'answers.event_id')
        .select([
          'answers.id',
          'answers.event_id',
          'answers.survey_id',
          'answers.question_id',
          'answers.answer_option_id',
          'answers.answer_text',
          'answers.answer_index',
          'answers.anonymous_user_id',
          'answers.page_url',
          'answers.timestamp',
          'events.site_id',
        ])
        .where('events.site_id', 'in', siteIds);

      if (site_id) query = query.where('events.site_id', '=', site_id);
      if (survey_id) query = query.where('answers.survey_id', '=', survey_id);

      const cap = Math.min(parseInt(limit || '100', 10), 500);
      const responses = await query
        .orderBy('answers.id', 'desc')
        .limit(cap)
        .execute();

      return reply.send({ responses, total: responses.length });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
