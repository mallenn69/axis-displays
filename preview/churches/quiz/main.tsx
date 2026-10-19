import { createRoot } from "react-dom/client";
import { ChurchQuiz } from "../../../src/components/churches/church-quiz";
import { TrafficChoice } from "../../../src/components/leads/traffic-choice";
createRoot(document.getElementById("root")!).render(
  <>
    <ChurchQuiz />
    <TrafficChoice showPreferences={false} />
  </>,
);
