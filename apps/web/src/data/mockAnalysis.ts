import { normalizeInfrastructureIntent } from "@/data/planningOptions";
import type {
  AnalyzeSitePayload,
  ComponentScores,
  InfrastructureIntent,
  ScenarioType,
  SiteAnalysisResult,
} from "@/types/site";

const nonGoalWarning =
  "InfraAI SiteCompass does not approve construction, issue permits, allocate public funding, guarantee grid capacity, or replace engineering, environmental, cybersecurity, or community review.";

const baseComponentScores: ComponentScores = {
  power: 68,
  connectivity: 82,
  coolingWater: 58,
  physicalFeasibility: 72,
  computeEcosystem: 75,
  sectorDemand: 84,
  governance: 66,
  digitalAccess: 68,
  aiLiteracy: 56,
  dataMaturity: 62,
  equity: 60,
  resilience: 64,
  dataCompleteness: 54,
  dataFreshness: 58,
  sourceReliability: 57,
  geographicResolution: 66,
};

const clampScore = (score: number) => Math.round(Math.max(0, Math.min(100, score)));

function classifyReadinessLevel(score: number) {
  if (score >= 80) return "Strong readiness";
  if (score >= 65) return "Moderate readiness";
  if (score >= 50) return "Early readiness";
  return "Low readiness";
}

function weightedScore(
  scores: ComponentScores,
  weights: Partial<Record<keyof ComponentScores, number>>
) {
  return clampScore(
    Object.entries(weights).reduce(
      (total, [key, weight]) =>
        total + scores[key as keyof ComponentScores] * (weight ?? 0),
      0
    )
  );
}

function calculateInfrastructureReadiness(scores: ComponentScores) {
  return weightedScore(scores, {
    power: 0.25,
    connectivity: 0.2,
    computeEcosystem: 0.15,
    coolingWater: 0.15,
    physicalFeasibility: 0.1,
    dataMaturity: 0.1,
    governance: 0.05,
  });
}

function calculateConfidence(scores: ComponentScores) {
  const score = weightedScore(scores, {
    dataCompleteness: 0.4,
    dataFreshness: 0.25,
    sourceReliability: 0.2,
    geographicResolution: 0.15,
  });
  const level = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";
  return {
    score,
    level,
    explanation: `Confidence is ${level.toLowerCase()} because data completeness is ${scores.dataCompleteness}/100, freshness is ${scores.dataFreshness}/100, source reliability is ${scores.sourceReliability}/100, and geographic resolution is ${scores.geographicResolution}/100. Open-data and synthetic layers provide planning context but do not verify feasibility.`,
  } as const;
}

function calculateSectorReadiness(scores: ComponentScores) {
  const infrastructure = calculateInfrastructureReadiness(scores);
  const sectorInputs = [
    {
      name: "Education",
      useCaseFeasibility:
        (scores.aiLiteracy + scores.digitalAccess + scores.dataMaturity) / 3,
      mainGap: "AI literacy, classroom safeguards, and school connectivity.",
      suggestedUseCases: [
        "Teacher planning support",
        "Student services chatbot",
        "Skills analytics",
      ],
    },
    {
      name: "Workforce",
      useCaseFeasibility:
        (scores.aiLiteracy + scores.sectorDemand + scores.digitalAccess) / 3,
      mainGap: "Worker training pathways and SME digital adoption.",
      suggestedUseCases: [
        "Job matching",
        "Training recommendations",
        "SME productivity support",
      ],
    },
    {
      name: "Healthcare",
      useCaseFeasibility:
        scores.governance * 0.45 +
        scores.dataMaturity * 0.35 +
        scores.connectivity * 0.2,
      mainGap: "Privacy, governance, and administrative-only guardrails.",
      suggestedUseCases: [
        "Appointment routing",
        "Inventory forecasting",
        "Admin summarization",
      ],
    },
    {
      name: "Government",
      useCaseFeasibility:
        scores.governance * 0.4 +
        scores.dataMaturity * 0.35 +
        scores.connectivity * 0.25,
      mainGap: "Cross-agency governance, auditability, and data sharing.",
      suggestedUseCases: [
        "Permit triage",
        "Policy document search",
        "Service knowledge assistant",
      ],
    },
    {
      name: "Nonprofits",
      useCaseFeasibility:
        (scores.digitalAccess + scores.equity + scores.aiLiteracy) / 3,
      mainGap: "Shared service access, digital capacity, and inclusion.",
      suggestedUseCases: [
        "Grant discovery",
        "Service referral assistant",
        "Volunteer coordination",
      ],
    },
  ];

  return sectorInputs.map((sector) => {
    const score = clampScore(
      infrastructure * 0.25 +
        scores.digitalAccess * 0.2 +
        scores.dataMaturity * 0.2 +
        scores.aiLiteracy * 0.15 +
        scores.governance * 0.1 +
        sector.useCaseFeasibility * 0.1
    );
    return {
      name: sector.name,
      level: classifyReadinessLevel(score),
      score,
      mainGap: sector.mainGap,
      suggestedUseCases: sector.suggestedUseCases,
    };
  });
}

