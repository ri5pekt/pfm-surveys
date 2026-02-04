/**
 * Run all pending migrations from src/db/migrations in filename order.
 * Uses same DB connection as init-db; migrations should be idempotent where possible.
 */
import { pool } from '../src/db/connection.js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../src/db/migrations');

async function migrate() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
    return;
  }

  console.log(`Found ${files.length} migration(s): ${files.join(', ')}`);

  for (const file of files) {
    const path = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(path, 'utf-8');
    const name = file.replace('.sql', '');
    try {
      await pool.query(sql);
      console.log(`✓ ${name}`);
    } catch (err) {
      console.error(`✗ ${name} failed:`, err);
      process.exit(1);
    }
  }

  console.log('Migrations complete.');
  process.exit(0);
}

migrate();
