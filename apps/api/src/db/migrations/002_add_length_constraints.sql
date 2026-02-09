-- Migration: Add length constraints to text fields
-- Defense-in-depth: Database-level validation to complement application-level checks

-- Surveys
ALTER TABLE surveys
ADD CONSTRAINT survey_name_length 
  CHECK (char_length(name) <= 255);

ALTER TABLE surveys
ADD CONSTRAINT survey_description_length 
  CHECK (char_length(description) <= 10000);

ALTER TABLE surveys
ADD CONSTRAINT survey_thank_you_length 
  CHECK (char_length(thank_you_message) <= 5000);

-- Questions
ALTER TABLE questions
ADD CONSTRAINT question_text_length 
  CHECK (char_length(question_text) <= 2000);

ALTER TABLE questions
ADD CONSTRAINT question_image_url_length 
  CHECK (char_length(image_url) <= 2048);

-- Answer Options
ALTER TABLE answer_options
ADD CONSTRAINT option_text_length 
  CHECK (char_length(option_text) <= 1000);

-- Answers (user responses)
ALTER TABLE answers
ADD CONSTRAINT answer_text_length 
  CHECK (char_length(answer_text) <= 10000);

-- Sites
ALTER TABLE sites
ADD CONSTRAINT site_name_length 
  CHECK (char_length(name) <= 255);

-- Users
ALTER TABLE users
ADD CONSTRAINT user_email_length 
  CHECK (char_length(email) <= 255);

ALTER TABLE users
ADD CONSTRAINT user_first_name_length 
  CHECK (char_length(first_name) <= 100);

ALTER TABLE users
ADD CONSTRAINT user_last_name_length 
  CHECK (char_length(last_name) <= 100);

-- Tenants
ALTER TABLE tenants
ADD CONSTRAINT tenant_name_length 
  CHECK (char_length(name) <= 255);
