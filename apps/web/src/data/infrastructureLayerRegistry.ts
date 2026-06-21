import type { FeatureCollection, Geometry } from "geojson";

import { DEFAULT_CITY } from "@/data/cityConfig";

export type InfrastructureLayerCategory =
  | "power"
  | "network"
  | "public_service"
  | "innovation_capacity"
  | "land_environment"
  | "transport_logistics"
  | "verification"
  | "risk_land"
  | "ai_analysis";

export type InfrastructureLayerStatus =
  | "available"
  | "needs_data"
  | "planned"
  | "error"
  | "loading";

export type InfrastructureLayerDataType =
  | "point"
  | "line"
  | "polygon"
  | "mixed";

export type InfrastructureLayerSourceType =
  | "open_data"
  | "authoritative"
  | "authoritative_planned"
  | "synthetic"
  | "user_uploaded";

export type InfrastructureLayerId =
  | "power_plants"
  | "wri_power_plants"
  | "substations"
  | "transmission_lines"
  | "telecom_assets"
  | "opencellid_cell_sites"
  | "ookla_fixed_performance"
  | "ookla_mobile_performance"
  | "peeringdb_facilities"
  | "peeringdb_exchanges"
  | "existing_data_centers"
  | "tech_research_facilities"
  | "education_facilities"
  | "healthcare_facilities"
  | "government_facilities"
  | "public_safety_facilities"
  | "industrial_zones"
  | "transport_corridors"
  | "water_context"
  | "aqueduct_water_risk"
  | "grid_capacity_verification"
  | "fiber_capacity_verification"
  | "cooling_feasibility_verification"
  | "zoning_verification"
  | "permitting_status"
  | "construction_readiness"
  | "ai_readiness_assessment"
  | "fiber_corridors"
  | "flood_risk"
  | "heat_risk"
  | "water_availability"
  | "zoning"
  | "protected_land"
  | "population_density"
  | "workforce_readiness"
  | "digital_access_gap"
  | "ai_literacy_gap";

export interface InfrastructureLayerConfig {
  id: InfrastructureLayerId;
  label: string;
  category: InfrastructureLayerCategory;
  dataType: InfrastructureLayerDataType;
  status: InfrastructureLayerStatus;
  source: string;
  sourceType: InfrastructureLayerSourceType;
  sourceConfidence: "low" | "medium" | "high";
  dataCompleteness: "unknown" | "partial" | "good";
  description: string;
  limitation: string;
  geoJsonPath: string;
  visibleByDefault: boolean;
  color: string;
}

export interface InfrastructureLayerRuntimeState {
  status: InfrastructureLayerStatus;
  featureCount?: number;
  message?: string;
}

export interface InfrastructureFeatureProperties {
  osm_id?: string;
  osm_type?: "node" | "way" | "relation" | string;
  name?: string;
  asset_type?: string;
  category?: string;
  source?: string;
  source_type?: InfrastructureLayerSourceType | string;
  source_confidence?: "low" | "medium" | "high" | string;
  data_completeness?: "unknown" | "partial" | "good" | string;
  data_limitation?: string;
  raw_tags?: Record<string, string>;
  [key: string]: unknown;
}

export type InfrastructureFeatureCollection = FeatureCollection<
  Geometry,
  InfrastructureFeatureProperties
>;

const openStreetMapLimitation =
  "OpenStreetMap data may be incomplete or outdated and must be validated before planning or investment decisions.";

const openDataDefaults = {
  source: "OpenStreetMap",
  sourceType: "open_data" as const,
  sourceConfidence: "medium" as const,
  dataCompleteness: "unknown" as const,
  limitation: openStreetMapLimitation,
};

const syntheticVerificationLimitation =
  "Synthetic demo data only. Not utility, provider, authority, engineering, permit, construction, or investment evidence.";

const syntheticVerificationDefaults = {
  source: "Synthetic demo dataset",
  sourceType: "synthetic" as const,
  sourceConfidence: "low" as const,
  dataCompleteness: "partial" as const,
  status: "available" as const,
  visibleByDefault: false,
  limitation: syntheticVerificationLimitation,
};

const syntheticExternalLimitation =
  "Synthetic demo data only. Useful for UI exploration, but not provider, authority, engineering, permit, or investment evidence.";

