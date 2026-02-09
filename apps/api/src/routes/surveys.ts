import type { FastifyInstance } from "fastify";
import { sql } from "kysely";
import { db } from "../db/connection";
import { z } from "zod";
import { cleanupSurveyEvents } from "../queues/eventIngestion";

/** Stopwords for 2-word phrase extraction (open-text answers) */
const STOPWORDS = new Set(
    (
        "a an the and or but in on at to for of with by from as is was are were been be have has had do does did " +
        "will would could should may might must shall can need it its i you he she we they this that what which who when where why how"
    ).split(/\s+/)
);

const MIN_ANSWERS_FOR_PHRASE = 2;
const TOP_PHRASES_LIMIT = 25;

/**
 * Extract 2-word phrases from open-text answers: normalize, drop stopwords, count how many answers contain each phrase.
 * Returns phrases that appear in at least MIN_ANSWERS_FOR_PHRASE answers, sorted by that count desc, top N.
 */
function getTwoWordPhrases(answerTexts: string[]): { phrase: string; answerCount: number }[] {
    const phraseToAnswerIndices = new Map<string, Set<number>>();

    for (let answerIndex = 0; answerIndex < answerTexts.length; answerIndex++) {
        const raw = answerTexts[answerIndex] ?? "";
        const normalized = raw
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const words = normalized.split(/\s+/).filter((w) => w.length > 0 && !STOPWORDS.has(w));
        const seen = new Set<string>();
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = `${words[i]} ${words[i + 1]}`;
            if (seen.has(phrase)) continue;
            seen.add(phrase);
            if (!phraseToAnswerIndices.has(phrase)) {
                phraseToAnswerIndices.set(phrase, new Set());
            }
            phraseToAnswerIndices.get(phrase)!.add(answerIndex);
        }
    }

    return Array.from(phraseToAnswerIndices.entries())
        .filter(([, indices]) => indices.size >= MIN_ANSWERS_FOR_PHRASE)
        .map(([phrase, indices]) => ({ phrase, answerCount: indices.size }))
        .sort((a, b) => b.answerCount - a.answerCount)
        .slice(0, TOP_PHRASES_LIMIT);
}

const createSurveySchema = z.object({
    site_id: z.string().uuid(),
    name: z.string().min(1),
    type: z.string().default("popover"),
    description: z.string().optional(),
    thank_you_message: z.string().nullable().optional(),
    active: z.boolean().optional(),
    questions: z
        .array(
            z.object({
                text: z.string(),
                type: z.enum(["radio", "text"]),
                options: z
                    .array(
                        z.union([
                            z.string(), // legacy format
                            z.object({
                                // new format
                                text: z.string(),
                                requires_comment: z.boolean().optional(),
                                pin_to_bottom: z.boolean().optional(),
                            }),
                        ])
                    )
                    .optional(),
                required: z.boolean().default(true),
                randomize_options: z.boolean().optional(),
            })
        )
        .optional(),
    targeting: z
        .object({
            pageType: z.enum(["all", "specific"]),
            pageRules: z
                .array(
                    z.object({
                        type: z.enum(["exact", "contains"]),
                        value: z.string(),
                    })
                )
                .optional(),
        })
        .optional(),
    behavior: z
        .object({
            timing: z.enum(["immediate", "delay"]),
            delaySeconds: z.number().default(0),
            frequency: z.enum(["until_submit", "once", "always"]),
        })
        .optional(),
    appearance: z
        .object({
            backgroundColor: z.string().optional(),
        })
        .optional(),
});

