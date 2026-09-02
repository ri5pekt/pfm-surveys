/**
 * External API — /api/v1/
 *
 * Authenticated via API key (Authorization: Bearer pfm_sk_live_...)
 * instead of the admin JWT. All queries are tenant-scoped via the key's tenant_id.
 *
 * Available scopes:
 *   sites:read      — GET /api/v1/sites
 *   surveys:read    — GET /api/v1/surveys, GET /api/v1/surveys/:id
 *   responses:read  — GET /api/v1/surveys/:id/responses, .../summary
 */

import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/connection';

// ─── Scope guard ─────────────────────────────────────────────────────────────

function requireScope(
    request: Parameters<FastifyPluginAsync>[0]['addHook'] extends never ? never : any,
    reply: any,
    scope: string
): boolean {
    const scopes: string[] = request.apiKey?.scopes ?? [];
    if (!scopes.includes(scope)) {
        reply.status(403).send({
            error: 'Forbidden',
            message: `This API key does not have the required scope: ${scope}`,
        });
        return false;
    }
    return true;
}

// ─── Ownership helper ─────────────────────────────────────────────────────────

async function ensureSurveyOwnership(surveyId: string, tenantId: string) {
    return db
        .selectFrom('surveys')
        .innerJoin('sites', 'surveys.site_id', 'sites.id')
        .select('surveys.id')
        .where('surveys.id', '=', surveyId)
        .where('sites.tenant_id', '=', tenantId)
        .executeTakeFirst();
}

// ─── Routes ──────────────────────────────────────────────────────────────────

