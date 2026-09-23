import { timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import { ensureSchema, getDatabase } from "@/lib/db";
import { buildQuestionnaireMaster, customMeasureId, measureId, optionId } from "@/lib/questionnaire-master";
import { findQuestion, isQuestionnaireScope, type StructuredResponse } from "@/lib/submissions";

export const runtime = "nodejs";
type DatabaseRow = Record<string, unknown>;

function isAuthorized(request: Request) {
  const expected = process.env.ADMIN_EXPORT_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB53C36" } };
  sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(sheet.columnCount).letter}1` };
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "top", wrapText: rowNumber > 1 };
  });
}

function parseStructuredResponse(value: unknown): StructuredResponse | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && "kind" in parsed ? parsed as StructuredResponse : null;
  } catch {
    return null;
  }
}

function details(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function detail(record: Record<string, unknown>, ...keys: string[]) {
  const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === "string");
  return typeof value === "string" ? value : "";
}

function selectedResponse(selection: string, other?: string) {
  return selection.startsWith("Other") && other ? `${selection}: ${other}` : selection;
}

function baseResponse(row: DatabaseRow) {
  const respondent = details(row.respondent_details);
  return {
    submissionId: row.submission_id,
    timestamp: new Date(String(row.submitted_at)),
    system: row.system_category,
    asset: row.asset_name,
    sectionHeading: row.section_heading,
    climateStress: row.question_stressor,
    questionNumber: row.question_number,
    question: row.full_question_text,
    optionId: "",
    selectedResponse: row.selected_response,
    measureId: "",
    measure: "",
    capex: "",
    opex: "",
    unit: row.unit ?? "",
    effectiveness: "",
    name: detail(respondent, "Name (optional)", "Name"),
    organisation: detail(respondent, "Organisation (optional)", "Organisation", "Organization"),
    contact: detail(respondent, "Contact (optional)", "Contact"),
  };
}

function expandResponse(row: DatabaseRow) {
  const base = baseResponse(row);
  if (!isQuestionnaireScope(row.questionnaire_scope)) return [base];
  const context = findQuestion(row.questionnaire_scope, String(row.question_number), String(row.full_question_text));
  const response = parseStructuredResponse(row.structured_response);
  if (!context || !response) return [base];

  const question = context.question;
  const canonicalBase = {
    ...base,
    system: context.system,
    asset: context.asset,
    sectionHeading: context.sectionHeading,
    climateStress: context.stressor,
    questionNumber: question.number,
    question: question.text,
  };
  if (question.type === "choice" && response.kind === "choice") {
    return [{ ...canonicalBase, optionId: optionId(question, response.selection), selectedResponse: selectedResponse(response.selection, response.other) }];
  }
  if (question.type === "matrix" && response.kind === "matrix") {
    return response.rows.map((answer) => {
      const matrixRow = question.rows.find((candidate) => candidate.id === answer.id);
      const selection = selectedResponse(answer.selection, answer.other);
      return { ...canonicalBase, optionId: optionId(question, answer.selection), selectedResponse: matrixRow ? `${matrixRow.label}: ${selection}` : selection, unit: matrixRow?.unit ?? canonicalBase.unit };
    });
  }
  if (question.type === "measures" && response.kind === "measures") {
    return response.rows.map((answer) => {
      const source = question.rows.find((candidate) => candidate.id === answer.id);
      const custom = !source || source.custom;
      return {
        ...canonicalBase,
        selectedResponse: "",
        measureId: source ? measureId(question.number, source.serial) : customMeasureId(question.number, answer.id),
        measure: custom ? (answer.measure || "Other suitable measure") : source.measure,
        capex: answer.capex ?? "",
        opex: answer.opex ?? "",
        unit: custom || source.unit === "" ? (answer.unit ?? "") : (source.unit ?? question.unit),
        effectiveness: answer.outcome ?? "",
      };
    });
  }
  return [canonicalBase];
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureSchema();
    const sql = getDatabase();
    const rows = await sql`
      SELECT r.submission_id, s.submitted_at, s.respondent_details,
        r.system_category, r.asset_name, r.section_heading, r.question_number,
        r.question_stressor, r.full_question_text, r.unit, r.selected_response,
        r.questionnaire_scope, r.structured_response
      FROM questionnaire_responses r
      JOIN questionnaire_submissions s ON s.id = r.submission_id
      ORDER BY s.submitted_at, r.submission_id, r.id
    `;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Climate Risk & Resilience Questionnaire";
    const master = buildQuestionnaireMaster();

    const questionnaireSheet = workbook.addWorksheet("Questionnaire_Master", { views: [{ state: "frozen", ySplit: 1 }] });
    questionnaireSheet.columns = [
      { header: "Question No.", key: "questionNumber", width: 16 }, { header: "System", key: "system", width: 18 },
      { header: "Asset", key: "asset", width: 24 }, { header: "Section Heading", key: "sectionHeading", width: 34 },
      { header: "Climate Stress", key: "climateStress", width: 24 }, { header: "Question", key: "question", width: 70 },
      { header: "Unit", key: "unit", width: 24 }, { header: "Question Type", key: "questionType", width: 22 },
    ];
    questionnaireSheet.addRows(master.questionnaire);
    styleSheet(questionnaireSheet);

    const optionsSheet = workbook.addWorksheet("Options", { views: [{ state: "frozen", ySplit: 1 }] });
    optionsSheet.columns = [
      { header: "Question No.", key: "questionNumber", width: 16 }, { header: "Option ID", key: "optionId", width: 14 },
      { header: "Option Text", key: "optionText", width: 55 },
    ];
    optionsSheet.addRows(master.options);
    styleSheet(optionsSheet);

    const measuresSheet = workbook.addWorksheet("Resilience_Measures", { views: [{ state: "frozen", ySplit: 1 }] });
    measuresSheet.columns = [
      { header: "Measure ID", key: "measureId", width: 16 }, { header: "System", key: "system", width: 18 },
      { header: "Asset", key: "asset", width: 24 }, { header: "Climate Stress", key: "climateStress", width: 24 },
      { header: "Measure", key: "measure", width: 55 }, { header: "CAPEX", key: "capex", width: 16 },
      { header: "OPEX", key: "opex", width: 16 }, { header: "Unit", key: "unit", width: 22 },
      { header: "Effectiveness Metric", key: "effectivenessMetric", width: 40 },
    ];
    measuresSheet.addRows(master.resilienceMeasures);
    styleSheet(measuresSheet);

    const responsesSheet = workbook.addWorksheet("Responses", { views: [{ state: "frozen", ySplit: 1 }] });
    responsesSheet.columns = [
      { header: "Submission ID", key: "submissionId", width: 38 }, { header: "Timestamp", key: "timestamp", width: 24 },
      { header: "System", key: "system", width: 18 }, { header: "Asset", key: "asset", width: 24 },
      { header: "Section Heading", key: "sectionHeading", width: 34 }, { header: "Climate Stress", key: "climateStress", width: 24 },
      { header: "Question No.", key: "questionNumber", width: 16 }, { header: "Question", key: "question", width: 70 },
      { header: "Option ID", key: "optionId", width: 14 }, { header: "Selected Response", key: "selectedResponse", width: 55 },
      { header: "Measure ID", key: "measureId", width: 16 }, { header: "Measure", key: "measure", width: 55 },
      { header: "CAPEX", key: "capex", width: 16 }, { header: "OPEX", key: "opex", width: 16 },
      { header: "Unit", key: "unit", width: 22 }, { header: "Effectiveness", key: "effectiveness", width: 18 },
      { header: "Name", key: "name", width: 24 }, { header: "Organisation", key: "organisation", width: 28 },
      { header: "Contact", key: "contact", width: 28 },
    ];
    rows.flatMap((row) => expandResponse(row as DatabaseRow)).forEach((row) => responsesSheet.addRow(row));
    styleSheet(responsesSheet);

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="questionnaire-responses-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Questionnaire export failed", error);
    return Response.json({ error: "The response workbook could not be generated." }, { status: 500 });
  }
}
