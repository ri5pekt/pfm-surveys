-- Migration: Add show_close_button and show_minimize_button to display_settings
-- For survey widget: optional close/minimize buttons (Hotjar-style)

ALTER TABLE display_settings ADD COLUMN IF NOT EXISTS show_close_button BOOLEAN DEFAULT true;
ALTER TABLE display_settings ADD COLUMN IF NOT EXISTS show_minimize_button BOOLEAN DEFAULT false;
