import questionnairesData from "@/data/questionnaires.json";
import type { Question, Questionnaire, QuestionnaireCollection } from "@/lib/types";

export const questionnaireScopes = ["solar", "wind", "thermal", "transmission", "distribution"] as const;
export type QuestionnaireScope = (typeof questionnaireScopes)[number];

export type ChoiceResponse = { kind: "choice"; selection: string; other?: string };
export type MatrixResponse = { kind: "matrix"; rows: Array<{ id: string; selection: string; other?: string }> };
export type MeasuresResponse = {
  kind: "measures";
  rows: Array<{ id: string; measure?: string; minimum?: string; maximum?: string; cost?: string; outcome?: string }>;
};
export type StructuredResponse = ChoiceResponse | MatrixResponse | MeasuresResponse;
export type SubmissionResponse = { scope: QuestionnaireScope; questionNumber: string; questionText: string; response: StructuredResponse };

export type ScopeMetadata = {
  questionnaire: Questionnaire;
  sectionCode: "A" | "B" | "C";
  sectionHeading: string;
  system: "Generation" | "Transmission" | "Distribution";
  asset: string;
  assetSystem: string;
};

const questionnaires = questionnairesData as QuestionnaireCollection;

export function isQuestionnaireScope(value: unknown): value is QuestionnaireScope {
  return typeof value === "string" && questionnaireScopes.includes(value as QuestionnaireScope);
}

export function getScopeMetadata(scope: QuestionnaireScope): ScopeMetadata {
  if (scope === "solar") return { questionnaire: questionnaires.generation.solar, sectionCode: "A", sectionHeading: "Section A: Generation Assets", system: "Generation", asset: "Solar Power Plant", assetSystem: "Solar Power Plant" };
  if (scope === "wind") return { questionnaire: questionnaires.generation.wind, sectionCode: "A", sectionHeading: "Section A: Generation Assets", system: "Generation", asset: "Wind Power Plant", assetSystem: "Wind Power Plant" };
  if (scope === "thermal") return { questionnaire: questionnaires.generation.thermal, sectionCode: "A", sectionHeading: "Section A: Generation Assets", system: "Generation", asset: "Thermal Power Plant", assetSystem: "Thermal Power Plant" };
  if (scope === "transmission") return { questionnaire: questionnaires.transmission, sectionCode: "B", sectionHeading: "Section B: Transmission System", system: "Transmission", asset: "Transmission System", assetSystem: "Transmission System" };
  return { questionnaire: questionnaires.distribution, sectionCode: "C", sectionHeading: "Section C: Distribution System", system: "Distribution", asset: "Distribution System", assetSystem: "Distribution System" };
}

export function findQuestion(scope: QuestionnaireScope, questionNumber: string, questionText: string) {
  const metadata = getScopeMetadata(scope);
  for (const section of metadata.questionnaire.sections) {
    const question = section.questions.find((candidate) => candidate.number === questionNumber && candidate.text === questionText);
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
  const hasCustomRows = question.rows.some((row) => row.custom);
  if (!responseRows.length || responseRows.length > 100) return false;
  const seenIds = new Set<string>();
  return responseRows.every((row) => {
    if (!isRecord(row) || typeof row.id !== "string" || (!knownIds.has(row.id) && !(hasCustomRows && /^custom-measure-\d+$/.test(row.id))) || seenIds.has(row.id)) return false;
    seenIds.add(row.id);
    const values = [row.measure, row.minimum, row.maximum, row.cost, row.outcome];
    if (!values.some((value) => typeof value === "string" && value.trim())) return false;
    if (values.some((value) => value !== undefined && typeof value !== "string")) return false;
    if (typeof row.measure === "string" && row.measure.length > 1000) return false;
    if (typeof row.minimum === "string" && row.minimum.trim() && !validNumberString(row.minimum)) return false;
    if (typeof row.maximum === "string" && row.maximum.trim() && !validNumberString(row.maximum)) return false;
    if (typeof row.cost === "string" && row.cost.trim() && !validNumberString(row.cost)) return false;
    if (typeof row.outcome === "string" && row.outcome.trim() && (!validNumberString(row.outcome) || Number(row.outcome) > 100)) return false;
    if (typeof row.minimum === "string" && row.minimum.trim() && typeof row.maximum === "string" && row.maximum.trim() && Number(row.minimum) > Number(row.maximum)) return false;
    return true;
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
      const row = question.rows.find((candidate) => candidate.id === answer.id);
      const custom = !row || row.custom;
      return { measure: custom ? (answer.measure || "Other suitable measure") : row.measure, minimumCost: answer.minimum, maximumCost: answer.maximum, cost: answer.cost, costUnit: question.unit, expectedOutcomePercent: answer.outcome };
    }));
  }
  throw new Error("Response type does not match question type.");
}
