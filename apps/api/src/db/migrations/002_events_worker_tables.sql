-- Migration: Events worker tables and answers.answer_index
-- Plan: events_worker_bullmq_50eabd4e
-- 1) processed_events (rollup idempotency)
-- 2) daily_unique_users (unique user counts per site/survey/date)
-- 3) worker_activity_logs (admin visibility, per-job logs)
-- 4) answers.answer_index + UNIQUE(event_id, answer_index)

-- ---------------------------------------------------------------------------
-- processed_events: which events have been applied to rollups (idempotency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_events (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE
);

-- Rollup worker queries events by site_id and id; composite index for watermark reads
CREATE INDEX IF NOT EXISTS idx_events_site_id_id ON events(site_id, id);

-- ---------------------------------------------------------------------------
-- daily_unique_users: distinct (site, survey, date, anonymous_user_id)
-- Rollup worker inserts here; unique_users in rollups_daily derived from this.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_unique_users (
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  anonymous_user_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (site_id, survey_id, date, anonymous_user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_unique_users_site_survey_date ON daily_unique_users(site_id, survey_id, date);

-- ---------------------------------------------------------------------------
-- worker_activity_logs: one row per BullMQ job (started / success / failed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  env TEXT,
  service TEXT NOT NULL,
  worker_id TEXT,
  job_name TEXT NOT NULL,
  job_id TEXT,
  queue TEXT,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL,
  from_event_id BIGINT,
  to_event_id BIGINT,
  items_in INTEGER,
  items_out INTEGER,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  attempt INTEGER,
  error_code TEXT,
  error_message TEXT,
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_worker_activity_logs_created_at ON worker_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_activity_logs_service_created_at ON worker_activity_logs(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_activity_logs_site_id_created_at ON worker_activity_logs(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_activity_logs_status_created_at ON worker_activity_logs(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- answers: add answer_index (0-based) + UNIQUE(event_id, answer_index)
-- Existing rows get answer_index = 0.
-- ---------------------------------------------------------------------------
ALTER TABLE answers ADD COLUMN IF NOT EXISTS answer_index INTEGER;

UPDATE answers SET answer_index = 0 WHERE answer_index IS NULL;

-- Set NOT NULL and default (safe to run again; PostgreSQL no-ops if already set)
ALTER TABLE answers ALTER COLUMN answer_index SET NOT NULL;
ALTER TABLE answers ALTER COLUMN answer_index SET DEFAULT 0;

-- Unique constraint for idempotent answer inserts (one row per event_id + answer_index)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'answers_event_id_answer_index_unique'
  ) THEN
    ALTER TABLE answers ADD CONSTRAINT answers_event_id_answer_index_unique UNIQUE (event_id, answer_index);
  END IF;
END $$;
