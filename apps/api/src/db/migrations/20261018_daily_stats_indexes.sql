-- Speed up the daily breakdown aggregation. Idempotent.
CREATE INDEX IF NOT EXISTS idx_event_dedup_survey_type_processed
  ON event_dedup (survey_id, event_type, processed_at);

CREATE INDEX IF NOT EXISTS idx_responses_survey_question_timestamp
  ON responses (survey_id, question_id, timestamp);
