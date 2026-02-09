-- Real-time counters per survey (no events table; worker updates this directly)
CREATE TABLE IF NOT EXISTS survey_stats (
  survey_id UUID PRIMARY KEY REFERENCES surveys(id) ON DELETE CASCADE,
  total_impressions BIGINT NOT NULL DEFAULT 0,
  total_responses BIGINT NOT NULL DEFAULT 0,
  total_dismissals BIGINT NOT NULL DEFAULT 0,
  total_closes BIGINT NOT NULL DEFAULT 0,
  total_minimizes BIGINT NOT NULL DEFAULT 0,
  total_interacts BIGINT NOT NULL DEFAULT 0,
  first_impression_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_survey_stats_survey_id ON survey_stats(survey_id);
