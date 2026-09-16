import { ensureSchema, getDatabase } from "@/lib/db";
import { findQuestion, formatStructuredResponse, isQuestionnaireScope, validateStructuredResponse } from "@/lib/submissions";

export const runtime = "nodejs";

const textValue = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const consent = body?.consent;
    const consentedAt = typeof consent?.timestamp === "string" ? consent.timestamp : "";
    const sessionId = typeof consent?.sessionId === "string" ? consent.sessionId : "";
    if (consent?.given !== true || !UUID_PATTERN.test(sessionId) || !consentedAt || Number.isNaN(Date.parse(consentedAt))) {
      return Response.json({ error: "Valid survey consent is required before submission." }, { status: 400 });
    }
    if (!body || !Array.isArray(body.responses) || body.responses.length === 0 || body.responses.length > 200) {
      return Response.json({ error: "A valid set of questionnaire responses is required." }, { status: 400 });
    }

    const seen = new Set<string>();
    const rows = [];
    for (const item of body.responses) {
      if (!item || !isQuestionnaireScope(item.scope) || typeof item.questionNumber !== "string" || typeof item.questionText !== "string") {
        return Response.json({ error: "The response payload contains an unknown questionnaire item." }, { status: 400 });
      }
      const identity = `${item.scope}:${item.questionNumber}:${item.questionText}`;
      if (seen.has(identity)) return Response.json({ error: "The response payload contains a duplicate questionnaire item." }, { status: 400 });
      seen.add(identity);

      const context = findQuestion(item.scope, item.questionNumber, item.questionText);
      if (!context || !validateStructuredResponse(context.question, item.response)) {
        return Response.json({ error: `The answer for question ${item.questionNumber} is incomplete or invalid.` }, { status: 400 });
      }
      rows.push({
        system_category: context.system,
        asset_name: context.asset,
        section_code: context.sectionCode,
        section_heading: context.sectionHeading,
        asset_system: context.assetSystem,
        question_number: context.question.number,
        question_stressor: context.stressor,
        full_question_text: context.question.text,
        unit: context.question.type === "matrix" ? context.question.rows.map((row) => row.unit).filter(Boolean).join("; ") : context.question.unit,
        selected_response: formatStructuredResponse(context.question, item.response),
      });
    }

    const respondent = body.respondent && typeof body.respondent === "object"
      ? Object.fromEntries(Object.entries(body.respondent).slice(0, 20).map(([name, value]) => [textValue(name, 100), textValue(value, 1000)]))
      : {};
    const submissionId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();

    await ensureSchema();
    const sql = getDatabase();
    await sql`
      WITH new_submission AS (
        INSERT INTO questionnaire_submissions (id, submitted_at, session_id, consent_given, consented_at, comments, respondent_details)
        VALUES (${submissionId}, ${submittedAt}::timestamptz, ${sessionId}::uuid, true, ${consentedAt}::timestamptz, ${textValue(body.comments, 5000)}, ${JSON.stringify(respondent)}::jsonb)
        RETURNING id
      )
      INSERT INTO questionnaire_responses (
        submission_id, system_category, asset_name, section_code, section_heading, asset_system, question_number,
        question_stressor, full_question_text, unit, selected_response
      )
      SELECT new_submission.id, response.system_category, response.asset_name, response.section_code, response.section_heading,
        response.asset_system, response.question_number, response.question_stressor,
        response.full_question_text, response.unit, response.selected_response
      FROM new_submission
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS response(
        system_category text, asset_name text, section_code text, section_heading text, asset_system text, question_number text,
        question_stressor text, full_question_text text, unit text, selected_response text
      )
    `;

    return Response.json({ submissionId, timestamp: submittedAt }, { status: 201 });
  } catch (error) {
    console.error("Questionnaire submission failed", error);
    const unavailable = error instanceof Error && error.message.includes("DATABASE_URL");
    return Response.json({ error: unavailable ? "Response storage is not configured." : "The response could not be stored. Please try again." }, { status: unavailable ? 503 : 500 });
  }
}
