import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Imported first so the database pool sees these values. ESM evaluates
// imports before the rest of index.ts, so dotenv has to live in its own module.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