function applyScenarioAdjustments(
  scenario: ScenarioType,
  scores: ComponentScores
): ComponentScores {
  const adjusted = { ...scores };
  const update = (key: keyof ComponentScores, delta: number) => {
    adjusted[key] = clampScore(adjusted[key] + delta);
  };

  if (scenario === "UPGRADE_FIBER_FIRST") {
    update("connectivity", 8);
    update("digitalAccess", 10);
    update("resilience", 4);
  }
  if (scenario === "VALIDATE_GRID_FIRST") {
    update("power", 10);
    update("dataCompleteness", 8);
    update("sourceReliability", 8);
  }
  if (scenario === "AI_LITERACY_TRAINING") {
    update("aiLiteracy", 14);
    update("sectorDemand", 3);
    update("equity", 3);
  }
  if (scenario === "CLOUD_FIRST") {
    update("coolingWater", 8);
    update("physicalFeasibility", 5);
    update("dataMaturity", 4);
    update("computeEcosystem", -4);
  }
  if (scenario === "DELAY_INVESTMENT") {
    update("dataFreshness", -12);
    update("sectorDemand", -4);
    update("resilience", -3);
  }
  if (scenario === "GOVERNANCE_FIRST") {
    update("governance", 12);
    update("dataMaturity", 8);
    update("sourceReliability", 5);
  }
  if (scenario === "EDGE_PILOT_FIRST") {
    update("resilience", 10);
    update("connectivity", 4);
    update("sectorDemand", 5);
    update("physicalFeasibility", 2);
  }
  if (scenario === "OPEN_DATA_PLATFORM_FIRST") {
    update("dataMaturity", 12);
    update("governance", 6);
    update("digitalAccess", 4);
  }

  return adjusted;
}

