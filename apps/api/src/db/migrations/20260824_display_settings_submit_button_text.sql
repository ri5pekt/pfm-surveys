-- Optional submit button label. Empty/null → embed falls back to "Submit".

ALTER TABLE display_settings
  ADD COLUMN IF NOT EXISTS submit_button_text VARCHAR(64) NULL;
