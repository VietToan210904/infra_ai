import type {
  AnalyzeSitePayload,
  ComponentScores,
  ScenarioType,
  SiteAnalysisResult,
} from "@/types/site";

const baseComponentScores: ComponentScores = {
  power: 68,
  connectivity: 84,
  coolingWater: 59,
  physicalFeasibility: 73,
  computeEcosystem: 77,
  sectorDemand: 86,
  governance: 70,
};

const clampScore = (score: number) => Math.max(0, Math.min(100, score));

function applyScenarioAdjustments(
  scenario: ScenarioType,
  scores: ComponentScores
): {
  scores: ComponentScores;
  scoreDelta: number;
  confidence: SiteAnalysisResult["suitability"]["confidence"];
  note: string;
} {
  const adjusted = { ...scores };
  let scoreDelta = 0;
  let confidence: SiteAnalysisResult["suitability"]["confidence"] = "Medium";
  let note = "Build-now scenario uses current synthetic MVP assumptions.";

  if (scenario === "UPGRADE_FIBER_FIRST") {
    adjusted.connectivity = clampScore(adjusted.connectivity + 8);
    adjusted.computeEcosystem = clampScore(adjusted.computeEcosystem + 3);
    scoreDelta = 3;
    note = "Fiber-first planning improves connectivity and regional service reliability.";
  }

  if (scenario === "VALIDATE_GRID_FIRST") {
    adjusted.power = clampScore(adjusted.power + 9);
    adjusted.physicalFeasibility = clampScore(adjusted.physicalFeasibility + 3);
    scoreDelta = 4;
    confidence = "High";
    note = "Grid validation improves confidence and reduces power-readiness uncertainty.";
  }

  if (scenario === "AI_LITERACY_TRAINING") {
    adjusted.sectorDemand = clampScore(adjusted.sectorDemand + 6);
    adjusted.governance = clampScore(adjusted.governance + 3);
    scoreDelta = 2;
    note = "AI literacy training improves sector readiness and adoption capacity.";
  }

  if (scenario === "CLOUD_FIRST") {
    adjusted.physicalFeasibility = clampScore(adjusted.physicalFeasibility + 7);
    adjusted.coolingWater = clampScore(adjusted.coolingWater + 6);
    adjusted.computeEcosystem = clampScore(adjusted.computeEcosystem - 7);
    scoreDelta = 1;
    note =
      "Cloud-first delivery lowers immediate physical infrastructure risk but reduces local compute control.";
  }

  if (scenario === "DELAY_INVESTMENT") {
    adjusted.computeEcosystem = clampScore(adjusted.computeEcosystem - 3);
    adjusted.sectorDemand = clampScore(adjusted.sectorDemand - 4);
    scoreDelta = -6;
    confidence = "Low";
    note =
      "Delay reduces recommendation confidence because demand and infrastructure assumptions may drift.";
  }

  return { scores: adjusted, scoreDelta, confidence, note };
}

export function buildMockAnalysis(
  payload: AnalyzeSitePayload
): SiteAnalysisResult {
  const { scores, scoreDelta, confidence, note } = applyScenarioAdjustments(
    payload.scenario,
    baseComponentScores
  );
  const isRegionalDataCenter =
    payload.infrastructureType === "REGIONAL_AI_DATA_CENTER";
  const score = clampScore(78 + scoreDelta + (isRegionalDataCenter ? -7 : 0));

  const recommendation = isRegionalDataCenter
    ? "Not recommended yet for a regional AI data center until grid capacity, cooling feasibility, and governance readiness are validated. The selected Saigon zone is better treated as a phased public-sector compute hub candidate first."
    : "Suitable with upgrades for a public-sector AI compute hub. Not recommended yet for a regional AI data center until grid capacity, cooling feasibility, and governance readiness are validated.";

  return {
    selectedSite: {
      lat: payload.lat,
      lng: payload.lng,
      label: "Candidate AI Infrastructure Site",
    },
    suitability: {
      score,
      level: score >= 75 ? "Feasibility Review Ready" : "Pre-Feasibility Only",
      confidence,
      recommendation,
    },
    componentScores: scores,
    strengths: [
      "Strong urban connectivity and proximity to public-sector users.",
      "Good fit for shared public-sector AI services.",
      "High demand from government, education, workforce, and healthcare sectors.",
      note,
    ],
    sectors: [
      {
        name: "Government",
        level: "High readiness",
        score: 84,
        mainGap: "Cross-agency data governance and auditability.",
        suggestedUseCases: [
          "Permit triage",
          "Public service knowledge assistant",
          "Policy document search",
        ],
      },
      {
        name: "Education",
        level: payload.scenario === "AI_LITERACY_TRAINING" ? "High readiness" : "Moderate readiness",
        score: payload.scenario === "AI_LITERACY_TRAINING" ? 82 : 74,
        mainGap: "AI literacy and responsible classroom deployment capacity.",
        suggestedUseCases: [
          "Teacher planning support",
          "Student services chatbot",
          "Digital skills analytics",
        ],
      },
      {
        name: "Workforce",
        level: "Moderate readiness",
        score: payload.scenario === "AI_LITERACY_TRAINING" ? 80 : 76,
        mainGap: "Training pathways for public-sector and SME adoption.",
        suggestedUseCases: [
          "Job matching",
          "Training recommendations",
          "SME productivity support",
        ],
      },
      {
        name: "Healthcare",
        level: "Constrained readiness",
        score: 63,
        mainGap: "Sensitive data governance and administrative-only guardrails.",
        suggestedUseCases: [
          "Appointment routing",
          "Inventory forecasting",
          "Administrative summarization",
        ],
      },
      {
        name: "Nonprofits",
        level: "Moderate readiness",
        score: 69,
        mainGap: "Digital capacity and shared service access.",
        suggestedUseCases: [
          "Grant discovery",
          "Service referral assistant",
          "Volunteer coordination",
        ],
      },
    ],
    bottlenecks: [
      "Grid capacity is not publicly verifiable from the current MVP data.",
      "Cooling and water feasibility require engineering review.",
      "AI literacy programs are needed before scaling AI services city-wide.",
      "Healthcare data governance should remain administrative-only until stronger controls are in place.",
    ],
    priorityInvestments: [
      "Grid validation",
      "Fiber redundancy upgrade",
      "AI literacy training for schools and public agencies",
      "Public-sector data governance framework",
      "Cooling and water feasibility study",
    ],
    roadmap: [
      {
        horizon: "0-6 months",
        actions: [
          "Validate grid capacity near selected zone.",
          "Map digital access gaps across Saigon districts.",
          "Launch AI literacy training for public agencies and schools.",
          "Start low-risk cloud-based government AI pilots.",
          "Define public-sector AI governance standards.",
        ],
      },
      {
        horizon: "6-18 months",
        actions: [
          "Upgrade fiber redundancy.",
          "Build a small public-sector AI compute hub pilot.",
          "Pilot education and workforce AI tools.",
          "Keep healthcare AI administrative-only.",
          "Support nonprofit digital capacity.",
        ],
      },
      {
        horizon: "18-36 months",
        actions: [
          "Expand compute hub capacity.",
          "Consider regional data center only after grid and cooling validation.",
          "Scale AI services across sectors.",
          "Monitor readiness score drift.",
          "Update roadmap with new data.",
        ],
      },
    ],
    humanReviewRequired: true,
    warnings: [
      "InfraAI SiteCompass does not approve construction, issue permits, allocate funding, guarantee grid capacity, or replace engineering and environmental review.",
      "Synthetic MVP layers are directional planning aids, not authoritative infrastructure records.",
    ],
  };
}
