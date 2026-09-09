import { neon } from "@neondatabase/serverless";

let schemaPromise: Promise<void> | null = null;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  return neon(connectionString);
}

export function ensureSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const sql = getDatabase();
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_submissions (
        id uuid PRIMARY KEY,
        submitted_at timestamptz NOT NULL DEFAULT now(),
        comments text,
        respondent_details jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id bigserial PRIMARY KEY,
        submission_id uuid NOT NULL REFERENCES questionnaire_submissions(id) ON DELETE CASCADE,
        section_code text NOT NULL,
        section_heading text NOT NULL,
        asset_system text NOT NULL,
        question_number text NOT NULL,
        question_stressor text NOT NULL,
        full_question_text text NOT NULL,
        unit text,
        selected_response text NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS questionnaire_responses_submission_idx ON questionnaire_responses(submission_id)`;
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}
