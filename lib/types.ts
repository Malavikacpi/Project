export type ChoiceQuestion = {
  type: "choice";
  number: string;
  text: string;
  unit: string;
  options: string[];
};

export type MatrixRow = { id: string; label: string; unit: string };
export type MatrixQuestion = {
  type: "matrix";
  number: string;
  text: string;
  firstColumn: string;
  rows: MatrixRow[];
  options: string[];
};

export type MeasureRow = { id: string; serial: string; measure: string; custom: boolean };
export type MeasuresQuestion = {
  type: "measures";
  number: string;
  text: string;
  outcomeLabel: string;
  unit: string;
  rows: MeasureRow[];
};

export type Question = ChoiceQuestion | MatrixQuestion | MeasuresQuestion;
export type Questionnaire = {
  title: string;
  sectionLabel: string;
  introduction: string;
  sections: { number: string; title: string; questions: Question[] }[];
};
