import { timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import { ensureSchema, getDatabase } from "@/lib/db";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.ADMIN_EXPORT_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSchema();
    const sql = getDatabase();
    const rows = await sql`
      SELECT r.submission_id, s.submitted_at, r.system_category, r.asset_name, r.section_code, r.section_heading,
        r.asset_system, r.question_number, r.question_stressor, r.full_question_text,
        r.unit, r.selected_response
      FROM questionnaire_responses r
      JOIN questionnaire_submissions s ON s.id = r.submission_id
      ORDER BY s.submitted_at, r.submission_id, r.id
    `;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Climate Risk & Resilience Questionnaire";
    const sheet = workbook.addWorksheet("Responses", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Submission ID", key: "submission_id", width: 38 },
      { header: "Timestamp", key: "submitted_at", width: 24 },
      { header: "System", key: "system_category", width: 18 },
      { header: "Asset", key: "asset_name", width: 25 },
      { header: "Section", key: "section_code", width: 12 },
      { header: "Section heading", key: "section_heading", width: 34 },
      { header: "Asset/System", key: "asset_system", width: 25 },
      { header: "Question number", key: "question_number", width: 18 },
      { header: "Question/stressor", key: "question_stressor", width: 25 },
      { header: "Full question text", key: "full_question_text", width: 70 },
      { header: "Unit", key: "unit", width: 22 },
      { header: "Response", key: "selected_response", width: 70 },
    ];
    for (const row of rows) sheet.addRow({ ...row, submitted_at: new Date(row.submitted_at as string) });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B1E2D" } };
    sheet.autoFilter = { from: "A1", to: "L1" };
    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: "top", wrapText: rowNumber > 1 };
    });

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
