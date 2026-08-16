-- Custom event trigger: survey shows when the host calls window.PFMSurveys.trigger(name)

ALTER TABLE display_settings
  ADD COLUMN IF NOT EXISTS custom_event_name VARCHAR(64) NULL;
