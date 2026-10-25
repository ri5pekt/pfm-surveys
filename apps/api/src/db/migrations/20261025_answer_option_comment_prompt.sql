-- Optional prompt and required flag for an answer's comment box.
-- Existing comment boxes stay required. The prompt is empty until set in the editor.

ALTER TABLE answer_options ADD COLUMN IF NOT EXISTS comment_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE answer_options ADD COLUMN IF NOT EXISTS comment_prompt TEXT;

ALTER TABLE answer_options DROP CONSTRAINT IF EXISTS option_comment_prompt_length;
ALTER TABLE answer_options
ADD CONSTRAINT option_comment_prompt_length
  CHECK (comment_prompt IS NULL OR char_length(comment_prompt) <= 200);
