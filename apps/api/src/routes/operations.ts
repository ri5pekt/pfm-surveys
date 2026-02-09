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

  // GET /api/operations/events — no longer available (events table dropped); return empty for backward compatibility
  fastify.get('/events', {
    onRequest: [fastify.authenticate],
  }, async (_request, reply) => {
    return reply.send({ events: [], total: 0 });
  });

  // GET /api/operations/responses — responses table (read-only), scoped to tenant's sites via survey->site
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
        .selectFrom('responses')
        .innerJoin('surveys', 'surveys.id', 'responses.survey_id')
        .select([
          'responses.id',
          'responses.survey_id',
          'responses.question_id',
          'responses.answer_option_id',
          'responses.answer_text',
          'responses.answer_index',
          'responses.anonymous_user_id',
          'responses.page_url',
          'responses.timestamp',
          'responses.browser',
          'responses.os',
          'responses.device',
          'responses.ip',
          'responses.country',
          'responses.state',
          'responses.state_name',
          'responses.city',
          'responses.session_id',
          'surveys.site_id',
        ])
        .where('surveys.site_id', 'in', siteIds);

      if (site_id) query = query.where('surveys.site_id', '=', site_id);
      if (survey_id) query = query.where('responses.survey_id', '=', survey_id);

      const cap = Math.min(parseInt(limit || '100', 10), 500);
      const responses = await query
        .orderBy('responses.id', 'desc')
        .limit(cap)
        .execute();

      return reply.send({ responses, total: responses.length });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
