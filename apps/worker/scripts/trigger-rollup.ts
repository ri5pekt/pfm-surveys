/**
 * Add one rollup_tick job to the queue. The running worker will process it
 * and enqueue rollup_site jobs, then populate rollups_daily.
 * Usage: npx tsx scripts/trigger-rollup.ts (from apps/worker or monorepo root)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { addRollupTickJob } from '../src/rollup/queue';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

addRollupTickJob(connection)
  .then(() => {
    console.log('Rollup tick job added. Worker will process it shortly.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to add rollup tick job:', err);
    process.exit(1);
  });
