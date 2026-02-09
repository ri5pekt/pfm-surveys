-- Add appearance settings to display_settings table
ALTER TABLE display_settings
ADD COLUMN IF NOT EXISTS widget_background_color VARCHAR(7) DEFAULT '#141a2c',
ADD COLUMN IF NOT EXISTS widget_background_opacity DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS widget_border_radius VARCHAR(10) DEFAULT '8px',
ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS question_text_size VARCHAR(10) DEFAULT '1em',
ADD COLUMN IF NOT EXISTS answer_font_size VARCHAR(10) DEFAULT '0.875em',
ADD COLUMN IF NOT EXISTS button_background_color VARCHAR(7) DEFAULT '#2a44b7';
