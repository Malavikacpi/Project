import type { Question } from "@/lib/types";
import { getScopeMetadata, questionnaireScopes, type QuestionnaireScope } from "@/lib/submissions";

export type QuestionnaireMasterRow = {
  questionNumber: string;
  system: string;
  asset: string;
  sectionHeading: string;
  climateStress: string;
  question: string;
  unit: string;
  questionType: string;
};

export type OptionMasterRow = {
  questionNumber: string;
  optionId: string;
  optionText: string;
};

export type ResilienceMeasureMasterRow = {
  measureId: string;
  system: string;
  asset: string;
  climateStress: string;
  measure: string;
  minimum: string;
  maximum: string;
  unit: string;
  effectivenessMetric: string;
};

export function alphabeticId(index: number, uppercase = true) {
  let value = index + 1;
  let id = "";
  while (value > 0) {
    value -= 1;
    id = String.fromCharCode((uppercase ? 65 : 97) + value % 26) + id;
    value = Math.floor(value / 26);
  }
  return id;
}

export function questionUnit(question: Question) {
  if (question.type === "matrix") return [...new Set(question.rows.map((row) => row.unit).filter(Boolean))].join("; ");
  return question.unit;
}

export function optionId(question: Question, selection: string) {
  if (question.type === "measures") return "";
  const index = question.options.indexOf(selection);
  return index >= 0 ? alphabeticId(index) : "";
}

export function measureId(questionNumber: string, serial: string) {
  return `${questionNumber}-${serial}`;
}

export function customMeasureId(questionNumber: string, rowId: string) {
  const index = Number(rowId.match(/^custom-measure-(\d+)$/)?.[1]);
  return Number.isInteger(index) && index > 0 ? `${questionNumber}-other-${index}` : `${questionNumber}-other`;
}

export function buildQuestionnaireMaster() {
  const questionnaire: QuestionnaireMasterRow[] = [];
  const options: OptionMasterRow[] = [];
  const resilienceMeasures: ResilienceMeasureMasterRow[] = [];

  for (const scope of questionnaireScopes) {
    const metadata = getScopeMetadata(scope as QuestionnaireScope);
    for (const section of metadata.questionnaire.sections) {
      for (const question of section.questions) {
        questionnaire.push({
          questionNumber: question.number,
          system: metadata.system,
          asset: metadata.asset,
          sectionHeading: metadata.sectionHeading,
          climateStress: section.title,
          question: question.text,
          unit: questionUnit(question),
          questionType: question.type === "choice" ? "Choice" : question.type === "matrix" ? "Matrix" : "Resilience Measures",
        });

        if (question.type !== "measures") {
          question.options.forEach((option, index) => options.push({
            questionNumber: question.number,
            optionId: alphabeticId(index),
            optionText: option,
          }));
        } else {
          question.rows.filter((row) => !row.custom).forEach((row) => resilienceMeasures.push({
            measureId: measureId(question.number, row.serial),
            system: metadata.system,
            asset: metadata.asset,
            climateStress: section.title,
            measure: row.measure,
            minimum: "",
            maximum: "",
            unit: row.unit ?? question.unit,
            effectivenessMetric: question.outcomeLabel,
          }));
        }
      }
    }
  }

  return { questionnaire, options, resilienceMeasures };
}
