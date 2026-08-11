import distributionSystem from "./questionnaire.json";
import type { Questionnaire } from "@/lib/types";

/**
 * Central questionnaire registry. Add a new structured-data import here to make
 * another system questionnaire available without changing the form renderer.
 */
export const questionnaires = {
  distribution: distributionSystem as Questionnaire,
} as const;

export type QuestionnaireId = keyof typeof questionnaires;

export function getQuestionnaire(id: QuestionnaireId): Questionnaire {
  return questionnaires[id];
}
