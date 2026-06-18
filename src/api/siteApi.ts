import { buildMockAnalysis } from "@/data/mockAnalysis";
import type {
  AnalyzeSitePayload,
  ChatMessage,
  SiteAnalysisResult,
} from "@/types/site";

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export async function analyzeSite(
  payload: AnalyzeSitePayload
): Promise<SiteAnalysisResult> {
  await wait(500);
  return buildMockAnalysis(payload);
}

export async function chatWithAgent(
  message: string,
  currentAnalysis: SiteAnalysisResult | null,
  hasSelectedLocation: boolean
): Promise<ChatMessage> {
  await wait(250);

  const normalized = message.toLowerCase();

  if (!hasSelectedLocation) {
    return createAssistantMessage(
      "Choose a candidate site on the Saigon planning map first. Then I can explain what the location appears ready for and what still needs review."
    );
  }

  if (!currentAnalysis) {
    return createAssistantMessage(
      "Run the site analysis first. Once the readiness report is available, I can walk through the tradeoffs in plain language."
    );
  }

  const { suitability, componentScores, bottlenecks, priorityInvestments, roadmap } =
    currentAnalysis;

  if (
    normalized.includes("approve") ||
    normalized.includes("permit") ||
    normalized.includes("approval")
  ) {
    return createAssistantMessage(
      `No. This dashboard cannot approve construction, issue permits, allocate funding, guarantee grid capacity, or replace engineering and environmental review. It can only explain the current readiness report. The current recommendation confidence is ${suitability.confidence}.`
    );
  }

  if (normalized.includes("risk") || normalized.includes("bottleneck")) {
    return createAssistantMessage(
      `The main planning risks are: ${bottlenecks.join(" ")} The lowest readiness areas are cooling and water at ${componentScores.coolingWater}, power capacity at ${componentScores.power}, and governance at ${componentScores.governance}.`
    );
  }

  if (normalized.includes("missing") || normalized.includes("infrastructure")) {
    return createAssistantMessage(
      `The report points to three infrastructure gaps: verified grid capacity, redundant fiber paths, and cooling or water feasibility. Those should be checked before the city treats this as a larger regional data center location.`
    );
  }

  if (normalized.includes("investment") || normalized.includes("improves")) {
    return createAssistantMessage(
      `The most useful near-term investments are ${priorityInvestments.join(", ")}. Grid validation and fiber redundancy should come before any larger regional data center decision.`
    );
  }

  if (normalized.includes("benefit") || normalized.includes("public")) {
    return createAssistantMessage(
      `The strongest public benefits are shared government services, education and workforce tools, and lower-risk administrative support for healthcare. The score is ${suitability.score}/100, so this is a planning candidate, not an approval decision.`
    );
  }

  if (
    normalized.includes("compute hub") ||
    normalized.includes("data center") ||
    normalized.includes("better")
  ) {
    return createAssistantMessage(
      `This site is currently better suited for a public-sector AI compute hub than a regional AI data center. The suitability score is ${suitability.score}, with ${suitability.confidence} confidence. The report flags grid capacity, cooling feasibility, and governance readiness as blockers for a regional data center.`
    );
  }

  if (
    normalized.includes("6 months") ||
    normalized.includes("next 6") ||
    normalized.includes("roadmap") ||
    normalized.includes("first")
  ) {
    const nearTerm = roadmap.find((item) => item.horizon === "0-6 months");
    return createAssistantMessage(
      `The first step is a practical readiness check: ${nearTerm?.actions.join(" ")}`
    );
  }

  return createAssistantMessage(
    `For the selected site, the readiness report shows ${suitability.score}/100 with ${suitability.confidence} confidence. ${suitability.recommendation}`
  );
}

function createAssistantMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
  };
}
