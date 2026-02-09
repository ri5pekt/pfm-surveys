/**
 * One-time script: populate survey_stats from existing responses table.
 * Run AFTER migrations (rename answers→responses, create survey_stats).
 * Sets total_responses per survey; other counters remain 0 (events table is dropped).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "../src/db/types.js";

const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.PGUSER || "postgres"}:${process.env.PGPASSWORD || "postgres"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || "5432"}/${process.env.PGDATABASE || "surveys"}`;

const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) }),
});

async function main() {
    console.log("Populating survey_stats from responses...");

    const counts = await db
        .selectFrom("responses")
        .select(["survey_id", db.fn.countAll().as("count")])
        .groupBy("survey_id")
        .execute();

    for (const row of counts) {
        const surveyId = row.survey_id;
        const totalResponses = Number(row.count);
        await db
            .insertInto("survey_stats")
            .values({
                survey_id: surveyId,
                total_responses: totalResponses,
                total_impressions: 0,
                total_dismissals: 0,
                total_closes: 0,
                total_minimizes: 0,
                total_interacts: 0,
                updated_at: new Date(),
            })
            .onConflict((oc) =>
                oc.column("survey_id").doUpdateSet({
                    total_responses: totalResponses,
                    updated_at: new Date(),
                })
            )
            .execute();
        console.log(`  survey ${surveyId.slice(0, 8)}… total_responses=${totalResponses}`);
    }

    // Ensure every survey has a row (even with 0 responses)
    const surveys = await db.selectFrom("surveys").select("id").execute();
    for (const s of surveys) {
        await db
            .insertInto("survey_stats")
            .values({
                survey_id: s.id,
                total_impressions: 0,
                total_responses: 0,
                total_dismissals: 0,
                total_closes: 0,
                total_minimizes: 0,
                total_interacts: 0,
                updated_at: new Date(),
            })
            .onConflict((oc) => oc.column("survey_id").doNothing())
            .execute();
    }

    console.log("Done.");
    await db.destroy();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
