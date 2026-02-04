import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './types';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'surveys_dev',
  user: process.env.DATABASE_USER || 'surveys_user',
  password: process.env.DATABASE_PASSWORD || 'change_this_password',
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
});

const dialect = new PostgresDialect({ pool });

export const db = new Kysely<Database>({ dialect });

export const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export { pool };