export default async function surveysRoutes(fastify: FastifyInstance) {
    // Get all surveys for a site
    fastify.get(
        "/",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { site_id, active } = request.query as { site_id?: string; active?: string };

                let query = db
                    .selectFrom("surveys")
                    .leftJoin("sites", "surveys.site_id", "sites.id")
                    .leftJoin("users", "surveys.created_by", "users.id")
                    .select([
                        "surveys.id",
                        "surveys.site_id",
                        "surveys.name",
                        "surveys.description",
                        "surveys.type",
                        "surveys.active",
                        "surveys.created_by",
                        "surveys.created_at",
                        "surveys.updated_at",
                        "sites.name as site_name",
                        "users.first_name as creator_first_name",
                        "users.last_name as creator_last_name",
                    ])
                    .where("sites.tenant_id", "=", tenant_id);

                if (site_id) {
                    query = query.where("surveys.site_id", "=", site_id);
                }

                if (active !== undefined) {
                    query = query.where("surveys.active", "=", active === "true");
                }

                const surveys = await query.orderBy("surveys.created_at", "desc").execute();

                const surveyIds = surveys.map((s) => s.id);
                const responseCounts = new Map<string, number>();
                const interactionCounts = new Map<string, number>();
                const impressionCounts = new Map<string, number>();
                const dismissalCounts = new Map<string, number>();

                if (surveyIds.length > 0) {
                    const statsRows = await db
                        .selectFrom("survey_stats")
                        .select(["survey_id", "total_responses", "total_impressions", "total_dismissals"])
                        .where("survey_id", "in", surveyIds)
                        .execute();
                    for (const row of statsRows) {
                        responseCounts.set(row.survey_id, Number(row.total_responses));
                        impressionCounts.set(row.survey_id, Number(row.total_impressions));
                        dismissalCounts.set(row.survey_id, Number(row.total_dismissals));
                        const total =
                            Number(row.total_impressions) +
                            Number(row.total_responses) +
                            Number(row.total_dismissals);
                        interactionCounts.set(row.survey_id, total);
                    }
                }

                const surveysWithCounts = surveys.map((survey) => ({
                    ...survey,
                    responses: responseCounts.get(survey.id) ?? 0,
                    interactions: interactionCounts.get(survey.id) ?? 0,
                    impressions: impressionCounts.get(survey.id) ?? 0,
                    dismissals: dismissalCounts.get(survey.id) ?? 0,
                }));

                return { surveys: surveysWithCounts };
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // Create survey with all data
    fastify.post(
        "/",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { id: userId, tenant_id } = request.user as any;
                const data = createSurveySchema.parse(request.body);

                // Verify site belongs to tenant
                const site = await db
                    .selectFrom("sites")
                    .select("id")
                    .where("id", "=", data.site_id)
                    .where("tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!site) {
                    return reply.status(404).send({ error: "Site not found" });
                }

                // Create survey (honor active from request so "Active" trigger works on create)
                const survey = await db
                    .insertInto("surveys")
                    .values({
                        site_id: data.site_id,
                        name: data.name,
                        type: data.type,
                        description: data.description || null,
                        thank_you_message: data.thank_you_message || null,
                        active: data.active === true,
                        created_by: userId,
                    } as any)
                    .returningAll()
                    .executeTakeFirstOrThrow();

                // Save questions and options
                if (data.questions && data.questions.length > 0) {
                    for (let i = 0; i < data.questions.length; i++) {
                        const q = data.questions[i];

                        const question = await db
                            .insertInto("questions")
                            .values({
                                survey_id: survey.id,
                                question_text: q.text,
                                question_type: q.type,
                                required: q.required,
                                randomize_options: q.randomize_options ?? false,
                                order_index: i,
                            } as any)
                            .returningAll()
                            .executeTakeFirstOrThrow();

                        // Save answer options for radio/checkbox questions
                        if (q.type === "radio" && q.options && q.options.length > 0) {
                            for (let j = 0; j < q.options.length; j++) {
                                const opt = q.options[j];
                                const optText = typeof opt === "string" ? opt : opt.text;
                                const requiresComment = typeof opt === "object" ? opt.requires_comment ?? false : false;
                                const pinToBottom = typeof opt === "object" ? opt.pin_to_bottom ?? false : false;
                                await db
                                    .insertInto("answer_options")
                                    .values({
                                        question_id: question.id,
                                        option_text: optText,
                                        requires_comment: requiresComment,
                                        pin_to_bottom: pinToBottom,
                                        order_index: j,
                                    } as any)
                                    .execute();
                            }
                        }
                    }
                }

                // Save targeting rules (page rules + user geo rules)
                if (data.targeting) {
                    if (data.targeting.pageType === "specific" && data.targeting.pageRules) {
                        for (const rule of data.targeting.pageRules) {
                            if (rule.value) {
                                await db
                                    .insertInto("targeting_rules")
                                    .values({
                                        survey_id: survey.id,
                                        rule_type: rule.type,
                                        rule_config: JSON.stringify({ value: rule.value }),
                                    })
                                    .execute();
                            }
                        }
                    }
                    if (data.targeting.userType === "specific" && data.targeting.userRules) {
                        for (const r of data.targeting.userRules) {
                            if (r.type === "geo") {
                                await db
                                    .insertInto("targeting_rules")
                                    .values({
                                        survey_id: survey.id,
                                        rule_type: "geo",
                                        rule_config: JSON.stringify({
                                            country: r.country ?? "",
                                            state: r.state ?? "",
                                            city: r.city ?? "",
                                        }),
                                    })
                                    .execute();
                            }
                        }
                    }
                }

                // Save display settings
                const behavior = data.behavior || {
                    timing: "immediate",
                    delaySeconds: 0,
                    scrollPercentage: 50,
                    frequency: "until_submit",
                };
                const showDelayMs =
                    behavior.timing === "delay"
                        ? Math.max(0, Math.floor(Number(behavior.delaySeconds) || 0) * 1000)
                        : 0;
                const displaySettings = (data as any).displaySettings || {};
                await db
                    .insertInto("display_settings")
                    .values({
                        survey_id: survey.id,
                        position: "bottom-right",
                        show_delay_ms: showDelayMs,
                        auto_close_ms: null,
                        display_frequency: behavior.frequency || "until_submit",
                        sample_rate: 100,
                        max_responses: null,
                        show_close_button: displaySettings.show_close_button !== false,
                        show_minimize_button: displaySettings.show_minimize_button === true,
                        timing_mode: behavior.timing || "immediate",
                        scroll_percentage: behavior.scrollPercentage ?? 50,
                        widget_background_color: displaySettings.widget_background_color || "#141a2c",
                        widget_background_opacity: displaySettings.widget_background_opacity ?? 1.0,
                        widget_border_radius: displaySettings.widget_border_radius || "8px",
                        text_color: displaySettings.text_color || "#ffffff",
                        question_text_size: displaySettings.question_text_size || "1em",
                        answer_font_size: displaySettings.answer_font_size || "0.875em",
                        button_background_color: displaySettings.button_background_color || "#2a44b7",
                    } as any)
                    .execute();

                return { survey };
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.status(400).send({ error: "Invalid request data", details: error.errors });
                }
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // Helper: verify survey belongs to tenant, return 404 if not
    async function ensureSurveyOwnership(surveyId: string, tenantId: string) {
        const row = await db
            .selectFrom("surveys")
            .leftJoin("sites", "surveys.site_id", "sites.id")
            .select("surveys.id")
            .where("surveys.id", "=", surveyId)
            .where("sites.tenant_id", "=", tenantId)
            .executeTakeFirst();
        return row ?? null;
    }

    // GET /api/surveys/:id/responses/summary — aggregate by question for bar chart + top answer
    fastify.get<{ Params: { id: string }; Querystring: { question_id?: string } }>(
        "/:id/responses/summary",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as { tenant_id: string };
                const { id: surveyId } = request.params;
                const { question_id: questionIdParam } = request.query;

                const ownership = await ensureSurveyOwnership(surveyId, tenant_id);
                if (!ownership) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                const questions = await db
                    .selectFrom("questions")
                    .select(["id", "order_index"])
                    .where("survey_id", "=", surveyId)
                    .orderBy("order_index", "asc")
                    .execute();

                let questionId = questionIdParam ?? questions[0]?.id;
                if (!questionId && questions.length > 0) {
                    questionId = questions[0].id;
                }
                if (!questionId) {
                    return reply.send({
                        totalResponses: 0,
                        totalAnswers: 0,
                        topAnswer: null,
                        bars: [],
                        twoWordPhrases: [],
                    });
                }

                const questionRow = await db
                    .selectFrom("questions")
                    .select(["question_type"])
                    .where("id", "=", questionId)
                    .executeTakeFirst();
                const isTextQuestion = questionRow?.question_type === "text";

                const answers = await db
                    .selectFrom("responses")
                    .leftJoin("answer_options", "responses.answer_option_id", "answer_options.id")
                    .select([
                        "responses.id",
                        "responses.answer_option_id",
                        "responses.answer_text",
                        "answer_options.option_text as option_text",
                    ])
                    .where("responses.survey_id", "=", surveyId)
                    .where("responses.question_id", "=", questionId)
                    .execute();

                const totalAnswers = answers.length;
                let bars: { label: string; count: number; percentage: number }[] = [];
                let topAnswer: { label: string; percentage: number; count: number } | null = null;
                let twoWordPhrases: { phrase: string; answerCount: number }[] = [];

                if (isTextQuestion) {
                    const textOnly = answers
                        .filter(
                            (a) => a.answer_option_id == null && a.answer_text != null && a.answer_text.trim() !== ""
                        )
                        .map((a) => (a.answer_text ?? "").trim());
                    twoWordPhrases = getTwoWordPhrases(textOnly);
                } else {
                    const labelCounts = new Map<string, number>();
                    for (const a of answers) {
                        const label =
                            a.answer_option_id && a.option_text != null
                                ? a.option_text
                                : a.answer_text ?? "(No answer)";
                        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
                    }
                    bars = Array.from(labelCounts.entries())
                        .map(([label, count]) => ({
                            label,
                            count,
                            percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
                        }))
                        .sort((a, b) => b.count - a.count);
                    const topBar = bars[0] ?? null;
                    topAnswer = topBar
                        ? { label: topBar.label, percentage: topBar.percentage, count: topBar.count }
                        : null;
                }

                const totalResponsesResult = await db
                    .selectFrom("responses")
                    .select(db.fn.countAll().as("count"))
                    .where("survey_id", "=", surveyId)
                    .executeTakeFirst();
                const totalResponses = Number((totalResponsesResult as any)?.count ?? 0);

                const stats = await db
                    .selectFrom("survey_stats")
                    .select([
                        "total_impressions",
                        "total_responses",
                        "total_dismissals",
                        "total_closes",
                        "total_minimizes",
                    ])
                    .where("survey_id", "=", surveyId)
                    .executeTakeFirst();

                const impressions = Number(stats?.total_impressions ?? 0);
                const answerEvents = Number(stats?.total_responses ?? 0);
                const dismissals = Number(stats?.total_dismissals ?? 0);
                const closeCount = Number(stats?.total_closes ?? 0);
                const minimizeCount = Number(stats?.total_minimizes ?? 0);
                const autoCloseCount = 0; // no longer tracked separately
                const interactions = impressions + answerEvents + dismissals;

                return reply.send({
                    totalResponses,
                    totalAnswers,
                    topAnswer,
                    bars,
                    twoWordPhrases: isTextQuestion ? twoWordPhrases : [],
                    metrics: {
                        interactions,
                        impressions,
                        responses: answerEvents,
                        dismissals,
                        closeCount: Number(closeCount),
                        minimizeCount: Number(minimizeCount),
                        autoCloseCount: Number(autoCloseCount),
                    },
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // GET /api/surveys/:id/responses — paginated list with display_label (metadata from responses table)
    fastify.get<{
        Params: { id: string };
        Querystring: { question_id?: string; page?: string; limit?: string; session_id?: string };
    }>(
        "/:id/responses",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as { tenant_id: string };
                const { id: surveyId } = request.params;
                const { question_id: questionId, page: pageStr, limit: limitStr, session_id: sessionId } = request.query;

                const ownership = await ensureSurveyOwnership(surveyId, tenant_id);
                if (!ownership) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                const page = Math.max(1, parseInt(pageStr || "1", 10));
                const limit = Math.min(100, Math.max(1, parseInt(limitStr || "25", 10)));
                const offset = (page - 1) * limit;

                let baseQuery = db
                    .selectFrom("responses")
                    .where("responses.survey_id", "=", surveyId)
                    .$if(!!questionId, (q) => q.where("responses.question_id", "=", questionId!))
                    .$if(!!sessionId, (q) => q.where("responses.session_id", "=", sessionId));

                const totalCount = await baseQuery.select(db.fn.countAll().as("count")).executeTakeFirst();
                const totalNum = Number((totalCount as any)?.count ?? 0);

                const responsesPage = await baseQuery
                    .select([
                        "responses.id",
                        "responses.question_id",
                        "responses.answer_option_id",
                        "responses.answer_text",
                        "responses.page_url",
                        "responses.timestamp",
                        "responses.browser",
                        "responses.os",
                        "responses.device",
                        "responses.ip",
                        "responses.country",
                        "responses.state",
                        "responses.state_name",
                        "responses.city",
                        "responses.session_id",
                    ])
                    .orderBy("responses.timestamp", "desc")
                    .limit(limit)
                    .offset(offset)
                    .execute();

                const optionIds = [
                    ...new Set(responsesPage.map((r) => r.answer_option_id).filter(Boolean)),
                ] as string[];
                const optionsMap = new Map<string, string>();
                if (optionIds.length > 0) {
                    const opts = await db
                        .selectFrom("answer_options")
                        .select(["id", "option_text"])
                        .where("id", "in", optionIds)
                        .execute();
                    for (const o of opts) optionsMap.set(o.id, o.option_text);
                }

                const responsesWithLabel = responsesPage.map((r) => {
                    let displayLabel = "(No answer)";
                    if (r.answer_option_id) {
                        const optionText = optionsMap.get(r.answer_option_id);
                        if (optionText && r.answer_text) {
                            displayLabel = `${optionText}: ${r.answer_text}`;
                        } else if (optionText) {
                            displayLabel = optionText;
                        } else if (r.answer_text) {
                            displayLabel = r.answer_text;
                        }
                    } else if (r.answer_text) {
                        displayLabel = r.answer_text;
                    }

                    return {
                        id: r.id,
                        question_id: r.question_id,
                        answer_option_id: r.answer_option_id,
                        answer_text: r.answer_text,
                        display_label: displayLabel,
                        page_url: r.page_url,
                        timestamp: r.timestamp,
                        browser: r.browser ?? null,
                        os: r.os ?? null,
                        device: r.device ?? null,
                        ip: r.ip ?? null,
                        country: r.country ?? null,
                        state: r.state ?? null,
                        state_name: r.state_name ?? null,
                        city: r.city ?? null,
                        session_id: r.session_id ?? null,
                    };
                });

                return reply.send({
                    responses: responsesWithLabel,
                    total: totalNum,
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // DELETE /api/surveys/:id/responses — bulk delete by answer ids
    fastify.delete<{ Params: { id: string }; Body: { answer_ids: number[] } }>(
        "/:id/responses",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as { tenant_id: string };
                const { id: surveyId } = request.params;
                const body = request.body as { answer_ids?: number[] };
                const answerIds = Array.isArray(body?.answer_ids) ? body.answer_ids : [];

                if (answerIds.length === 0) {
                    return reply.status(400).send({ error: "answer_ids array required" });
                }

                const ownership = await ensureSurveyOwnership(surveyId, tenant_id);
                if (!ownership) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                const deleted = await db
                    .deleteFrom("responses")
                    .where("survey_id", "=", surveyId)
                    .where("id", "in", answerIds)
                    .executeTakeFirst();

                const deletedCount = Number((deleted as any)?.numDeletedRows ?? 0);
                return reply.send({ deleted: deletedCount });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // Copy/duplicate survey - MUST come before GET /:id to avoid route conflict
    fastify.post(
        "/:id/copy",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id, id: user_id } = request.user as any;
                const { id } = request.params as { id: string };

                // Get the original survey with all its data
                const originalSurvey = await db
                    .selectFrom("surveys")
                    .leftJoin("sites", "surveys.site_id", "sites.id")
                    .selectAll("surveys")
                    .where("surveys.id", "=", id)
                    .where("sites.tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!originalSurvey) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                // Get questions with options
                const questions = await db
                    .selectFrom("questions")
                    .selectAll()
                    .where("survey_id", "=", id)
                    .orderBy("order_index", "asc")
                    .execute();

                const questionsWithOptions = await Promise.all(
                    questions.map(async (question) => {
                        const options = await db
                            .selectFrom("answer_options")
                            .selectAll()
                            .where("question_id", "=", question.id)
                            .orderBy("order_index", "asc")
                            .execute();
                        return { ...question, options };
                    })
                );

                // Get display settings
                const displaySettings = await db
                    .selectFrom("display_settings")
                    .selectAll()
                    .where("survey_id", "=", id)
                    .executeTakeFirst();

                // Get targeting rules
                const targetingRules = await db
                    .selectFrom("targeting_rules")
                    .selectAll()
                    .where("survey_id", "=", id)
                    .execute();

                // Create new survey with " (Copy)" appended to name
                const newSurvey = await db
                    .insertInto("surveys")
                    .values({
                        site_id: originalSurvey.site_id,
                        name: `${originalSurvey.name} (Copy)`,
                        description: originalSurvey.description,
                        type: originalSurvey.type,
                        active: false, // Start as inactive
                        created_by: user_id,
                        thank_you_message: originalSurvey.thank_you_message,
                    } as any)
                    .returningAll()
                    .executeTakeFirstOrThrow();

                // Copy questions and options
                for (const q of questionsWithOptions) {
                    const newQuestion = await db
                        .insertInto("questions")
                        .values({
                            survey_id: newSurvey.id,
                            question_text: q.question_text,
                            question_type: q.question_type,
                            required: q.required,
                            randomize_options: q.randomize_options,
                            order_index: q.order_index,
                        } as any)
                        .returningAll()
                        .executeTakeFirstOrThrow();

                    // Copy answer options
                    for (const opt of q.options) {
                        await db
                            .insertInto("answer_options")
                            .values({
                                question_id: newQuestion.id,
                                option_text: opt.option_text,
                                requires_comment: opt.requires_comment,
                                pin_to_bottom: opt.pin_to_bottom,
                                order_index: opt.order_index,
                            } as any)
                            .execute();
                    }
                }

                // Copy display settings
                if (displaySettings) {
                    await db
                        .insertInto("display_settings")
                        .values({
                            survey_id: newSurvey.id,
                            position: displaySettings.position,
                            show_delay_ms: displaySettings.show_delay_ms,
                            auto_close_ms: displaySettings.auto_close_ms,
                            display_frequency: displaySettings.display_frequency,
                            sample_rate: displaySettings.sample_rate,
                            max_responses: displaySettings.max_responses,
                            show_close_button: displaySettings.show_close_button,
                            show_minimize_button: displaySettings.show_minimize_button,
                            timing_mode: displaySettings.timing_mode,
                            scroll_percentage: displaySettings.scroll_percentage,
                            widget_background_color: displaySettings.widget_background_color,
                            widget_background_opacity: displaySettings.widget_background_opacity,
                            widget_border_radius: displaySettings.widget_border_radius,
                            text_color: displaySettings.text_color,
                            question_text_size: displaySettings.question_text_size,
                            answer_font_size: displaySettings.answer_font_size,
                            button_background_color: displaySettings.button_background_color,
                        } as any)
                        .execute();
                }

                // Copy targeting rules
                for (const rule of targetingRules) {
                    await db
                        .insertInto("targeting_rules")
                        .values({
                            survey_id: newSurvey.id,
                            rule_type: rule.rule_type,
                            rule_config: rule.rule_config,
                        } as any)
                        .execute();
                }

                return { survey: newSurvey };
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // Get single survey with details
    fastify.get(
        "/:id",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { id } = request.params as { id: string };

                const survey = await db
                    .selectFrom("surveys")
                    .leftJoin("sites", "surveys.site_id", "sites.id")
                    .selectAll("surveys")
                    .select("sites.name as site_name")
                    .where("surveys.id", "=", id)
                    .where("sites.tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!survey) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                // Get questions (with randomize_options)
                const questions = await db
                    .selectFrom("questions")
                    .selectAll()
                    .where("survey_id", "=", id)
                    .orderBy("order_index", "asc")
                    .execute();

                // Get answer options for each question (with requires_comment, pin_to_bottom)
                const questionsWithOptions = await Promise.all(
                    questions.map(async (question) => {
                        const options = await db
                            .selectFrom("answer_options")
                            .selectAll()
                            .where("question_id", "=", question.id)
                            .orderBy("order_index", "asc")
                            .execute();

                        return { ...question, options };
                    })
                );

                // Get display settings
                const displaySettings = await db
                    .selectFrom("display_settings")
                    .selectAll()
                    .where("survey_id", "=", id)
                    .executeTakeFirst();

                // Get targeting rules
                const targetingRules = await db
                    .selectFrom("targeting_rules")
                    .selectAll()
                    .where("survey_id", "=", id)
                    .execute();

                return {
                    survey: {
                        ...survey,
                        questions: questionsWithOptions,
                        displaySettings,
                        targetingRules,
                    },
                };
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );

    // Update survey with all data
    fastify.put(
        "/:id",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { id } = request.params as { id: string };
                const data = request.body as any;

                // Verify ownership
                const existing = await db
                    .selectFrom("surveys")
                    .leftJoin("sites", "surveys.site_id", "sites.id")
                    .select("surveys.id")
                    .where("surveys.id", "=", id)
                    .where("sites.tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!existing) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                // Update survey basic info
                const updateData: any = { updated_at: new Date() };
                if (data.name !== undefined) updateData.name = data.name;
                if (data.description !== undefined) updateData.description = data.description;
                if (data.active !== undefined) updateData.active = data.active;
                if (data.thank_you_message !== undefined) updateData.thank_you_message = data.thank_you_message || null;

                await db.updateTable("surveys").set(updateData).where("id", "=", id).execute();

                // Update questions if provided - PRESERVE EXISTING DATA
                if (data.questions && Array.isArray(data.questions)) {
                    // Get existing questions to preserve IDs
                    const existingQuestions = await db
                        .selectFrom("questions")
                        .selectAll()
                        .where("survey_id", "=", id)
                        .orderBy("order_index", "asc")
                        .execute();

                    // Get existing answer options for each question (for comparing when survey has responses)
                    const existingOptionsByQuestionId = new Map<
                        string,
                        { option_text: string; order_index: number }[]
                    >();
                    for (const eq of existingQuestions) {
                        const options = await db
                            .selectFrom("answer_options")
                            .select(["option_text", "order_index"])
                            .where("question_id", "=", eq.id)
                            .orderBy("order_index", "asc")
                            .execute();
                        existingOptionsByQuestionId.set(eq.id, options);
                    }

                    // Track which questions were updated/created
                    const processedQuestionIds = new Set<string>();

                    // Helper: normalize option to text for comparison
                    const optionText = (opt: string | { text?: string } | undefined): string =>
                        opt == null ? "" : typeof opt === "string" ? opt : String(opt?.text ?? "").trim();

                    // Update or insert questions
                    for (let i = 0; i < data.questions.length; i++) {
                        const q = data.questions[i];
                        const questionText = q.text != null ? String(q.text) : "";
                        const questionType = q.type === "radio" || q.type === "text" ? q.type : "text";

                        // Check if question already exists (match by order_index or question_text)
                        const existingQuestion = existingQuestions[i];
                        let questionId: string;
                        let skipOptionInsert = false; // true when existing question has responses and options unchanged

                        if (existingQuestion) {
                            // UPDATE existing question to preserve its ID and answers
                            await db
                                .updateTable("questions")
                                .set({
                                    question_text: questionText,
                                    question_type: questionType,
                                    required: q.required !== undefined ? Boolean(q.required) : true,
                                    randomize_options: q.randomize_options ?? false,
                                    order_index: i,
                                })
                                .where("id", "=", existingQuestion.id)
                                .execute();

                            questionId = existingQuestion.id;
                            processedQuestionIds.add(questionId);

                            // Check if any answers reference this question's options
                            const answerCount = await db
                                .selectFrom("responses")
                                .innerJoin("answer_options", "responses.answer_option_id", "answer_options.id")
                                .select(db.fn.countAll().as("count"))
                                .where("answer_options.question_id", "=", questionId)
                                .executeTakeFirst();

                            const hasResponses = Number((answerCount as any)?.count ?? 0) > 0;

                            if (hasResponses) {
                                // Only block if answer options were actually changed
                                const existingOpts = existingOptionsByQuestionId.get(questionId) ?? [];
                                const incomingOpts =
                                    questionType === "radio" && Array.isArray(q.options)
                                        ? q.options.map((o: any, j: number) => ({
                                              option_text: optionText(o),
                                              order_index: j,
                                          }))
                                        : [];
                                const sameLength = existingOpts.length === incomingOpts.length;
                                const sameTexts =
                                    sameLength &&
                                    existingOpts.every(
                                        (e, j) => e.option_text === (incomingOpts[j]?.option_text ?? "")
                                    );
                                if (!sameTexts) {
                                    return reply.status(400).send({
                                        error: "Cannot modify answer options",
                                        message:
                                            "This survey has already received responses. Answer options cannot be changed once users have submitted answers. You can create a copy of this survey to make changes.",
                                    });
                                }
                                skipOptionInsert = true; // options unchanged, do not re-insert
                            } else {
                                // No responses: safe to replace options
                                await db.deleteFrom("answer_options").where("question_id", "=", questionId).execute();
                            }
                        } else {
                            // INSERT new question
                            const newQuestion = await db
                                .insertInto("questions")
                                .values({
                                    survey_id: id,
                                    question_text: questionText,
                                    question_type: questionType,
                                    required: q.required !== undefined ? Boolean(q.required) : true,
                                    randomize_options: q.randomize_options ?? false,
                                    order_index: i,
                                } as any)
                                .returningAll()
                                .executeTakeFirstOrThrow();

                            questionId = newQuestion.id;
                            processedQuestionIds.add(questionId);
                        }

                        // Save answer options for radio/checkbox questions (skip when existing question has responses and options unchanged)
                        if (
                            !skipOptionInsert &&
                            questionType === "radio" &&
                            Array.isArray(q.options) &&
                            q.options.length > 0
                        ) {
                            for (let j = 0; j < q.options.length; j++) {
                                const opt = q.options[j];
                                const optText = typeof opt === "string" ? opt : opt?.text ?? "";
                                const requiresComment =
                                    typeof opt === "object" && opt ? opt.requires_comment ?? false : false;
                                const pinToBottom = typeof opt === "object" && opt ? opt.pin_to_bottom ?? false : false;
                                if (optText && String(optText).trim()) {
                                    await db
                                        .insertInto("answer_options")
                                        .values({
                                            question_id: questionId,
                                            option_text: String(optText).trim(),
                                            requires_comment: requiresComment,
                                            pin_to_bottom: pinToBottom,
                                            order_index: j,
                                        } as any)
                                        .execute();
                                }
                            }
                        }
                    }

                    // Delete questions that were removed (only if fewer questions now)
                    // This will cascade delete their answer_options, but preserve answers for historical data
                    const removedQuestions = existingQuestions.filter((eq) => !processedQuestionIds.has(eq.id));
                    for (const removedQ of removedQuestions) {
                        await db.deleteFrom("questions").where("id", "=", removedQ.id).execute();
                    }
                }

                // Update targeting rules if provided (page rules + user geo rules)
                if (data.targeting) {
                    await db.deleteFrom("targeting_rules").where("survey_id", "=", id).execute();

                    if (data.targeting.pageType === "specific" && data.targeting.pageRules) {
                        for (const rule of data.targeting.pageRules) {
                            if (rule.value) {
                                await db
                                    .insertInto("targeting_rules")
                                    .values({
                                        survey_id: id,
                                        rule_type: rule.type,
                                        rule_config: JSON.stringify({ value: rule.value }),
                                    })
                                    .execute();
                            }
                        }
                    }
                    if (data.targeting.userType === "specific" && data.targeting.userRules) {
                        for (const r of data.targeting.userRules) {
                            if (r.type === "geo") {
                                await db
                                    .insertInto("targeting_rules")
                                    .values({
                                        survey_id: id,
                                        rule_type: "geo",
                                        rule_config: JSON.stringify({
                                            country: r.country ?? "",
                                            state: r.state ?? "",
                                            city: r.city ?? "",
                                        }),
                                    })
                                    .execute();
                            }
                        }
                    }
                }

                // Update display settings if provided
                if (data.behavior) {
                    const existingDs = await db
                        .selectFrom("display_settings")
                        .select([
                            "show_close_button",
                            "show_minimize_button",
                            "widget_background_color",
                            "widget_background_opacity",
                            "widget_border_radius",
                            "text_color",
                            "question_text_size",
                            "answer_font_size",
                            "button_background_color",
                        ])
                        .where("survey_id", "=", id)
                        .executeTakeFirst();
                    // UPDATE display_settings instead of delete+insert
                    const showDelayMs =
                        data.behavior.timing === "delay"
                            ? Math.max(0, Math.floor(Number(data.behavior.delaySeconds) || 0) * 1000)
                            : 0;
                    const displaySettings = data.displaySettings || {};
                    const dsUpdate: any = {
                        show_delay_ms: showDelayMs,
                        display_frequency: data.behavior.frequency || "until_submit",
                        timing_mode: data.behavior.timing || "immediate",
                        scroll_percentage: data.behavior.scrollPercentage ?? 50,
                    };

                    // Only update appearance fields if provided
                    if (displaySettings.show_close_button !== undefined)
                        dsUpdate.show_close_button = displaySettings.show_close_button;
                    if (displaySettings.show_minimize_button !== undefined)
                        dsUpdate.show_minimize_button = displaySettings.show_minimize_button;
                    if (displaySettings.widget_background_color !== undefined)
                        dsUpdate.widget_background_color = displaySettings.widget_background_color;
                    if (displaySettings.widget_background_opacity !== undefined)
                        dsUpdate.widget_background_opacity = displaySettings.widget_background_opacity;
                    if (displaySettings.widget_border_radius !== undefined)
                        dsUpdate.widget_border_radius = displaySettings.widget_border_radius;
                    if (displaySettings.text_color !== undefined) dsUpdate.text_color = displaySettings.text_color;
                    if (displaySettings.question_text_size !== undefined)
                        dsUpdate.question_text_size = displaySettings.question_text_size;
                    if (displaySettings.answer_font_size !== undefined)
                        dsUpdate.answer_font_size = displaySettings.answer_font_size;
                    if (displaySettings.button_background_color !== undefined)
                        dsUpdate.button_background_color = displaySettings.button_background_color;

                    await db.updateTable("display_settings").set(dsUpdate).where("survey_id", "=", id).execute();
                } else if (data.displaySettings) {
                    // Update only appearance fields when behavior is not provided
                    const dsUpdate: any = {};
                    if (data.displaySettings.show_close_button !== undefined)
                        dsUpdate.show_close_button = data.displaySettings.show_close_button;
                    if (data.displaySettings.show_minimize_button !== undefined)
                        dsUpdate.show_minimize_button = data.displaySettings.show_minimize_button;
                    if (data.displaySettings.widget_background_color !== undefined)
                        dsUpdate.widget_background_color = data.displaySettings.widget_background_color;
                    if (data.displaySettings.widget_background_opacity !== undefined)
                        dsUpdate.widget_background_opacity = data.displaySettings.widget_background_opacity;
                    if (data.displaySettings.widget_border_radius !== undefined)
                        dsUpdate.widget_border_radius = data.displaySettings.widget_border_radius;
                    if (data.displaySettings.text_color !== undefined)
                        dsUpdate.text_color = data.displaySettings.text_color;
                    if (data.displaySettings.question_text_size !== undefined)
                        dsUpdate.question_text_size = data.displaySettings.question_text_size;
                    if (data.displaySettings.answer_font_size !== undefined)
                        dsUpdate.answer_font_size = data.displaySettings.answer_font_size;
                    if (data.displaySettings.button_background_color !== undefined)
                        dsUpdate.button_background_color = data.displaySettings.button_background_color;
                    if (Object.keys(dsUpdate).length > 0) {
                        await db.updateTable("display_settings").set(dsUpdate).where("survey_id", "=", id).execute();
                    }
                }

                const updated = await db
                    .selectFrom("surveys")
                    .selectAll()
                    .where("id", "=", id)
                    .executeTakeFirstOrThrow();
                return { survey: updated };
            } catch (error) {
                fastify.log.error(error);
                const message = error instanceof Error ? error.message : undefined;
                return reply.status(500).send({
                    error: "Internal server error",
                    ...(message && { message }),
                });
            }
        }
    );

    // Delete survey
    fastify.delete(
        "/:id",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { id } = request.params as { id: string };

                // Verify ownership
                const existing = await db
                    .selectFrom("surveys")
                    .leftJoin("sites", "surveys.site_id", "sites.id")
                    .select("surveys.id")
                    .where("surveys.id", "=", id)
                    .where("sites.tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!existing) {
                    return reply.status(404).send({ error: "Survey not found" });
                }

                // Clean up pending events from Redis queue FIRST
                // This prevents the worker from trying to process events for a deleted survey
                try {
                    const removedJobs = await cleanupSurveyEvents(id);
                    if (removedJobs > 0) {
                        fastify.log.info(`Removed ${removedJobs} pending queue jobs for survey ${id}`);
                    }
                } catch (queueErr) {
                    // Log but don't fail - the worker will handle orphaned events gracefully
                    fastify.log.warn(`Failed to clean queue for survey ${id}:`, queueErr);
                }

                // Delete related data (responses, survey_stats, event_dedup have FK or reference survey_id)
                await db.deleteFrom("responses").where("survey_id", "=", id).execute();
                await db.deleteFrom("survey_stats").where("survey_id", "=", id).execute();
                await db.deleteFrom("event_dedup").where("survey_id", "=", id).execute();

                // Get question IDs to delete answer_options
                const questions = await db.selectFrom("questions").select("id").where("survey_id", "=", id).execute();

                const questionIds = questions.map((q) => q.id);
                if (questionIds.length > 0) {
                    await db.deleteFrom("answer_options").where("question_id", "in", questionIds).execute();
                }

                // Delete questions, display settings, targeting rules, then survey
                await db.deleteFrom("questions").where("survey_id", "=", id).execute();
                await db.deleteFrom("display_settings").where("survey_id", "=", id).execute();
                await db.deleteFrom("targeting_rules").where("survey_id", "=", id).execute();
                await db.deleteFrom("surveys").where("id", "=", id).execute();

                return { success: true };
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: "Internal server error" });
            }
        }
    );
}
