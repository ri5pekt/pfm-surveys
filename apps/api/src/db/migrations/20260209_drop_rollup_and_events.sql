-- Drop rollup infrastructure and events table (run AFTER rename_and_enhance_responses so responses no longer references events)
DROP TABLE IF EXISTS processed_events CASCADE;
DROP TABLE IF EXISTS daily_unique_users CASCADE;
DROP TABLE IF EXISTS rollups_daily CASCADE;
DROP TABLE IF EXISTS rollup_state CASCADE;
DROP TABLE IF EXISTS events CASCADE;
