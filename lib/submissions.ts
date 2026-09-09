import questionnairesData from "@/data/questionnaires.json";
import type { Question, Questionnaire, QuestionnaireCollection } from "@/lib/types";

export const questionnaireScopes = ["solar", "wind", "thermal", "transmission", "distribution"] as const;
export type QuestionnaireScope = (typeof questionnaireScopes)[number];

export type ChoiceResponse = { kind: "choice"; selection: string; other?: string };
export type MatrixResponse = { kind: "matrix"; rows: Array<{ id: string; selection: string; other?: string }> };
export type MeasuresResponse = {
  kind: "measures";
  rows: Array<{ id: string; measure?: string; minimum?: string; maximum?: string; outcome?: string }>;
};
export type StructuredResponse = ChoiceResponse | MatrixResponse | MeasuresResponse;
export type SubmissionResponse = { scope: QuestionnaireScope; questionNumber: string; response: StructuredResponse };

export type ScopeMetadata = {
  questionnaire: Questionnaire;
  sectionCode: "A" | "B" | "C";
  sectionHeading: string;
  assetSystem: string;
};

const questionnaires = questionnairesData as QuestionnaireCollection;

export function isQuestionnaireScope(value: unknown): value is QuestionnaireScope {
  return typeof value === "string" && questionnaireScopes.includes(value as QuestionnaireScope);
}

export function getScopeMetadata(scope: QuestionnaireScope): ScopeMetadata {
  if (scope === "solar") return { questionnaire: questionnaires.generation.solar, sectionCode: "A", sectionHeading: "Section A: Generation Assets", assetSystem: "Solar Power Plant" };
  if (scope === "wind") return { questionnaire: questionnaires.generation.wind, sectionCode: "A", sectionHeading: "Section A: Generation Assets", assetSystem: "Wind Power Plant" };
  if (scope === "thermal") return { questionnaire: questionnaires.generation.thermal, sectionCode: "A", sectionHeading: "Section A: Generation Assets", assetSystem: "Thermal Power Plant" };
  if (scope === "transmission") return { questionnaire: questionnaires.transmission, sectionCode: "B", sectionHeading: "Section B: Transmission System", assetSystem: "Transmission System" };
  return { questionnaire: questionnaires.distribution, sectionCode: "C", sectionHeading: "Section C: Distribution System", assetSystem: "Distribution System" };
}

export function findQuestion(scope: QuestionnaireScope, questionNumber: string) {
  const metadata = getScopeMetadata(scope);
  for (const section of metadata.questionnaire.sections) {
    const question = section.questions.find((candidate) => candidate.number === questionNumber);
    if (question) return { ...metadata, stressor: section.title, question };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validNumberString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

export function validateStructuredResponse(question: Question, response: unknown): response is StructuredResponse {
  if (!isRecord(response) || typeof response.kind !== "string") return false;

  if (question.type === "choice") {
    if (response.kind !== "choice" || typeof response.selection !== "string" || !question.options.includes(response.selection)) return false;
    return !response.selection.startsWith("Other") || (typeof response.other === "string" && response.other.trim().length > 0 && response.other.length <= 1000);
  }

  if (question.type === "matrix") {
    if (response.kind !== "matrix" || !Array.isArray(response.rows) || response.rows.length !== question.rows.length) return false;
    const responseRows = response.rows;
    return question.rows.every((expected) => {
      const row = responseRows.find((candidate) => isRecord(candidate) && candidate.id === expected.id);
      if (!row || typeof row.selection !== "string" || !question.options.includes(row.selection)) return false;
      return !row.selection.startsWith("Other") || (typeof row.other === "string" && row.other.trim().length > 0 && row.other.length <= 1000);
    });
  }

  if (response.kind !== "measures" || !Array.isArray(response.rows)) return false;
  const responseRows = response.rows;
  const knownIds = new Set(question.rows.map((row) => row.id));
  if (responseRows.some((row) => !isRecord(row) || typeof row.id !== "string" || !knownIds.has(row.id))) return false;

  return question.rows.every((expected) => {
    const row = responseRows.find((candidate) => isRecord(candidate) && candidate.id === expected.id);
    if (expected.custom && !row) return true;
    if (!row) return false;
    const anyValue = [row.measure, row.minimum, row.maximum, row.outcome].some((value) => typeof value === "string" && value.trim());
    if (expected.custom && !anyValue) return true;
    if (expected.custom && (typeof row.measure !== "string" || !row.measure.trim())) return false;
    return validNumberString(row.minimum) && validNumberString(row.maximum) && validNumberString(row.outcome) && Number(row.outcome) <= 100 && Number(row.minimum) <= Number(row.maximum);
  });
}

export function formatStructuredResponse(question: Question, response: StructuredResponse) {
  if (question.type === "choice" && response.kind === "choice") {
    return response.selection.startsWith("Other") ? `${response.selection}: ${response.other}` : response.selection;
  }
  if (question.type === "matrix" && response.kind === "matrix") {
    return JSON.stringify(question.rows.map((row) => {
      const answer = response.rows.find((candidate) => candidate.id === row.id)!;
      return { item: row.label, unit: row.unit, response: answer.selection.startsWith("Other") ? `${answer.selection}: ${answer.other}` : answer.selection };
    }));
  }
  if (question.type === "measures" && response.kind === "measures") {
    return JSON.stringify(response.rows.map((answer) => {
      const row = question.rows.find((candidate) => candidate.id === answer.id)!;
      return { measure: row.custom ? answer.measure : row.measure, minimumCost: answer.minimum, maximumCost: answer.maximum, costUnit: question.unit, expectedOutcomePercent: answer.outcome };
    }));
  }
  throw new Error("Response type does not match question type.");
}
