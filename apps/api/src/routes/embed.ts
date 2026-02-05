import { FastifyPluginAsync } from "fastify";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { db } from "../db/connection";
import { setNonceOnce, getRedis } from "../redis";
import { addEventIngestionJobs } from "../queues/eventIngestion";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BATCH_SIZE = 50; // events per BullMQ job (plan: 20–100)

const EMBED_NOT_FOUND_MESSAGE =
    "Embed script not found. Run: pnpm build:embed (or pnpm --filter embed build). " +
    "Ensure apps/embed/dist/embed.js exists. In Docker, the embed is built and copied automatically.";

// Zod schema for event validation
const EventSchema = z.object({
    event_type: z.string().max(50),
    client_event_id: z.string().max(100),
    timestamp: z.union([z.string(), z.number()]).optional(),
    survey_id: z.string().uuid().optional(),
    anonymous_user_id: z.string().max(100).optional(),
    session_id: z.string().max(100).optional(),
    page_url: z.string().max(2048).optional(),
    event_data: z.any().optional(),
    browser: z.string().max(50).optional(),
    os: z.string().max(50).optional(),
    device: z.string().max(50).optional(),
});

const EventsRequestSchema = z.object({
    site_id: z.string().max(100),
    nonce: z.string().max(100).optional(),
    events: z.array(EventSchema).min(1).max(50), // Max 50 events per batch
});

/**
 * Domain validation utility - checks if request Origin/Referer is allowed
 *
 * Security model:
 * - Empty domains = DENY by default (unless allowAnyDomain flag is true)
 * - Supports wildcard patterns (*.example.com)
 * - Fallback: tries Origin first, then Referer (for privacy-conscious browsers)
 *
 * @param origin - Origin header from request
 * @param referer - Referer header from request
 * @param allowedDomains - Array of allowed domain patterns (supports wildcards)
 * @param allowAnyDomain - Explicit opt-in to skip validation (dev/testing only)
 * @returns true if origin is allowed, false otherwise
 */
function isOriginAllowed(
    origin: string | undefined,
    referer: string | undefined,
    allowedDomains: string[] | null,
    allowAnyDomain: boolean = false
): boolean {
    // Empty domains = DENY by default (unless explicitly allowed for dev/testing)
    if (!allowedDomains || allowedDomains.length === 0) {
        return allowAnyDomain; // Must be explicitly set to true
    }

    // Extract hostname from Origin OR Referer (fallback)
    let hostname: string | null = null;

    if (origin) {
        try {
            hostname = new URL(origin).hostname;
        } catch {
            // Invalid origin URL
        }
    } else if (referer) {
        // Allow missing Origin if Referer exists (some privacy tools block Origin)
        try {
            hostname = new URL(referer).hostname;
        } catch {
            // Invalid referer URL
        }
    }

    if (!hostname) {
        return false; // No origin AND no referer = reject
    }

    // Check against patterns (supports wildcards)
    return allowedDomains.some((pattern) => {
        if (pattern.startsWith("*.")) {
            const base = pattern.slice(2);
            return hostname === base || hostname.endsWith("." + base);
        }
        return hostname === pattern;
    });
}

/**
 * Basic text cleanup - removes control characters and enforces length limits
 *
 * NOT "XSS prevention" - just garbage cleanup. Real XSS prevention happens
 * at display time via Vue's {{ }} text interpolation (auto-escapes HTML).
 *
 * @param input - Input to clean
 * @param maxLength - Maximum allowed length (default 10000)
 * @returns Cleaned text or null if invalid
 */
function cleanText(input: unknown, maxLength: number = 10000): string | null {
    if (typeof input !== "string") return null;

    let text = input.trim();

    // Remove null bytes and control characters (except newlines/tabs)
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

    // Enforce max length
    if (text.length > maxLength) {
        text = text.slice(0, maxLength);
    }

    return text || null;
}

