import type { FastifyInstance } from "fastify";
import { db } from "../db/connection";
import { AuthService } from "../services/auth.service";
import { z } from "zod";

const createSiteSchema = z.object({
    name: z.string().min(1),
    domains: z.array(z.string()).optional(),
    allow_any_domain: z.boolean().optional(),
});

function isConnectionError(err: unknown): boolean {
    const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : null;
    return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT";
}

function sendErrorReply(reply: any, error: unknown): void {
    if (isConnectionError(error)) {
        reply.status(503).send({
            error: "Service temporarily unavailable",
            message: "Database or Redis is unreachable. Start them with: docker compose up -d postgres redis",
        });
    } else {
        reply.status(500).send({ error: "Internal server error" });
    }
}

export default async function sitesRoutes(fastify: FastifyInstance) {
    // Get all sites for current user's tenant
    fastify.get(
        "/",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;

                const sites = await db
                    .selectFrom("sites")
                    .selectAll()
                    .where("tenant_id", "=", tenant_id)
                    .orderBy("created_at", "desc")
                    .execute();

                return { sites };
            } catch (error) {
                fastify.log.error(error);
                return sendErrorReply(reply, error);
            }
        }
    );

    // Create a new site
    fastify.post(
        "/",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const data = createSiteSchema.parse(request.body);

                const siteId = AuthService.generateSiteId();
                const siteSecret = AuthService.generateSiteSecret();

                const site = await db
                    .insertInto("sites")
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
                    return reply.status(400).send({ error: "Invalid request data", details: error.errors });
                }
                fastify.log.error(error);
                return sendErrorReply(reply, error);
            }
        }
    );

    // Get single site
    fastify.get(
        "/:id",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { id } = request.params as { id: string };

                const site = await db
                    .selectFrom("sites")
                    .selectAll()
                    .where("id", "=", id)
                    .where("tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!site) {
                    return reply.status(404).send({ error: "Site not found" });
                }

                return { site };
            } catch (error) {
                fastify.log.error(error);
                return sendErrorReply(reply, error);
            }
        }
    );

    // Update site
    fastify.put(
        "/:id",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { id } = request.params as { id: string };
                const data = createSiteSchema.parse(request.body);

                // Build update object
                const updateData: any = {
                    name: data.name,
                    updated_at: new Date(),
                };

                // Handle domains - ensure it's saved as array
                if (data.domains !== undefined) {
                    updateData.domains = data.domains.length > 0 ? data.domains : null;
                }

                // Handle allow_any_domain flag
                if (data.allow_any_domain !== undefined) {
                    updateData.allow_any_domain = data.allow_any_domain;
                }

                const site = await db
                    .updateTable("sites")
                    .set(updateData)
                    .where("id", "=", id)
                    .where("tenant_id", "=", tenant_id)
                    .returningAll()
                    .executeTakeFirst();

                if (!site) {
                    return reply.status(404).send({ error: "Site not found" });
                }

                fastify.log.info(
                    { site_id: site.id, domains: site.domains, allow_any: site.allow_any_domain },
                    "Site updated"
                );

                return { site };
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.status(400).send({ error: "Invalid request data", details: error.errors });
                }
                fastify.log.error(error);
                return sendErrorReply(reply, error);
            }
        }
    );

    // Delete site
    fastify.delete(
        "/:id",
        {
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as any;
                const { id } = request.params as { id: string };

                // Verify site exists and belongs to tenant
                const site = await db
                    .selectFrom("sites")
                    .select(["id"])
                    .where("id", "=", id)
                    .where("tenant_id", "=", tenant_id)
                    .executeTakeFirst();

                if (!site) {
                    return reply.status(404).send({ error: "Site not found" });
                }

                // Get all surveys for this site
                const surveys = await db
                    .selectFrom("surveys")
                    .select(["id"])
                    .where("site_id", "=", id)
                    .execute();

                const surveyIds = surveys.map((s) => s.id);

                // Cascade delete in order:
                if (surveyIds.length > 0) {
                    // 1. Delete responses for these surveys
                    await db.deleteFrom("responses").where("survey_id", "in", surveyIds).execute();

                    // 2. Delete display settings for these surveys
                    await db
                        .deleteFrom("display_settings")
                        .where("survey_id", "in", surveyIds)
                        .execute();

                    // 3. Delete survey stats for these surveys
                    await db.deleteFrom("survey_stats").where("survey_id", "in", surveyIds).execute();

                    // 4. Delete answer options for questions in these surveys
                    const questions = await db
                        .selectFrom("questions")
                        .select(["id"])
                        .where("survey_id", "in", surveyIds)
                        .execute();

                    const questionIds = questions.map((q) => q.id);

                    if (questionIds.length > 0) {
                        await db
                            .deleteFrom("answer_options")
                            .where("question_id", "in", questionIds)
                            .execute();
                    }

                    // 5. Delete questions
                    await db.deleteFrom("questions").where("survey_id", "in", surveyIds).execute();

                    // 6. Delete surveys
                    await db.deleteFrom("surveys").where("id", "in", surveyIds).execute();
                }

                // 7. Finally, delete the site
                await db.deleteFrom("sites").where("id", "=", id).execute();

                return { success: true };
            } catch (error) {
                fastify.log.error(error);
                return sendErrorReply(reply, error);
            }
        }
    );
}
