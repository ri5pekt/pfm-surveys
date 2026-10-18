-- Keep the page and device that the embed already sends with each event.
-- Existing rows stay null. Impression counters are unchanged.
ALTER TABLE event_dedup ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE event_dedup ADD COLUMN IF NOT EXISTS device VARCHAR(50);
