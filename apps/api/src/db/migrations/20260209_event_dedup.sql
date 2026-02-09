-- Idempotency: prevent double-counting when ingestion jobs retry (race-safe via INSERT ... ON CONFLICT DO NOTHING RETURNING)
CREATE TABLE IF NOT EXISTS event_dedup (
  event_uid VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  survey_id UUID NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_dedup_processed_at ON event_dedup(processed_at);