const v1Routes: FastifyPluginAsync = async (fastify) => {

    // ── GET /api/v1/sites ─────────────────────────────────────────────────────
    fastify.get('/sites', { onRequest: [fastify.authenticateApiKey] }, async (request, reply) => {
        if (!requireScope(request, reply, 'sites:read')) return;

        try {
            const { tenant_id } = request.apiKey!;

            const sites = await db
                .selectFrom('sites')
                .select(['id', 'name', 'site_id', 'domains', 'active', 'created_at', 'updated_at'])
                .where('tenant_id', '=', tenant_id)
                .where('active', '=', true)
                .orderBy('created_at', 'desc')
                .execute();

            return reply.send({ data: sites });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ── GET /api/v1/surveys ───────────────────────────────────────────────────
    fastify.get<{
        Querystring: { site_id?: string; active?: string; page?: string; limit?: string };
    }>('/surveys', { onRequest: [fastify.authenticateApiKey] }, async (request, reply) => {
        if (!requireScope(request, reply, 'surveys:read')) return;

        try {
            const { tenant_id } = request.apiKey!;
            const { site_id, active, page: pageStr, limit: limitStr } = request.query;

            const page = Math.max(1, parseInt(pageStr || '1', 10));
            const limit = Math.min(100, Math.max(1, parseInt(limitStr || '25', 10)));
            const offset = (page - 1) * limit;

            let query = db
                .selectFrom('surveys')
                .innerJoin('sites', 'surveys.site_id', 'sites.id')
                .select([
                    'surveys.id',
                    'surveys.site_id',
                    'surveys.name',
                    'surveys.type',
                    'surveys.active',
                    'surveys.created_at',
                    'surveys.updated_at',
                    'sites.name as site_name',
                ])
                .where('sites.tenant_id', '=', tenant_id);

            if (site_id) query = query.where('surveys.site_id', '=', site_id);
            if (active !== undefined) query = query.where('surveys.active', '=', active === 'true');

            const totalRow = await query
                .select(db.fn.countAll().as('count'))
                .clearSelect()
                .select(db.fn.countAll().as('count'))
                .executeTakeFirst();
            const total = Number((totalRow as any)?.count ?? 0);

            const surveys = await query
                .orderBy('surveys.created_at', 'desc')
                .limit(limit)
                .offset(offset)
                .execute();

            return reply.send({
                data: surveys,
                meta: { page, limit, total, pages: Math.ceil(total / limit) },
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ── GET /api/v1/surveys/:id ───────────────────────────────────────────────
    fastify.get<{ Params: { id: string } }>(
        '/surveys/:id',
        { onRequest: [fastify.authenticateApiKey] },
        async (request, reply) => {
            if (!requireScope(request, reply, 'surveys:read')) return;

            try {
                const { tenant_id } = request.apiKey!;
                const { id } = request.params;

                const survey = await db
                    .selectFrom('surveys')
                    .innerJoin('sites', 'surveys.site_id', 'sites.id')
                    .select([
                        'surveys.id',
                        'surveys.site_id',
                        'surveys.name',
                        'surveys.type',
                        'surveys.active',
                        'surveys.thank_you_message',
                        'surveys.created_at',
                        'surveys.updated_at',
                        'sites.name as site_name',
                    ])
                    .where('surveys.id', '=', id)
                    .where('sites.tenant_id', '=', tenant_id)
                    .executeTakeFirst();

                if (!survey) {
                    return reply.status(404).send({ error: 'Survey not found' });
                }

                const questions = await db
                    .selectFrom('questions')
                    .select(['id', 'question_text', 'question_type', 'required', 'order_index'])
                    .where('survey_id', '=', id)
                    .orderBy('order_index', 'asc')
                    .execute();

                const questionsWithOptions = await Promise.all(
                    questions.map(async (q) => {
                        const options = await db
                            .selectFrom('answer_options')
                            .select(['id', 'option_text', 'order_index'])
                            .where('question_id', '=', q.id)
                            .orderBy('order_index', 'asc')
                            .execute();
                        return { ...q, options };
                    })
                );

                return reply.send({ data: { ...survey, questions: questionsWithOptions } });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: 'Internal server error' });
            }
        }
    );

    // ── GET /api/v1/surveys/:id/responses ────────────────────────────────────
    fastify.get<{
        Params: { id: string };
        Querystring: {
            page?: string;
            limit?: string;
            question_id?: string;
            session_id?: string;
            from_date?: string;
            to_date?: string;
        };
    }>('/surveys/:id/responses', { onRequest: [fastify.authenticateApiKey] }, async (request, reply) => {
        if (!requireScope(request, reply, 'responses:read')) return;

        try {
            const { tenant_id } = request.apiKey!;
            const { id: surveyId } = request.params;
            const { page: pageStr, limit: limitStr, question_id, session_id, from_date, to_date } = request.query;

            const ownership = await ensureSurveyOwnership(surveyId, tenant_id);
            if (!ownership) {
                return reply.status(404).send({ error: 'Survey not found' });
            }

            const page = Math.max(1, parseInt(pageStr || '1', 10));
            const limit = Math.min(500, Math.max(1, parseInt(limitStr || '25', 10)));
            const offset = (page - 1) * limit;

            let baseQuery = db
                .selectFrom('responses')
                .where('responses.survey_id', '=', surveyId)
                .$if(!!question_id, (q) => q.where('responses.question_id', '=', question_id!))
                .$if(!!session_id, (q) => q.where('responses.session_id', '=', session_id!))
                .$if(!!from_date, (q) => q.where('responses.timestamp', '>=', (from_date! + 'T00:00:00.000Z') as any))
                .$if(!!to_date, (q) => q.where('responses.timestamp', '<=', (to_date! + 'T23:59:59.999Z') as any));

            const totalRow = await baseQuery.select(db.fn.countAll().as('count')).executeTakeFirst();
            const total = Number((totalRow as any)?.count ?? 0);

            const rows = await baseQuery
                .select([
                    'responses.id',
                    'responses.question_id',
                    'responses.answer_option_id',
                    'responses.answer_text',
                    'responses.page_url',
                    'responses.timestamp',
                    'responses.browser',
                    'responses.os',
                    'responses.device',
                    'responses.country',
                    'responses.state',
                    'responses.state_name',
                    'responses.city',
                    'responses.session_id',
                ])
                .orderBy('responses.timestamp', 'desc')
                .limit(limit)
                .offset(offset)
                .execute();

            // Resolve answer option labels
            const optionIds = [...new Set(rows.map((r) => r.answer_option_id).filter(Boolean))] as string[];
            const optionsMap = new Map<string, string>();
            if (optionIds.length > 0) {
                const opts = await db
                    .selectFrom('answer_options')
                    .select(['id', 'option_text'])
                    .where('id', 'in', optionIds)
                    .execute();
                for (const o of opts) optionsMap.set(o.id, o.option_text);
            }

            const data = rows.map((r) => {
                let display_label = '(No answer)';
                if (r.answer_option_id) {
                    const optText = optionsMap.get(r.answer_option_id);
                    if (optText && r.answer_text) display_label = `${optText}: ${r.answer_text}`;
                    else if (optText) display_label = optText;
                    else if (r.answer_text) display_label = r.answer_text;
                } else if (r.answer_text) {
                    display_label = r.answer_text;
                }

                return { ...r, display_label };
            });

            return reply.send({
                data,
                meta: { page, limit, total, pages: Math.ceil(total / limit) },
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ── GET /api/v1/surveys/:id/responses/summary ─────────────────────────────
    fastify.get<{
        Params: { id: string };
        Querystring: { question_id?: string };
    }>('/surveys/:id/responses/summary', { onRequest: [fastify.authenticateApiKey] }, async (request, reply) => {
        if (!requireScope(request, reply, 'responses:read')) return;

        try {
            const { tenant_id } = request.apiKey!;
            const { id: surveyId } = request.params;
            const { question_id: questionIdParam } = request.query;

            const ownership = await ensureSurveyOwnership(surveyId, tenant_id);
            if (!ownership) {
                return reply.status(404).send({ error: 'Survey not found' });
            }

            const questions = await db
                .selectFrom('questions')
                .select(['id', 'order_index', 'question_type'])
                .where('survey_id', '=', surveyId)
                .orderBy('order_index', 'asc')
                .execute();

            const questionId = questionIdParam ?? questions[0]?.id;
            if (!questionId) {
                return reply.send({
                    data: { total_responses: 0, total_answers: 0, top_answer: null, bars: [], question_id: null },
                });
            }

            const questionRow = questions.find((q) => q.id === questionId);
            const isTextQuestion = questionRow?.question_type === 'text';

            const answers = await db
                .selectFrom('responses')
                .leftJoin('answer_options', 'responses.answer_option_id', 'answer_options.id')
                .select([
                    'responses.id',
                    'responses.answer_option_id',
                    'responses.answer_text',
                    'answer_options.option_text as option_text',
                ])
                .where('responses.survey_id', '=', surveyId)
                .where('responses.question_id', '=', questionId)
                .execute();

            const total_answers = answers.length;
            let bars: { label: string; count: number; percentage: number }[] = [];
            let top_answer: { label: string; count: number; percentage: number } | null = null;
            let phrases: { phrase: string; count: number }[] = [];

            if (isTextQuestion) {
                const words = answers
                    .flatMap((a) =>
                        (a.answer_text ?? '')
                            .trim()
                            .toLowerCase()
                            .split(/\s+/)
                            .filter((w) => w.length > 3)
                    );
                const wordCounts = new Map<string, number>();
                for (const w of words) wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
                phrases = Array.from(wordCounts.entries())
                    .map(([phrase, count]) => ({ phrase, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 20);
            } else {
                const labelCounts = new Map<string, number>();
                for (const a of answers) {
                    const label =
                        a.answer_option_id && a.option_text != null
                            ? a.option_text
                            : a.answer_text ?? '(No answer)';
                    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
                }
                bars = Array.from(labelCounts.entries())
                    .map(([label, count]) => ({
                        label,
                        count,
                        percentage: total_answers > 0 ? Math.round((count / total_answers) * 100) : 0,
                    }))
                    .sort((a, b) => b.count - a.count);
                top_answer = bars[0] ?? null;
            }

            const totalResponsesRow = await db
                .selectFrom('responses')
                .select(db.fn.countAll().as('count'))
                .where('survey_id', '=', surveyId)
                .executeTakeFirst();
            const total_responses = Number((totalResponsesRow as any)?.count ?? 0);

            const stats = await db
                .selectFrom('survey_stats')
                .select(['total_impressions', 'total_responses', 'total_dismissals'])
                .where('survey_id', '=', surveyId)
                .executeTakeFirst();

            return reply.send({
                data: {
                    question_id: questionId,
                    is_text_question: isTextQuestion,
                    total_responses,
                    total_answers,
                    top_answer,
                    bars,
                    phrases: isTextQuestion ? phrases : [],
                    metrics: {
                        impressions: Number(stats?.total_impressions ?? 0),
                        responses: Number(stats?.total_responses ?? 0),
                        dismissals: Number(stats?.total_dismissals ?? 0),
                    },
                },
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
};

export default v1Routes;
