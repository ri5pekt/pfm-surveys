import { pool } from "../src/db/connection.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    console.log("Running appearance settings migration...");

    try {
        const migration = readFileSync(join(__dirname, "../src/db/migrations/add_appearance_settings.sql"), "utf-8");
        await pool.query(migration);
        console.log("✓ Appearance settings migration completed successfully");

        process.exit(0);
    } catch (error) {
        console.error("✗ Failed to run migration:", error);
        process.exit(1);
    }
}

runMigration();
