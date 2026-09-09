import QuestionnaireForm from "@/components/QuestionnaireForm";
import questionnaires from "@/data/questionnaires.json";
import type { QuestionnaireCollection } from "@/lib/types";

export default function Home() {
  return <QuestionnaireForm questionnaires={questionnaires as QuestionnaireCollection} />;
}