const syntheticExternalDefaults = {
  source: "Synthetic demo dataset",
  sourceType: "synthetic" as const,
  sourceConfidence: "low" as const,
  dataCompleteness: "partial" as const,
  status: "available" as const,
  visibleByDefault: false,
  limitation: syntheticExternalLimitation,
};

export const infrastructureLayers: InfrastructureLayerConfig[] = [
  {
    id: "power_plants",
    label: "Power plants",
    category: "power",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped electricity generation sites from OpenStreetMap. Useful as an early visual proxy for nearby energy infrastructure.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/power_plants.geojson`,
    visibleByDefault: true,
    color: "#f97316",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify generation capacity, grid access, interconnection rights, or construction readiness.",
  },
  {
    id: "wri_power_plants",
    label: "Synthetic power capacity",
    category: "power",
    dataType: "point",
    description:
      "Demo power-generation capacity points used when a WRI or utility capacity source is not available.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/wri_power_plants.geojson`,
    color: "#fdba74",
    ...syntheticExternalDefaults,
    limitation:
      "Synthetic demo data only. Does not verify grid capacity, substation capacity, interconnection rights, or utility approval.",
  },
  {
    id: "substations",
    label: "Substations",
    category: "power",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped substations from OpenStreetMap. Useful for visual inspection of possible grid-adjacent areas.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/substations.geojson`,
    visibleByDefault: true,
    color: "#facc15",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify grid capacity, available load, connection feasibility, or utility approval.",
  },
  {
    id: "transmission_lines",
    label: "Transmission lines",
    category: "power",
    dataType: "line",
    status: "available",
    description:
      "Mapped power transmission lines from OpenStreetMap. Useful for early grid-context inspection.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/transmission_lines.geojson`,
    visibleByDefault: true,
    color: "#fb7185",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify line voltage, spare capacity, right-of-way access, or interconnection feasibility.",
  },
  {
    id: "telecom_assets",
    label: "Telecom assets",
    category: "network",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped telecom masts, communication towers, and telecom-tagged assets from OpenStreetMap.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/telecom_assets.geojson`,
    visibleByDefault: true,
    color: "#38bdf8",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify fibre availability, bandwidth, latency, redundancy, or service contracts.",
  },
  {
    id: "opencellid_cell_sites",
    label: "Synthetic cellular observations",
    category: "network",
    dataType: "point",
    description:
      "Demo cellular-observation points used when an OpenCelliD export is not available.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/opencellid_cell_sites.geojson`,
    color: "#06b6d4",
    ...syntheticExternalDefaults,
    limitation:
      "Synthetic demo data only. Does not verify fibre routes, bandwidth, latency, redundancy, coverage guarantees, or service contracts.",
  },
  {
    id: "ookla_fixed_performance",
    label: "Synthetic fixed network performance",
    category: "network",
    dataType: "polygon",
    description:
      "Demo fixed-network speed and latency tiles used when Ookla Open Data has not been loaded.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/ookla_fixed_performance.geojson`,
    color: "#2563eb",
    ...syntheticExternalDefaults,
    limitation:
      "Synthetic demo data only. Does not verify fibre routes, provider capacity, SLAs, redundancy, or site-level latency.",
  },
  {
    id: "ookla_mobile_performance",
    label: "Synthetic mobile network performance",
    category: "network",
    dataType: "polygon",
    description:
      "Demo mobile-network speed and latency tiles used when Ookla Open Data has not been loaded.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/ookla_mobile_performance.geojson`,
    color: "#7dd3fc",
    ...syntheticExternalDefaults,
    limitation:
      "Synthetic demo data only. Does not verify fibre routes, provider capacity, SLAs, redundancy, or site-level latency.",
  },
  {
    id: "peeringdb_facilities",
    label: "Interconnection facilities",
    category: "network",
    dataType: "point",
    status: "available",
    source: "PeeringDB",
    sourceType: "open_data",
    sourceConfidence: "medium",
    dataCompleteness: "unknown",
    description:
      "Public PeeringDB facility records clipped to the city bbox. Useful for internet interconnection and data-center ecosystem context.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/peeringdb_facilities.geojson`,
    visibleByDefault: false,
    color: "#14b8a6",
    limitation:
      "User-maintained interconnection context only. Does not verify fibre capacity, bandwidth, latency, redundancy, contracts, or service availability.",
  },
  {
    id: "peeringdb_exchanges",
    label: "Internet exchanges",
    category: "network",
    dataType: "point",
    status: "available",
    source: "PeeringDB",
    sourceType: "open_data",
    sourceConfidence: "medium",
    dataCompleteness: "unknown",
    description:
      "Public PeeringDB internet exchange records clipped to the city bbox where coordinates are available.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/peeringdb_exchanges.geojson`,
    visibleByDefault: false,
    color: "#5eead4",
    limitation:
      "User-maintained interconnection context only. Does not verify route diversity, physical fibre access, bandwidth, or latency.",
  },
  {
    id: "existing_data_centers",
    label: "Existing data centers",
    category: "network",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped data-center-like assets from OpenStreetMap where tagged. Useful as a weak open-data signal for existing compute infrastructure.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/existing_data_centers.geojson`,
    visibleByDefault: true,
    color: "#93c5fd",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. OSM data-center tags may be sparse, incomplete, or outdated and do not verify capacity, operator, security, or availability.",
  },
  {
    id: "tech_research_facilities",
    label: "Tech and research facilities",
    category: "innovation_capacity",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped research institutes, research offices, and IT-related facilities from OpenStreetMap.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/tech_research_facilities.geojson`,
    visibleByDefault: true,
    color: "#c084fc",
    ...openDataDefaults,
    limitation:
      "Innovation-capacity proxy only. Does not prove AI workforce depth, research quality, compute access, or institutional readiness.",
  },
  {
    id: "education_facilities",
    label: "Education facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped schools, universities, and colleges from OpenStreetMap. Useful for public-service demand context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/education_facilities.geojson`,
    visibleByDefault: true,
    color: "#a78bfa",
    ...openDataDefaults,
    limitation:
      "Demand-context layer only. Does not calculate AI readiness, digital access, adoption capacity, or education program maturity.",
  },
  {
    id: "healthcare_facilities",
    label: "Healthcare facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped hospitals and clinics from OpenStreetMap. Useful for public-service demand context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/healthcare_facilities.geojson`,
    visibleByDefault: true,
    color: "#34d399",
    ...openDataDefaults,
    limitation:
      "Demand-context layer only. Does not validate clinical data governance, health-system readiness, or safe healthcare AI use.",
  },
  {
    id: "government_facilities",
    label: "Government facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped government offices and town halls from OpenStreetMap. Useful for civic-service demand context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/government_facilities.geojson`,
    visibleByDefault: true,
    color: "#2dd4bf",
    ...openDataDefaults,
    limitation:
      "Demand-context layer only. Does not prove public-sector AI demand, procurement readiness, cybersecurity readiness, or institutional capacity.",
  },
  {
    id: "public_safety_facilities",
    label: "Public safety facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped police and fire stations from OpenStreetMap. Useful for civic operations and resilience context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/public_safety_facilities.geojson`,
    visibleByDefault: true,
    color: "#f87171",
    ...openDataDefaults,
    limitation:
      "Public-service context only. Does not validate emergency-service AI readiness, cybersecurity, dispatch systems, or operational capacity.",
  },
  {
    id: "industrial_zones",
    label: "Industrial zones",
    category: "land_environment",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped industrial land and industrial-tagged areas from OpenStreetMap. Useful for early physical-site context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/industrial_zones.geojson`,
    visibleByDefault: false,
    color: "#a3a3a3",
    ...openDataDefaults,
    limitation:
      "Land-context proxy only. Does not verify zoning, ownership, land availability, permitting, environmental constraints, or construction readiness.",
  },
  {
    id: "transport_corridors",
    label: "Transport corridors",
    category: "transport_logistics",
    dataType: "line",
    status: "available",
    description:
      "Mapped major roads and rail corridors from OpenStreetMap. Useful for logistics, access, and resilience context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/transport_corridors.geojson`,
    visibleByDefault: false,
    color: "#f59e0b",
    ...openDataDefaults,
    limitation:
      "Access-context proxy only. Does not verify right-of-way, construction access, traffic capacity, freight suitability, or logistics agreements.",
  },
  {
    id: "water_context",
    label: "Water context",
    category: "land_environment",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped waterways, reservoirs, and surface-water features from OpenStreetMap. Useful for environmental and cooling-context inspection.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/water_context.geojson`,
    visibleByDefault: false,
    color: "#22d3ee",
    ...openDataDefaults,
    limitation:
      "Water-context proxy only. Does not verify cooling feasibility, water rights, intake/discharge permits, flood risk, or environmental approval.",
  },
  {
    id: "aqueduct_water_risk",
    label: "Synthetic water-risk context",
    category: "land_environment",
    dataType: "polygon",
    description:
      "Demo water-risk screening zones used when WRI Aqueduct or local water-risk data is not available.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/aqueduct_water_risk.geojson`,
    color: "#0284c7",
    ...syntheticExternalDefaults,
    limitation:
      "Synthetic demo data only. Does not grant water rights, cooling rights, discharge approval, or environmental clearance.",
  },
  {
    id: "grid_capacity_verification",
    label: "Synthetic grid capacity",
    category: "verification",
    dataType: "mixed",
    description:
      "Demo grid-capacity scenarios for frontend exploration when utility-confirmed capacity data is unavailable.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/grid_capacity_verification.geojson`,
    color: "#fbbf24",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs utility or grid-operator data to verify available load, voltage, interconnection rights, or approval.",
  },
  {
    id: "fiber_capacity_verification",
    label: "Synthetic fibre capacity",
    category: "verification",
    dataType: "mixed",
    description:
      "Demo fibre-route, POP, redundancy, bandwidth, and latency scenarios for frontend exploration.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/fiber_capacity_verification.geojson`,
    color: "#60a5fa",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs telecom provider, IXP, or official broadband data to verify fibre, bandwidth, latency, or redundancy.",
  },
  {
    id: "cooling_feasibility_verification",
    label: "Synthetic cooling feasibility",
    category: "verification",
    dataType: "mixed",
    description:
      "Demo water, heat, cooling, flood, and environmental feasibility scenarios for frontend exploration.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/cooling_feasibility_verification.geojson`,
    color: "#22d3ee",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs hydrology, climate, environmental, and engineering data to verify cooling rights or feasibility.",
  },
  {
    id: "zoning_verification",
    label: "Synthetic zoning",
    category: "verification",
    dataType: "polygon",
    description:
      "Demo zoning, land-use, restricted-area, and protected-land scenarios for AI infrastructure siting exploration.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/zoning_verification.geojson`,
    color: "#d6d3d1",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs official planning or cadastral data to verify legal zoning, ownership, or land availability.",
  },
  {
    id: "permitting_status",
    label: "Synthetic permitting status",
    category: "verification",
    dataType: "mixed",
    description:
      "Demo permit, environmental review, consultation, and approval-status scenarios for frontend exploration.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/permitting_status.geojson`,
    color: "#fb7185",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs permit portal, agency, or uploaded document evidence to verify approval status.",
  },
  {
    id: "construction_readiness",
    label: "Synthetic construction readiness",
    category: "verification",
    dataType: "mixed",
    description:
      "Demo site-package scenarios covering land control, geotechnical review, utilities, access, environmental review, and procurement readiness.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/construction_readiness.geojson`,
    color: "#34d399",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs engineering, legal, environmental, procurement, and public-review evidence before construction-readiness claims.",
  },
  {
    id: "ai_readiness_assessment",
    label: "Synthetic AI readiness",
    category: "verification",
    dataType: "polygon",
    description:
      "Demo AI-readiness scenarios for workforce, digital access, data governance, cybersecurity, and adoption-capacity exploration.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/ai_readiness_assessment.geojson`,
    color: "#c084fc",
    ...syntheticVerificationDefaults,
    limitation:
      "Synthetic demo data only. Needs survey, governance, workforce, cybersecurity, and institutional evidence before AI-readiness claims.",
  },
  {
    id: "fiber_corridors",
    label: "Synthetic fibre corridors",
    category: "network",
    dataType: "line",
    description:
      "Demo fibre-corridor routes for AI infrastructure connectivity exploration.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/fiber_corridors.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#60a5fa",
    limitation:
      "Synthetic demo data only. Does not verify provider fibre routes, capacity, redundancy, latency, or service contracts.",
  },
  {
    id: "flood_risk",
    label: "Synthetic flood risk",
    category: "risk_land",
    dataType: "polygon",
    description:
      "Demo flood-risk review zones for cooling, construction, and resilience screening.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/flood_risk.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#0ea5e9",
    limitation:
      "Synthetic demo data only. Does not replace official flood models, engineering review, insurance review, or permits.",
  },
  {
    id: "heat_risk",
    label: "Synthetic heat risk",
    category: "risk_land",
    dataType: "polygon",
    description:
      "Demo heat-risk zones for early cooling-load and thermal-resilience screening.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/heat_risk.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#f97316",
    limitation:
      "Synthetic demo data only. Does not replace satellite heat analysis, climate data, or cooling engineering.",
  },
  {
    id: "water_availability",
    label: "Synthetic water availability",
    category: "risk_land",
    dataType: "point",
    description:
      "Demo water-availability review points for cooling feasibility exploration.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/water_availability.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#22d3ee",
    limitation:
      "Synthetic demo data only. Does not verify water rights, utility capacity, discharge approval, or cooling feasibility.",
  },
  {
    id: "zoning",
    label: "Synthetic land zoning",
    category: "risk_land",
    dataType: "polygon",
    description:
      "Demo zoning and land-use context for AI infrastructure siting exploration.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/zoning.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#d6d3d1",
    limitation:
      "Synthetic demo data only. Does not verify legal zoning, land control, ownership, or permitted use.",
  },
  {
    id: "protected_land",
    label: "Synthetic protected land",
    category: "risk_land",
    dataType: "polygon",
    description:
      "Demo protected-land and environmental-buffer constraints for early screening.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/protected_land.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#84cc16",
    limitation:
      "Synthetic demo data only. Does not verify legal protected status, environmental clearance, or permit constraints.",
  },
  {
    id: "population_density",
    label: "Synthetic population density",
    category: "ai_analysis",
    dataType: "polygon",
    description:
      "Demo population-density and service-demand zones for AI public-service planning.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/population_density.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#f472b6",
    limitation:
      "Synthetic demo data only. Does not replace census, household survey, or official demographic data.",
  },
  {
    id: "workforce_readiness",
    label: "Synthetic workforce readiness",
    category: "ai_analysis",
    dataType: "point",
    description:
      "Demo workforce-readiness nodes for AI talent and operations planning.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/workforce_readiness.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#c084fc",
    limitation:
      "Synthetic demo data only. Does not replace labor statistics, employer evidence, education data, or surveys.",
  },
  {
    id: "digital_access_gap",
    label: "Synthetic digital access gap",
    category: "ai_analysis",
    dataType: "polygon",
    description:
      "Demo digital-access gap zones for public-service AI equity screening.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/digital_access_gap.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#818cf8",
    limitation:
      "Synthetic demo data only. Does not replace broadband authority data, telecom provider evidence, or household surveys.",
  },
  {
    id: "ai_literacy_gap",
    label: "Synthetic AI literacy gap",
    category: "ai_analysis",
    dataType: "polygon",
    description:
      "Demo AI-literacy training demand zones for adoption and capacity planning.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/ai_literacy_gap.geojson`,
    ...syntheticExternalDefaults,
    visibleByDefault: false,
    color: "#f0abfc",
    limitation:
      "Synthetic demo data only. Does not replace education, workforce, institutional, or survey evidence.",
  },
];

export const availableInfrastructureLayers = infrastructureLayers.filter(
  (layer) => layer.status === "available"
);

export const plannedInfrastructureLayers = infrastructureLayers.filter(
  (layer) => layer.status === "planned"
);

export const defaultVisibleInfrastructureLayerIds = availableInfrastructureLayers
  .filter((layer) => layer.visibleByDefault)
  .map((layer) => layer.id);

export const infrastructureLayersById = infrastructureLayers.reduce(
  (accumulator, layer) => {
    accumulator[layer.id] = layer;
    return accumulator;
  },
  {} as Record<InfrastructureLayerId, InfrastructureLayerConfig>
);

export const infrastructureCategoryLabels: Record<
  InfrastructureLayerCategory,
  string
> = {
  power: "Power Infrastructure",
  network: "Network Infrastructure",
  public_service: "Public-Service Infrastructure",
  innovation_capacity: "Innovation and Human Capacity",
  land_environment: "Land, Water, and Environmental Context",
  transport_logistics: "Transport and Logistics Context",
  verification: "Verification Data Requirements",
  risk_land: "Synthetic Risk and Land Layers",
  ai_analysis: "Synthetic AI Analysis Layers",
};