function calculateIntentSpecificScore(
  intent: InfrastructureIntent,
  scores: ComponentScores,
  sectorAverage: number
) {
  const confidence = calculateConfidence(scores).score;

  if (intent === "DATA_CENTER_FEASIBILITY") {
    return weightedScore(scores, {
      power: 0.3,
      connectivity: 0.2,
      coolingWater: 0.2,
      physicalFeasibility: 0.15,
      computeEcosystem: 0.1,
      governance: 0.05,
    });
  }
  if (intent === "EDGE_AI_NODES") {
    return weightedScore(scores, {
      connectivity: 0.25,
      power: 0.2,
      sectorDemand: 0.2,
      physicalFeasibility: 0.15,
      computeEcosystem: 0.1,
      resilience: 0.1,
    });
  }
  if (intent === "PUBLIC_COMPUTE_HUB") {
    return weightedScore(scores, {
      connectivity: 0.25,
      power: 0.2,
      sectorDemand: 0.2,
      computeEcosystem: 0.15,
      governance: 0.1,
      physicalFeasibility: 0.1,
    });
  }
  if (intent === "CLOUD_FIRST_STRATEGY") {
    return clampScore(
      scores.connectivity * 0.3 +
        scores.governance * 0.2 +
        scores.dataMaturity * 0.2 +
        sectorAverage * 0.15 +
        scores.digitalAccess * 0.15
    );
  }
  if (intent === "FIBER_CONNECTIVITY_UPGRADE") {
    return clampScore(
      (100 - scores.digitalAccess) * 0.35 +
        scores.sectorDemand * 0.25 +
        (100 - scores.connectivity) * 0.2 +
        (100 - scores.equity) * 0.1 +
        (100 - scores.resilience) * 0.1
    );
  }
  if (intent === "AI_LITERACY_PROGRAM") {
    return clampScore(
      (100 - scores.aiLiteracy) * 0.35 +
        scores.sectorDemand * 0.25 +
        (100 - scores.digitalAccess) * 0.2 +
        (100 - scores.equity) * 0.1 +
        scores.physicalFeasibility * 0.1
    );
  }
  if (intent === "GOVERNANCE_CYBERSECURITY") {
    return clampScore(
      (100 - scores.governance) * 0.3 +
        (100 - scores.dataMaturity) * 0.25 +
        (100 - Math.min(scores.governance, scores.dataMaturity)) * 0.2 +
        scores.sectorDemand * 0.15 +
        (100 - confidence) * 0.1
    );
  }
  if (intent === "POWER_GRID_READINESS") {
    return clampScore(
      scores.power * 0.35 +
        scores.physicalFeasibility * 0.2 +
        scores.computeEcosystem * 0.15 +
        scores.resilience * 0.15 +
        confidence * 0.1 +
        scores.governance * 0.05
    );
  }
  if (intent === "CITY_DATA_PLATFORM") {
    return weightedScore(scores, {
      dataMaturity: 0.3,
      governance: 0.2,
      digitalAccess: 0.2,
      sectorDemand: 0.15,
      aiLiteracy: 0.15,
    });
  }
  if (intent === "SECTOR_SPECIFIC_READINESS") {
    return sectorAverage;
  }
  return calculateInfrastructureReadiness(scores);
}

function detectBottlenecks(scores: ComponentScores) {
  const checks: Array<[string, number]> = [
    ["Power/grid capacity needs utility validation.", scores.power],
    ["Connectivity or fiber redundancy is not strong enough.", scores.connectivity],
    ["Cooling and water feasibility require engineering review.", scores.coolingWater],
    ["Digital access gaps may limit equitable AI service delivery.", scores.digitalAccess],
    ["AI literacy is not yet strong enough for broad deployment.", scores.aiLiteracy],
    ["Data maturity is a constraint for high-impact AI systems.", scores.dataMaturity],
    ["Governance and cybersecurity controls need strengthening.", scores.governance],
  ];
  const bottlenecks = checks
    .filter(([, score]) => score < 65)
    .map(([label]) => label);
  return bottlenecks.length
    ? bottlenecks
    : ["No single component is below the moderate-readiness threshold."];
}

function recommendationForIntent(
  intent: InfrastructureIntent,
  score: number,
  scores: ComponentScores
): string {
  if (intent === "DATA_CENTER_FEASIBILITY") {
    if (scores.power >= 70 && scores.coolingWater >= 65 && score >= 65) {
      return "Proceed only to formal data center feasibility review. Grid, cooling, water, land, and permitting evidence must be validated before any construction decision.";
    }
    return "Do not treat this as ready for immediate data center construction. Use it as a pre-feasibility candidate until grid capacity and cooling/water constraints are validated.";
  }

  const defaultRecommendation =
    "Use this as an open-ended AI infrastructure planning candidate, not an approval decision. Sequence investments around the weakest readiness gaps.";
  const recommendations: Record<InfrastructureIntent, string> = {
    GENERAL_AI_INFRASTRUCTURE:
      defaultRecommendation,
    DATA_CENTER_FEASIBILITY:
      "Use formal feasibility review only after grid, cooling, water, land, and permitting evidence is validated.",
    PUBLIC_COMPUTE_HUB:
      "Suitable for a phased public AI compute hub if grid validation, shared governance, and agency onboarding are handled first.",
    EDGE_AI_NODES:
      "Prioritize small edge AI pilots where connectivity, power, and public-service demand overlap, then expand after reliability checks.",
    CLOUD_FIRST_STRATEGY:
      "Use a cloud-first path for near-term services, while improving governance, data maturity, and connectivity for resilient delivery.",
    FIBER_CONNECTIVITY_UPGRADE:
      "Treat fiber and digital access upgrades as a priority where access gaps constrain sector readiness and equity.",
    POWER_GRID_READINESS:
      "Run utility-led grid validation before committing to local compute or data center scale infrastructure.",
    CITY_DATA_PLATFORM:
      "Invest first in city data platform foundations: data sharing, cataloging, access controls, auditability, and stewardship.",
    AI_LITERACY_PROGRAM:
      "Launch AI literacy and workforce training before broad deployment of high-impact AI systems.",
    GOVERNANCE_CYBERSECURITY:
      "Put governance, cybersecurity, procurement, privacy, and audit controls first before scaling sensitive AI use cases.",
    SECTOR_SPECIFIC_READINESS:
      "Use sector-specific pilots, beginning with low-risk administrative workflows and expanding only after governance and data controls improve.",
  };
  return recommendations[intent] ?? defaultRecommendation;
}