/**
 * URL cleanup - validates and cleans URL strings
 *
 * Does NOT try to "sanitize" URLs with regex - just removes control chars.
 * Legitimate URLs can contain characters that look suspicious.
 *
 * @param input - Input URL to clean
 * @returns Cleaned URL or null if invalid
 */
function cleanUrl(input: unknown): string | null {
    if (typeof input !== "string") return null;

    let url = input.trim();

    // Just remove control chars - don't try to "sanitize" URLs
    url = url.replace(/[\x00-\x1F\x7F]/g, "");

    // Basic length limit (per Zod schema)
    if (url.length > 2048) {
        url = url.slice(0, 2048);
    }

    return url || null;
}

/** Resolve built embed script only (no legacy fallback). Returns null if missing. */
function getEmbedScriptPath(): string | null {
    const fromMonorepoRoot = join(process.cwd(), "apps", "embed", "dist", "embed.js");
    if (existsSync(fromMonorepoRoot)) return fromMonorepoRoot;
    const fromApiDir = join(process.cwd(), "..", "embed", "dist", "embed.js");
    if (existsSync(fromApiDir)) return fromApiDir;
    const fromDist = join(__dirname, "../client/embed.js");
    if (existsSync(fromDist)) return fromDist;
    return null;
}

const embedRoutes: FastifyPluginAsync = async (fastify) => {
    // Serve the built embed script only (stable, no injection). Config from script tag.
    fastify.get("/embed/script.js", async (_request, reply) => {
        const scriptPath = getEmbedScriptPath();
        if (!scriptPath) {
            return reply.code(503).send({
                error: "Embed script not available",
                message: EMBED_NOT_FOUND_MESSAGE,
            });
        }
        const script = readFileSync(scriptPath, "utf-8");

        reply
            .header("Content-Type", "application/javascript")
            .header("Cache-Control", "no-cache, no-store, must-revalidate") // During dev: no caching
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .send(script);
    });

    // Get active surveys for a site
    fastify.get("/api/public/surveys", async (request, reply) => {
        const { site_id } = request.query as { site_id?: string };

        if (!site_id) {
            return reply.code(400).send({ error: "site_id is required" });
        }

        // Get site
        const site = await db
            .selectFrom("sites")
            .select(["id"])
            .where("site_id", "=", site_id)
            .where("active", "=", true)
            .executeTakeFirst();

        if (!site) {
            return reply.code(404).send({ error: "Site not found" });
        }

        // Get active surveys with questions
        const surveys = await db
            .selectFrom("surveys")
            .select(["id", "name", "type", "thank_you_message"])
            .where("site_id", "=", site.id)
            .where("active", "=", true)
            .execute();

        // Get questions and options for each survey
        const surveysWithQuestions = await Promise.all(
            surveys.map(async (survey) => {
                const questions = await db
                    .selectFrom("questions")
                    .select([
                        "id",
                        "question_text",
                        "question_type",
                        "image_url",
                        "required",
                        "randomize_options",
                        "order_index",
                    ])
                    .where("survey_id", "=", survey.id)
                    .orderBy("order_index", "asc")
                    .execute();

                const questionsWithOptions = await Promise.all(
                    questions.map(async (question) => {
                        const options = await db
                            .selectFrom("answer_options")
                            .select(["id", "option_text", "requires_comment", "pin_to_bottom", "order_index"])
                            .where("question_id", "=", question.id)
                            .orderBy("order_index", "asc")
                            .execute();

                        return {
                            ...question,
                            options: options.length > 0 ? options : undefined,
                        };
                    })
                );

                // Get display settings
                const displaySettings = await db
                    .selectFrom("display_settings")
                    .select([
                        "position",
                        "show_delay_ms",
                        "auto_close_ms",
                        "display_frequency",
                        "sample_rate",
                        "show_close_button",
                        "show_minimize_button",
                        "timing_mode",
                        "scroll_percentage",
                        "widget_background_color",
                        "widget_background_opacity",
                        "widget_border_radius",
                        "text_color",
                        "question_text_size",
                        "answer_font_size",
                        "button_background_color",
                    ])
                    .where("survey_id", "=", survey.id)
                    .executeTakeFirst();

                // Get targeting rules
                const targetingRules = await db
                    .selectFrom("targeting_rules")
                    .select(["rule_type", "rule_config"])
                    .where("survey_id", "=", survey.id)
                    .execute();

                const targeting = {
                    pageType: targetingRules.length > 0 ? "specific" : "all",
                    pageRules: targetingRules.map((rule) => ({
                        type: rule.rule_type,
                        value: JSON.parse(rule.rule_config as string).value,
                    })),
                };

                return {
                    ...survey,
                    questions: questionsWithOptions,
                    displaySettings,
                    targeting,
                };
            })
        );

        reply.send({ surveys: surveysWithQuestions });
    });

    // Record events (impression, answer, dismiss) — enqueue to BullMQ, no direct DB write
    fastify.post(
        "/api/public/events",
        {
            bodyLimit: 102400, // 100KB max payload per request
            config: {
                rateLimit: {
                    max: parseInt(process.env.RATE_LIMIT_IP_MAX || "60", 10), // 60 requests per minute per IP
                    timeWindow: "1 minute",
                    keyGenerator: (request) => {
                        const forwarded = request.headers["x-forwarded-for"] as string;
                        const ip = forwarded?.split(",")[0]?.trim() || request.ip;
                        return `ip:${ip || "unknown"}`;
                    },
                    errorResponseBuilder: () => ({
                        error: "Rate limit exceeded",
                        message: "Too many requests. Try again in a minute.",
                    }),
                },
            },
        },
        async (request, reply) => {
            // Validate request body with Zod schema
            let body: z.infer<typeof EventsRequestSchema>;
            try {
                body = EventsRequestSchema.parse(request.body);
            } catch (err) {
                fastify.log.warn({ error: err }, "Invalid request: validation failed");
                return reply.code(400).send({
                    error: "Invalid request",
                    details: err instanceof z.ZodError ? err.errors : undefined,
                });
            }

            const { nonce, site_id, events } = body;

            // Capture client IP server-side (proxy-safe: X-Forwarded-For, X-Real-IP, then request.ip)
            const forwarded = (request.headers["x-forwarded-for"] as string) ?? "";
            const firstForwarded = forwarded.split(",")[0]?.trim();
            const clientIp = firstForwarded || (request.headers["x-real-ip"] as string) || request.ip || null;

            fastify.log.info({ site_id, eventCount: events?.length }, "📥 Events received from embed script");

            if (!site_id || !events || !Array.isArray(events)) {
                fastify.log.warn("Invalid request: missing site_id or events array");
                return reply.code(400).send({ error: "Invalid request" });
            }

            // Get site internal id and domain settings
            const site = await db
                .selectFrom("sites")
                .select(["id", "domains", "allow_any_domain"])
                .where("site_id", "=", site_id)
                .where("active", "=", true)
                .executeTakeFirst();

            if (!site) {
                fastify.log.warn({ site_id }, "Site not found or inactive");
                return reply.code(404).send({ error: "Site not found" });
            }

            // Validate origin/referer (primary anti-abuse defense)
            const origin = request.headers.origin as string | undefined;
            const referer = request.headers.referer as string | undefined;

            if (!isOriginAllowed(origin, referer, site.domains, site.allow_any_domain ?? false)) {
                fastify.log.warn(
                    {
                        site_id,
                        origin,
                        referer,
                        allowed_domains: site.domains,
                        allow_any: site.allow_any_domain,
                    },
                    "Domain not authorized"
                );

                return reply.code(403).send({
                    error: "Domain not authorized",
                    message: "This domain is not allowed to send events for this site",
                });
            }

            // Per-site rate limit (limits REQUESTS per minute, not total events)
            // Note: Each request can contain up to 50 events (batch)
            const redis = getRedis();
            const currentMinute = Math.floor(Date.now() / 60000);
            const siteKey = `rl:site:${site.id}:${currentMinute}`;
            const siteRequestCount = await redis.incr(siteKey);

            if (siteRequestCount === 1) {
                await redis.expire(siteKey, 60); // TTL for current minute
            }

            const SITE_REQUEST_LIMIT = parseInt(process.env.RATE_LIMIT_SITE_MAX || "200", 10);
            if (siteRequestCount > SITE_REQUEST_LIMIT) {
                fastify.log.warn(
                    {
                        site_id,
                        request_count: siteRequestCount,
                        event_count: events.length,
                    },
                    "Site rate limit exceeded"
                );

                // Add rate limit headers
                reply.header("X-RateLimit-Limit", String(SITE_REQUEST_LIMIT));
                reply.header("X-RateLimit-Remaining", "0");

                return reply.code(429).send({
                    error: "Site rate limit exceeded",
                    message: "Too many requests for this site. Try again in a minute.",
                });
            }

            // Add rate limit headers for successful requests
            reply.header("X-RateLimit-Limit", String(SITE_REQUEST_LIMIT));
            reply.header("X-RateLimit-Remaining", String(Math.max(0, SITE_REQUEST_LIMIT - siteRequestCount)));

            // Replay protection: if client sent nonce, it must be first use
            if (nonce) {
                const firstUse = await setNonceOnce(nonce);
                if (!firstUse) {
                    fastify.log.warn({ nonce: nonce.slice(0, 8) + "…" }, "Replay rejected: nonce already used");
                    return reply.code(409).send({ error: "Request already processed (replay)" });
                }
            }

            // Normalize events (event contract: timestamp UTC; ensure required fields; attach server-captured IP)
            // Apply cleanText/cleanUrl to user-controlled fields (defense-in-depth)
            const normalized = events
                .filter((e) => e && typeof e.event_type === "string" && typeof e.client_event_id === "string")
                .map((e) => ({
                    event_type: e.event_type,
                    client_event_id: e.client_event_id,
                    timestamp: e.timestamp ?? Date.now(),
                    survey_id: e.survey_id ?? null,
                    anonymous_user_id: cleanText(e.anonymous_user_id, 100),
                    session_id: cleanText(e.session_id, 100),
                    page_url: cleanUrl(e.page_url), // URL-specific cleanup
                    event_data: e.event_data
                        ? {
                              ...e.event_data,
                              answer_text: cleanText((e.event_data as any).answer_text, 10000),
                          }
                        : undefined,
                    browser: cleanText(e.browser, 50),
                    os: cleanText(e.os, 50),
                    device: cleanText(e.device, 50),
                    ip: typeof clientIp === "string" && clientIp.length > 0 ? clientIp : null,
                }));

            if (normalized.length === 0) {
                return reply.code(400).send({ error: "No valid events" });
            }

            // Enqueue batch jobs to event-ingestion queue (must not lose events)
            let jobCount: number;
            try {
                jobCount = await addEventIngestionJobs(site.id, normalized, BATCH_SIZE);
            } catch (err) {
                fastify.log.error(
                    { err, site_id: site.id, eventCount: normalized.length },
                    "Failed to enqueue events (Redis/queue down)"
                );
                return reply.code(503).send({
                    error: "Event queue unavailable",
                    message: "Events could not be queued. Please retry.",
                });
            }

            fastify.log.info(
                { accepted: normalized.length, jobs: jobCount },
                `✓ Events enqueued: ${normalized.length} events in ${jobCount} job(s)`
            );

            reply.code(202).send({
                success: true,
                accepted: normalized.length,
            });
        }
    );
};

export default embedRoutes;
