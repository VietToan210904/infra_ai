import { buildMockAnalysis } from "@/data/mockAnalysis";
import { normalizeInfrastructureIntent } from "@/data/planningOptions";
import type {
  AgentChatContext,
  AnalyzeSitePayload,
  ChatMessage,
  InfrastructureIntent,
  SiteAnalysisResult,
} from "@/types/site";

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.trim()
  .replace(/\/$/, "");

export async function analyzeSite(
  payload: AnalyzeSitePayload
): Promise<SiteAnalysisResult> {
  const normalizedPayload = normalizeAnalyzePayload(payload);

  if (apiBaseUrl) {
    try {
      return await postJson<SiteAnalysisResult>(
        "/api/analyze-site",
        normalizedPayload
      );
    } catch {
      await wait(250);
      return buildMockAnalysis(normalizedPayload);
    }
  }

  await wait(500);
  return buildMockAnalysis(normalizedPayload);
}

export async function chatWithAgent(
  message: string,
  contextOrAnalysis: AgentChatContext | SiteAnalysisResult | null,
  hasSelectedLocation?: boolean
): Promise<ChatMessage> {
  const context = normalizeChatContext(contextOrAnalysis, hasSelectedLocation);
  if (apiBaseUrl) {
    try {
      return await postJson<ChatMessage>("/api/agent/chat", {
        message,
        currentAnalysis: context.analysis,
        hasSelectedLocation: Boolean(context.selectedLocation),
        selectedLocation: context.selectedLocation,
        activeLayers: context.activeLayers,
        scenario: context.scenario,
        planningFocus: context.planningFocus,
      });
    } catch {
      await wait(250);
      return generateFallbackAgentResponse(
        message,
        resolveFallbackAnalysis(message, context),
        Boolean(context.selectedLocation)
      );
    }
  }

  await wait(250);
  return generateFallbackAgentResponse(
    message,
    resolveFallbackAnalysis(message, context),
    Boolean(context.selectedLocation)
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeAnalyzePayload(
  payload: AnalyzeSitePayload
): AnalyzeSitePayload & { intent: InfrastructureIntent } {
  const intent = normalizeInfrastructureIntent(
    payload.intent ?? payload.infrastructureIntent ?? payload.infrastructureType
  );
  return {
    ...payload,
    intent,
    infrastructureIntent: intent,
  };
}

function normalizeChatContext(
  contextOrAnalysis: AgentChatContext | SiteAnalysisResult | null,
  hasSelectedLocation?: boolean
): AgentChatContext {
  if (
    contextOrAnalysis &&
    "selectedLocation" in contextOrAnalysis &&
    "activeLayers" in contextOrAnalysis
  ) {
    return contextOrAnalysis;
  }

  return {
    selectedLocation: hasSelectedLocation ? { lat: 0, lng: 0 } : null,
    analysis: contextOrAnalysis,
    activeLayers: [],
    scenario: "BUILD_NOW",
    planningFocus: contextOrAnalysis?.intent ?? "GENERAL_AI_INFRASTRUCTURE",
  };
}

function generateFallbackAgentResponse(
  message: string,
  currentAnalysis: SiteAnalysisResult | null,
  hasSelectedLocation: boolean
): ChatMessage {
  const normalized = message.toLowerCase();
  if (!hasSelectedLocation) {
    if (isPlatformQuestion(normalized)) {
      return createAssistantMessage(platformFallbackAnswer(normalized));
    }
    return createAssistantMessage(
      "For site-specific planning, click a location or choose a candidate zone first. I can still answer general questions about scoring, confidence, layers, and MCP tools."
    );
  }

  if (!currentAnalysis) {
    return createAssistantMessage(
      "Run readiness analysis first. After the report is available, I can answer planning questions using the computed scores."
    );
  }

  if (asksAboutMapLocation(normalized)) {
    return createAssistantMessage(mapLocationFallbackAnswer(currentAnalysis));
  }

  const { suitability, bottlenecks, priorityInvestments, sectors, warnings } =
    currentAnalysis;

  if (
    normalized.includes("approve") ||
    normalized.includes("permit") ||
    normalized.includes("funding") ||
    normalized.includes("guarantee")
  ) {
    return createAssistantMessage(
      `No. ${warnings[0] ?? "This tool cannot approve or guarantee planning decisions."} The current score is ${suitability.score}/100 with ${suitability.confidence} confidence.`
    );
  }

  const topSectors = [...sectors]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((sector) => `${sector.name}: ${sector.score}/100`)
    .join("; ");

  return createAssistantMessage(
    `Current readiness score: ${suitability.score}/100 (${suitability.level}) with ${suitability.confidence} confidence. Recommendation: ${suitability.recommendation} Main bottlenecks: ${bottlenecks.join(" ")} Sector impact: ${topSectors}. Priority investments: ${priorityInvestments.join(", ")}. Human review is required.`
  );
}

function isPlatformQuestion(normalized: string) {
  return (
    ["hi", "hello", "hey", "help"].includes(normalized.trim()) ||
    normalized.includes("confidence") ||
    normalized.includes("score") ||
    normalized.includes("map") ||
    normalized.includes("layer") ||
    normalized.includes("mcp") ||
    normalized.includes("tool")
  );
}

function platformFallbackAnswer(normalized: string) {
  if (["hi", "hello", "hey", "help"].includes(normalized.trim())) {
    return "Hi. I can explain how InfraAI works, review evidence after analysis, compare scenarios, and suggest validation steps.";
  }
  if (normalized.includes("confidence")) {
    return "Confidence reflects data completeness, freshness, source reliability, and geographic resolution. It is not a feasibility guarantee.";
  }
  if (normalized.includes("score")) {
    return "Scores are deterministic weighted calculations. In backend mode, real/open GeoJSON evidence drives the component scores while synthetic layers are excluded from numeric scoring.";
  }
  if (normalized.includes("mcp") || normalized.includes("tool")) {
    return "The backend exposes planning tools through chat and the MCP endpoint. The browser keeps using REST.";
  }
  return "Visible map layers define the selected evidence set. Real/open layers can support scoring; synthetic layers are context and uncertainty only.";
}

function createAssistantMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
  };
}