function rankPriorityInvestments(
  intent: InfrastructureIntent,
  scores: ComponentScores
) {
  const priorities: Array<[string, number]> = [
    ["Grid capacity validation", 100 - scores.power],
    [
      "Fiber redundancy and digital access upgrades",
      Math.max(100 - scores.connectivity, 100 - scores.digitalAccess),
    ],
    ["Cooling and water feasibility study", 100 - scores.coolingWater],
    [
      "AI literacy training for public agencies and schools",
      100 - scores.aiLiteracy,
    ],
    [
      "City data governance and cybersecurity framework",
      Math.max(100 - scores.governance, 100 - scores.dataMaturity),
    ],
    ["Equity-focused access program for underserved communities", 100 - scores.equity],
  ];
  const boostByIntent: Partial<Record<InfrastructureIntent, string>> = {
    DATA_CENTER_FEASIBILITY: "Grid capacity validation",
    EDGE_AI_NODES: "Fiber redundancy and digital access upgrades",
    FIBER_CONNECTIVITY_UPGRADE: "Fiber redundancy and digital access upgrades",
    AI_LITERACY_PROGRAM: "AI literacy training for public agencies and schools",
    GOVERNANCE_CYBERSECURITY:
      "City data governance and cybersecurity framework",
    CITY_DATA_PLATFORM: "City data governance and cybersecurity framework",
    POWER_GRID_READINESS: "Grid capacity validation",
  };
  const boosted = boostByIntent[intent];
  return priorities
    .map(([name, gap]) => [name, gap + (name === boosted ? 25 : 0)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
}

function buildWarnings(
  intent: InfrastructureIntent,
  scores: ComponentScores,
  confidenceScore: number
) {
  const warnings: string[] = [];
  if (confidenceScore < 40) {
    warnings.push(
      "Insufficient data. The system should not be used for planning decisions until more reliable data is available."
    );
  }
  if (intent === "DATA_CENTER_FEASIBILITY" && scores.power < 60) {
    warnings.push(
      "Do not recommend immediate data center construction. Grid capacity validation is required."
    );
  }
  if (intent === "DATA_CENTER_FEASIBILITY" && scores.coolingWater < 50) {
    warnings.push(
      "Do not recommend immediate data center construction. Cooling and water feasibility review is required."
    );
  }
  if (scores.aiLiteracy < 50) {
    warnings.push(
      "AI literacy training should happen before city-wide AI deployment."
    );
  }
  if (scores.dataMaturity < 50) {
    warnings.push(
      "Data governance and data maturity improvements are required before high-impact AI deployment."
    );
  }
  warnings.push(nonGoalWarning);
  warnings.push(
    "Synthetic and open-data layers are planning placeholders and cannot prove AI infrastructure feasibility."
  );
  return warnings;
}

function gapText(label: string, score: number) {
  if (score >= 75) return `${label} gap is limited in this demo profile at ${score}/100.`;
  if (score >= 60) return `${label} gap is moderate and should be targeted before scale-up (${score}/100).`;
  return `${label} gap is material and should be addressed before broad deployment (${score}/100).`;
}

function recommendedPath(
  intent: InfrastructureIntent,
  scores: ComponentScores,
  score: number
) {
  if (
    intent === "DATA_CENTER_FEASIBILITY" &&
    (scores.power < 60 || scores.coolingWater < 50)
  ) {
    return "Cloud-first and public compute hub pilots before any data center review.";
  }
  if (intent === "FIBER_CONNECTIVITY_UPGRADE") {
    return "Fiber upgrade priority path with district-level digital access targeting.";
  }
  if (intent === "AI_LITERACY_PROGRAM") {
    return "AI literacy and workforce readiness path before broad AI deployment.";
  }
  if (score >= 75) {
    return "Phased local AI infrastructure path with formal validation gates.";
  }
  return "Pre-feasibility path focused on data, governance, grid, and access upgrades.";
}

function buildAgentReview(scores: ComponentScores, activeLayers: string[]) {
  const syntheticLayerCount = activeLayers.filter(
    (layer) =>
      layer.includes("verification") ||
      layer.includes("risk") ||
      layer.includes("readiness") ||
      layer.includes("gap") ||
      layer.includes("zoning")
  ).length;
  const reliability =
    scores.dataCompleteness >= 75 && scores.sourceReliability >= 75
      ? "High"
      : scores.dataCompleteness >= 50 && scores.sourceReliability >= 50
        ? "Medium"
        : "Low";

  return {
    summary: `Agent review: the score has ${reliability.toLowerCase()} reliability for early planning. Use it to compare investment priorities, not to prove site feasibility.`,
    scoreReliability: reliability,
    evidenceStrengths: [
      `${activeLayers.length} visible overlay(s) were included as the selected evidence set.`,
      "The report combines infrastructure, sector readiness, scenario, and guardrail signals.",
      "The score is deterministic and can be audited against component weights.",
    ],
    evidenceGaps: [
      "Open-data layers may be incomplete or outdated.",
      syntheticLayerCount
        ? `${syntheticLayerCount} visible layer(s) are synthetic placeholders.`
        : "Synthetic placeholders may still be present in the fallback profile.",
      "Utility, land, environmental, cybersecurity, and community validation are still required.",
    ],
    uncertaintyNotes: [
      "The report supports early planning and prioritization only.",
      "Synthetic and open-data layers cannot prove AI infrastructure feasibility.",
    ],
    challengedAssumptions: [
      "Visible layers are assumed to be the selected evidence set.",
      "Layer presence is treated as context, not proof of capacity.",
      "Scenario improvements are directional estimates.",
    ],
    nextValidationSteps: [
      "Validate grid capacity, fiber, water, land, and permitting with responsible agencies.",
      "Replace synthetic placeholders with authoritative datasets.",
      "Run sector workshops before scaling AI deployments.",
    ],
    evidenceCitations: [
      "Offline fallback: no live backend evidence engine was available.",
    ],
    scoreDriverSummary:
      "Offline fallback uses deterministic mock score drivers until the backend evidence engine is available.",
    excludedEvidenceNotes: [
      "Synthetic fallback layers are not treated as real feasibility evidence.",
    ],
    usedLlm: false,
  };
}

function buildMockEvidence(activeLayers: string[], scores: ComponentScores) {
  const syntheticLayers = activeLayers.filter(
    (layer) =>
      layer.includes("synthetic") ||
      layer.includes("verification") ||
      layer.includes("risk") ||
      layer.includes("gap") ||
      layer.includes("zoning") ||
      layer.includes("fiber_corridors")
  );
  const realLayers = activeLayers.filter((layer) => !syntheticLayers.includes(layer));
  return {
    evidenceSummary: {
      activeLayerCount: activeLayers.length,
      scoredLayerCount: realLayers.length,
      realOpenLayerCount: realLayers.length,
      syntheticLayerCount: syntheticLayers.length,
      matchedFeatureCount: realLayers.length,
      nearestEvidenceKm: null,
      summary:
        "Offline fallback evidence is not proximity-calculated. Run the FastAPI backend for real/open GeoJSON evidence matching.",
      confidenceImpact:
        "Low reliability in frontend fallback mode; backend evidence analysis is required.",
    },
    scoreDrivers: [
      {
        component: "Power and grid context",
        score: scores.power,
        evidenceCount: 0,
        nearestEvidenceKm: null,
        supportingLayers: realLayers.filter((layer) => layer.includes("power") || layer.includes("substation") || layer.includes("transmission")),
        excludedSyntheticLayers: syntheticLayers,
        explanation:
          "Frontend fallback does not calculate nearest assets. Use backend evidence mode for real score drivers.",
      },
      {
        component: "Connectivity and interconnection",
        score: scores.connectivity,
        evidenceCount: 0,
        nearestEvidenceKm: null,
        supportingLayers: realLayers.filter((layer) => layer.includes("telecom") || layer.includes("peering")),
        excludedSyntheticLayers: syntheticLayers,
        explanation:
          "Frontend fallback does not calculate fibre or interconnection proximity.",
      },
    ],
    matchedEvidence: [],
    excludedSyntheticLayers: syntheticLayers.map((layerId) => ({
      layerId,
      layerLabel: layerId,
      reason: "Synthetic/offline context excluded from fallback evidence scoring.",
    })),
    dataGaps: [
      "Backend evidence engine is unavailable in frontend fallback mode.",
      "Authoritative utility, telecom, zoning, permitting, and survey datasets are still required.",
    ],
  };
}

export function buildMockAnalysis(
  payload: AnalyzeSitePayload
): SiteAnalysisResult {
  const intent = normalizeInfrastructureIntent(
    payload.intent ?? payload.infrastructureIntent ?? payload.infrastructureType
  );
  const scores = applyScenarioAdjustments(payload.scenario, baseComponentScores);
  const sectors = calculateSectorReadiness(scores);
  const sectorAverage = clampScore(
    sectors.reduce((total, sector) => total + sector.score, 0) / sectors.length
  );
  const confidence = calculateConfidence(scores);
  const score = calculateIntentSpecificScore(intent, scores, sectorAverage);
  const evidence = buildMockEvidence(payload.activeLayers, scores);

  return {
    intent,
    querySummary: payload.userQuestion
      ? `Planning question classified as ${intent}: ${payload.userQuestion}`
      : `Planning focus classified as ${intent}.`,
    selectedSite: {
      lat: payload.lat,
      lng: payload.lng,
      label: "Candidate AI Infrastructure Site",
    },
    suitability: {
      score,
      level: classifyReadinessLevel(score),
      confidence: confidence.level,
      recommendation: recommendationForIntent(intent, score, scores),
    },
    componentScores: scores,
    sectors,
    bottlenecks: detectBottlenecks(scores),
    strengths: [
      "Strong urban connectivity and proximity to public-sector users.",
      "Good fit for shared AI planning across government, education, workforce, healthcare, and nonprofits.",
      "Synthetic and open-data layers support UI demonstration and early planning only.",
    ],
    priorityInvestments: rankPriorityInvestments(intent, scores),
    roadmap: [
      {
        horizon: "0-6 months",
        actions: [
          "Validate grid, fiber, water, and land assumptions with responsible agencies.",
          "Publish a data-quality register that separates open data, synthetic placeholders, and verified evidence.",
          "Define governance, cybersecurity, privacy, and procurement rules for AI pilots.",
        ],
      },
      {
        horizon: "6-18 months",
        actions: [
          "Upgrade the weakest readiness components identified in the scorecard.",
          "Launch low-risk AI pilots across civic sectors.",
          "Measure digital access and AI literacy gaps before expanding services.",
        ],
      },
      {
        horizon: "18-36 months",
        actions: [
          "Scale resilient AI infrastructure only after verified grid, cooling, governance, and community review.",
          "Refresh readiness scores with authoritative utility, land, environmental, and sector datasets.",
          "Update the city AI roadmap annually with public accountability metrics.",
        ],
      },
    ],
    ...evidence,
    agentReview: buildAgentReview(scores, payload.activeLayers),
    confidenceExplanation: confidence.explanation,
    gapSummary: {
      digitalAccess: gapText("Digital access", scores.digitalAccess),
      aiLiteracy: gapText("AI literacy", scores.aiLiteracy),
      infrastructure: `Infrastructure gap is driven by power ${scores.power}/100, connectivity ${scores.connectivity}/100, and cooling/water ${scores.coolingWater}/100.`,
      dataQuality: `Data quality is partial: completeness ${scores.dataCompleteness}/100, freshness ${scores.dataFreshness}/100, reliability ${scores.sourceReliability}/100, and resolution ${scores.geographicResolution}/100.`,
    },
    recommendedInfrastructurePath: recommendedPath(intent, scores, score),
    humanReviewRequired: true,
    warnings: buildWarnings(intent, scores, confidence.score),
  };
}
