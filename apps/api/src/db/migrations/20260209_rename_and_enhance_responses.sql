-- Long-term data strategy: rename answers -> responses, remove event_id, add metadata columns
-- Run BEFORE dropping events table (responses must not reference events).

-- Rename table for clarity
ALTER TABLE answers RENAME TO responses;

-- Rename sequence
ALTER SEQUENCE answers_id_seq RENAME TO responses_id_seq;

-- Remove FK and unique constraint that reference event_id, then drop column
ALTER TABLE responses DROP CONSTRAINT IF EXISTS answers_event_id_fkey;
ALTER TABLE responses DROP CONSTRAINT IF EXISTS answers_event_id_answer_index_unique;
ALTER TABLE responses DROP COLUMN IF EXISTS event_id;

-- Drop old indexes (will be recreated with new names)
DROP INDEX IF EXISTS idx_answers_question_id;
DROP INDEX IF EXISTS idx_answers_survey_id;

-- Add metadata columns (previously in events.event_data JSONB)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS browser VARCHAR(100);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS os VARCHAR(100);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS device VARCHAR(50);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS ip VARCHAR(45);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS state VARCHAR(10);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS state_name VARCHAR(255);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- Recreate indexes with new table name
CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_country ON responses(country);
CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_anonymous_user_id ON responses(anonymous_user_id);
