CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id uuid PRIMARY KEY,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  comments text,
  respondent_details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id bigserial PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES questionnaire_submissions(id) ON DELETE CASCADE,
  system_category text NOT NULL,
  asset_name text NOT NULL,
  section_code text NOT NULL,
  section_heading text NOT NULL,
  asset_system text NOT NULL,
  question_number text NOT NULL,
  question_stressor text NOT NULL,
  full_question_text text NOT NULL,
  unit text,
  selected_response text NOT NULL
);

CREATE INDEX IF NOT EXISTS questionnaire_responses_submission_idx
  ON questionnaire_responses(submission_id);
