import { pool } from '../src/db/connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
  console.log('Initializing database schema...');
  
  try {
    const schema = readFileSync(join(__dirname, '../src/db/schema.sql'), 'utf-8');
    await pool.query(schema);
    console.log('✓ Database schema initialized successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to initialize database:', error);
    process.exit(1);
  }
}

initDatabase();