function resolveFallbackAnalysis(
  message: string,
  context: AgentChatContext
): SiteAnalysisResult | null {
  if (context.analysis || !context.selectedLocation) {
    return context.analysis;
  }

  return buildMockAnalysis({
    lat: context.selectedLocation.lat,
    lng: context.selectedLocation.lng,
    intent: context.planningFocus,
    userQuestion: message,
    activeLayers: context.activeLayers,
    scenario: context.scenario,
  });
}

function asksAboutMapLocation(normalized: string) {
  return [
    "this location",
    "the location",
    "location",
    "selected location",
    "clicked location",
    "how is the location",
    "hows the location",
    "how's the location",
    "around here",
    "the area",
    "this area",
    "area around",
    "surroundings",
    "surrounding",
    "nearby",
    "nearest",
    "facilities",
    "components",
    "infrastructure around",
  ].some((term) => normalized.includes(term));
}

function mapLocationFallbackAnswer(analysis: SiteAnalysisResult) {
  const site = analysis.selectedSite;
  const evidenceSummary = analysis.evidenceSummary.summary;
  const drivers = analysis.scoreDrivers
    .filter((driver) => driver.supportingLayers.length > 0)
    .slice(0, 4)
    .map(
      (driver) =>
        `${driver.component}: ${driver.score}/100 from ${driver.supportingLayers.join(", ")}`
    );
  const synthetic = analysis.excludedSyntheticLayers
    .slice(0, 4)
    .map((layer) => layer.layerLabel)
    .join(", ");
  return [
    `Map context for ${site.label} (${site.lat.toFixed(5)}, ${site.lng.toFixed(5)}).`,
    evidenceSummary,
    drivers.length
      ? `Visible infrastructure signals: ${drivers.join("; ")}.`
      : "No backend proximity-matched facilities are available in fallback mode.",
    synthetic
      ? `Synthetic context excluded from scoring: ${synthetic}.`
      : "No synthetic context was selected.",
    "Run the FastAPI backend for real nearby-asset matching from local GeoJSON.",
  ].join(" ");
}
