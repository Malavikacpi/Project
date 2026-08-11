import QuestionnaireForm from "@/components/QuestionnaireForm";
import questionnaire from "@/data/questionnaire.json";
import type { Questionnaire } from "@/lib/types";

export default function Home() {
  return <QuestionnaireForm questionnaire={questionnaire as Questionnaire} />;
}
