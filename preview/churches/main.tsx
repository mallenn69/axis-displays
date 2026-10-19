import { createRoot } from "react-dom/client";
import { ChurchFunnel } from "../../src/components/churches/church-funnel";
import { TrafficChoice } from "../../src/components/leads/traffic-choice";
createRoot(document.getElementById("root")!).render(
  <>
    <ChurchFunnel />
    <TrafficChoice showPreferences={false} />
  </>,
);
