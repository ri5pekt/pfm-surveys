import { FastifyInstance } from "fastify";
import { db } from "../db/connection";
import { sql } from "kysely";

/**
 * Autocomplete endpoints for geo location fields
 * Uses the responses table to provide suggestions based on actual data
 */
export default async function autocompleteRoutes(fastify: FastifyInstance) {
    // Autocomplete countries
    fastify.get("/api/autocomplete/countries", {
        onRequest: [fastify.authenticate],
        schema: {
            querystring: {
                type: "object",
                properties: {
                    q: { type: "string" },
                },
            },
        },
    }, async (request, reply) => {
        const { q } = request.query as { q?: string };
        const query = (q || "").trim().toUpperCase();

        let dbQuery = db
            .selectFrom("responses")
            .select([
                "country",
                sql<number>`COUNT(DISTINCT anonymous_user_id)`.as("count"),
            ])
            .where("country", "is not", null)
            .where("country", "!=", "")
            .groupBy("country")
            .orderBy("count", "desc")
            .limit(20);

        // Filter by query if provided (after 1 character)
        if (query.length >= 1) {
            dbQuery = dbQuery.where("country", "like", `${query}%`);
        }

        const results = await dbQuery.execute();

        reply.send({
            suggestions: results.map((r) => ({
                value: r.country,
                label: r.country,
                count: Number(r.count),
            })),
        });
    });

    // Autocomplete states
    fastify.get("/api/autocomplete/states", {
        onRequest: [fastify.authenticate],
        schema: {
            querystring: {
                type: "object",
                properties: {
                    country: { type: "string" },
                    q: { type: "string" },
                },
            },
        },
    }, async (request, reply) => {
        const { country, q } = request.query as { country?: string; q?: string };
        const query = (q || "").trim().toUpperCase();
        const countryCode = (country || "").trim().toUpperCase();

        let dbQuery = db
            .selectFrom("responses")
            .select([
                "state",
                "state_name",
                sql<number>`COUNT(DISTINCT anonymous_user_id)`.as("count"),
            ])
            .where("state", "is not", null)
            .where("state", "!=", "")
            .groupBy(["state", "state_name"])
            .orderBy("count", "desc")
            .limit(50);

        // Filter by country if provided
        if (countryCode) {
            dbQuery = dbQuery.where("country", "=", countryCode);
        }

        // Filter by query if provided
        if (query.length >= 1) {
            dbQuery = dbQuery.where((eb) =>
                eb.or([
                    eb("state", "like", `${query}%`),
                    eb("state_name", "like", `${query}%`),
                ])
            );
        }

        const results = await dbQuery.execute();

        reply.send({
            suggestions: results.map((r) => ({
                value: r.state,
                label: r.state_name ? `${r.state} - ${r.state_name}` : r.state,
                count: Number(r.count),
            })),
        });
    });

    // Autocomplete cities
    fastify.get("/api/autocomplete/cities", {
        onRequest: [fastify.authenticate],
        schema: {
            querystring: {
                type: "object",
                properties: {
                    country: { type: "string" },
                    state: { type: "string" },
                    q: { type: "string" },
                },
            },
        },
    }, async (request, reply) => {
        const { country, state, q } = request.query as {
            country?: string;
            state?: string;
            q?: string;
        };
        const query = (q || "").trim();
        const countryCode = (country || "").trim().toUpperCase();
        const stateCode = (state || "").trim().toUpperCase();

        let dbQuery = db
            .selectFrom("responses")
            .select([
                "city",
                sql<number>`COUNT(DISTINCT anonymous_user_id)`.as("count"),
            ])
            .where("city", "is not", null)
            .where("city", "!=", "")
            .groupBy("city")
            .orderBy("count", "desc")
            .limit(50);

        // Filter by country if provided
        if (countryCode) {
            dbQuery = dbQuery.where("country", "=", countryCode);
        }

        // Filter by state if provided
        if (stateCode) {
            dbQuery = dbQuery.where("state", "=", stateCode);
        }

        // Filter by query if provided (case-insensitive)
        if (query.length >= 1) {
            dbQuery = dbQuery.where(sql`LOWER(city)`, "like", `${query.toLowerCase()}%`);
        }

        const results = await dbQuery.execute();

        reply.send({
            suggestions: results.map((r) => ({
                value: r.city,
                label: r.city,
                count: Number(r.count),
            })),
        });
    });

    // Autocomplete page URLs
    fastify.get("/api/autocomplete/pages", {
        onRequest: [fastify.authenticate],
        schema: {
            querystring: {
                type: "object",
                properties: {
                    q: { type: "string" },
                },
            },
        },
    }, async (request, reply) => {
        const { q } = request.query as { q?: string };
        const query = (q || "").trim();

        let dbQuery = db
            .selectFrom("responses")
            .select([
                "page_url",
                sql<number>`COUNT(DISTINCT anonymous_user_id)`.as("count"),
            ])
            .where("page_url", "is not", null)
            .where("page_url", "!=", "")
            .groupBy("page_url")
            .orderBy("count", "desc")
            .limit(50);

        // Filter by query if provided (case-insensitive)
        if (query.length >= 1) {
            dbQuery = dbQuery.where(sql`LOWER(page_url)`, "like", `%${query.toLowerCase()}%`);
        }

        const results = await dbQuery.execute();

        reply.send({
            suggestions: results.map((r) => ({
                value: r.page_url,
                label: r.page_url,
                count: Number(r.count),
            })),
        });
    });
}
