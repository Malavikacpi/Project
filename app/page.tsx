import QuestionnaireForm from "@/components/QuestionnaireForm";
import { getQuestionnaire } from "@/data/questionnaires";

export default function Home() {
  return <QuestionnaireForm questionnaire={getQuestionnaire("distribution")} />;
}
