-- Per survey: on a phone, open expanded at half the screen with a scroll cue.
ALTER TABLE display_settings
  ADD COLUMN IF NOT EXISTS mobile_half_sheet BOOLEAN NOT NULL DEFAULT FALSE;
