"""GeoJSON evidence extraction for AI infrastructure readiness scoring."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.domain.readiness.scoring import clamp_score
from app.schemas.site import (
    ComponentScores,
    EvidenceSummary,
    ExcludedSyntheticLayer,
    MatchedEvidence,
    ScoreDriver,
)


REPO_ROOT = Path(__file__).resolve().parents[5]
PROCESSED_DATA_ROOT = REPO_ROOT / "data" / "processed"
PUBLIC_DATA_ROOT = REPO_ROOT / "apps" / "web" / "public" / "data"

EARTH_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class LayerSpec:
    layer_id: str
    label: str
    path: Path
    component: str | None
    source_type: str
    source_confidence: str
    data_completeness: str


@dataclass(frozen=True)
class LayerStats:
    layer: LayerSpec
    feature_count: int
    matched_count_3km: int
    matched_count_10km: int
    nearest_km: float | None
    nearest_relation: str
    nearest_feature: dict[str, Any] | None
    source_confidence: str
    data_completeness: str


LAYER_SPECS: dict[str, LayerSpec] = {
    "power_plants": LayerSpec(
        "power_plants",
        "Power plants",
        Path("osm/hcmc/power_plants.geojson"),
        "power",
        "open_data",
        "medium",
        "unknown",
    ),
    "substations": LayerSpec(
        "substations",
        "Substations",
        Path("osm/hcmc/substations.geojson"),
        "power",
        "open_data",
        "medium",
        "unknown",
    ),
    "transmission_lines": LayerSpec(
        "transmission_lines",
        "Transmission lines",
        Path("osm/hcmc/transmission_lines.geojson"),
        "power",
        "open_data",
        "medium",
        "unknown",
    ),
    "telecom_assets": LayerSpec(
        "telecom_assets",
        "Telecom assets",
        Path("osm/hcmc/telecom_assets.geojson"),
        "connectivity",
        "open_data",
        "medium",
        "unknown",
    ),
    "peeringdb_facilities": LayerSpec(
        "peeringdb_facilities",
        "Interconnection facilities",
        Path("external/hcmc/peeringdb_facilities.geojson"),
        "connectivity",
        "open_data",
        "medium",
        "unknown",
    ),
    "peeringdb_exchanges": LayerSpec(
        "peeringdb_exchanges",
        "Internet exchanges",
        Path("external/hcmc/peeringdb_exchanges.geojson"),
        "connectivity",
        "open_data",
        "medium",
        "unknown",
    ),
    "existing_data_centers": LayerSpec(
        "existing_data_centers",
        "Existing data centers",
        Path("osm/hcmc/existing_data_centers.geojson"),
        "computeEcosystem",
        "open_data",
        "medium",
        "unknown",
    ),
    "tech_research_facilities": LayerSpec(
        "tech_research_facilities",
        "Tech and research facilities",
        Path("osm/hcmc/tech_research_facilities.geojson"),
        "computeEcosystem",
        "open_data",
        "medium",
        "unknown",
    ),
    "education_facilities": LayerSpec(
        "education_facilities",
        "Education facilities",
        Path("osm/hcmc/education_facilities.geojson"),
        "sectorDemand",
        "open_data",
        "medium",
        "unknown",
    ),
    "healthcare_facilities": LayerSpec(
        "healthcare_facilities",
        "Healthcare facilities",
        Path("osm/hcmc/healthcare_facilities.geojson"),
        "sectorDemand",
        "open_data",
        "medium",
        "unknown",
    ),
    "government_facilities": LayerSpec(
        "government_facilities",
        "Government facilities",
        Path("osm/hcmc/government_facilities.geojson"),
        "sectorDemand",
        "open_data",
        "medium",
        "unknown",
    ),
    "public_safety_facilities": LayerSpec(
        "public_safety_facilities",
        "Public safety facilities",
        Path("osm/hcmc/public_safety_facilities.geojson"),
        "resilience",
        "open_data",
        "medium",
        "unknown",
    ),
    "industrial_zones": LayerSpec(
        "industrial_zones",
        "Industrial zones",
        Path("osm/hcmc/industrial_zones.geojson"),
        "physicalFeasibility",
        "open_data",
        "medium",
        "unknown",
    ),
    "transport_corridors": LayerSpec(
        "transport_corridors",
        "Transport corridors",
        Path("osm/hcmc/transport_corridors.geojson"),
        "physicalFeasibility",
        "open_data",
        "medium",
        "unknown",
    ),
    "water_context": LayerSpec(
        "water_context",
        "Water context",
        Path("osm/hcmc/water_context.geojson"),
        "coolingWater",
        "open_data",
        "medium",
        "unknown",
    ),
}

SYNTHETIC_LAYER_LABELS: dict[str, str] = {
    "wri_power_plants": "Synthetic power capacity",
    "opencellid_cell_sites": "Synthetic cellular observations",
    "ookla_fixed_performance": "Synthetic fixed network performance",
    "ookla_mobile_performance": "Synthetic mobile network performance",
    "aqueduct_water_risk": "Synthetic water-risk context",
    "grid_capacity_verification": "Synthetic grid capacity",
    "fiber_capacity_verification": "Synthetic fibre capacity",
    "cooling_feasibility_verification": "Synthetic cooling feasibility",
    "zoning_verification": "Synthetic zoning",
    "permitting_status": "Synthetic permitting status",
    "construction_readiness": "Synthetic construction readiness",
    "ai_readiness_assessment": "Synthetic AI readiness",
    "fiber_corridors": "Synthetic fibre corridors",
    "flood_risk": "Synthetic flood risk",
    "heat_risk": "Synthetic heat risk",
    "water_availability": "Synthetic water availability",
    "zoning": "Synthetic land zoning",
    "protected_land": "Synthetic protected land",
    "population_density": "Synthetic population density",
    "workforce_readiness": "Synthetic workforce readiness",
    "digital_access_gap": "Synthetic digital access gap",
    "ai_literacy_gap": "Synthetic AI literacy gap",
}

COMPONENT_BASELINES = {
    "power": 28,
    "connectivity": 30,
    "coolingWater": 30,
    "physicalFeasibility": 34,
    "computeEcosystem": 30,
    "sectorDemand": 40,
    "governance": 42,
    "digitalAccess": 38,
    "aiLiteracy": 36,
    "dataMaturity": 38,
    "equity": 38,
    "resilience": 36,
}

COMPONENT_LABELS = {
    "power": "Power and grid context",
    "connectivity": "Connectivity and interconnection",
    "coolingWater": "Cooling and water context",
    "physicalFeasibility": "Land, logistics, and physical feasibility",
    "computeEcosystem": "Compute and innovation ecosystem",
    "sectorDemand": "Civic sector demand",
    "governance": "Governance readiness proxy",
    "digitalAccess": "Digital access proxy",
    "aiLiteracy": "AI literacy proxy",
    "dataMaturity": "Data maturity proxy",
    "equity": "Equity and access proxy",
    "resilience": "Resilience and public safety proxy",
}


def build_evidence_grounded_scores(
    lat: float,
    lng: float,
    active_layers: list[str],
) -> tuple[
    ComponentScores,
    EvidenceSummary,
    list[ScoreDriver],
    list[MatchedEvidence],
    list[ExcludedSyntheticLayer],
    list[str],
]:
    """Build component scores from local real/open GeoJSON evidence."""
    selected_layers = active_layers
    real_layer_ids = [layer_id for layer_id in selected_layers if layer_id in LAYER_SPECS]
    excluded_synthetic = [
        ExcludedSyntheticLayer(
            layerId=layer_id,
            layerLabel=SYNTHETIC_LAYER_LABELS.get(layer_id, layer_id),
            reason="Synthetic layer excluded from numeric scoring; retained as planning context and uncertainty.",
        )
        for layer_id in selected_layers
        if layer_id in SYNTHETIC_LAYER_LABELS or layer_id.startswith("synthetic")
    ]

    layer_stats = [
        _analyze_layer(LAYER_SPECS[layer_id], lat, lng) for layer_id in real_layer_ids
    ]
    matched_evidence = _build_matched_evidence(layer_stats)
    component_scores = _component_scores_from_layers(layer_stats)
    score_drivers = _build_score_drivers(
        component_scores, layer_stats, excluded_synthetic
    )
    data_gaps = _build_data_gaps(real_layer_ids, excluded_synthetic, component_scores)
    evidence_summary = _build_evidence_summary(
        active_layer_count=len(selected_layers),
        layer_stats=layer_stats,
        matched_evidence=matched_evidence,
        excluded_synthetic=excluded_synthetic,
    )

    return (
        component_scores,
        evidence_summary,
        score_drivers,
        matched_evidence,
        excluded_synthetic,
        data_gaps,
    )


@lru_cache(maxsize=64)
def load_geojson_features(relative_path: str) -> list[dict[str, Any]]:
    """Load local GeoJSON features from processed data, falling back to public data."""
    processed_path = PROCESSED_DATA_ROOT / relative_path
    public_path = PUBLIC_DATA_ROOT / relative_path
    path = processed_path if processed_path.exists() else public_path
    if not path.exists():
        return []

    payload = json.loads(path.read_text(encoding="utf-8"))
    features = payload.get("features", [])
    return features if isinstance(features, list) else []


def _analyze_layer(layer: LayerSpec, lat: float, lng: float) -> LayerStats:
    features = load_geojson_features(layer.path.as_posix())
    nearest_feature: dict[str, Any] | None = None
    nearest_km: float | None = None
    nearest_relation = "not evaluated"
    matched_count_3km = 0
    matched_count_10km = 0
    confidence = layer.source_confidence
    completeness = layer.data_completeness

    for feature in features:
        geometry = feature.get("geometry")
        if not isinstance(geometry, dict):
            continue
        distance_km, relation = _distance_to_geometry_km(lat, lng, geometry)
        if distance_km is None:
            continue

        properties = feature.get("properties") if isinstance(feature.get("properties"), dict) else {}
        confidence = str(properties.get("source_confidence") or confidence)
        completeness = str(properties.get("data_completeness") or completeness)

        if distance_km <= 3:
            matched_count_3km += 1
        if distance_km <= 10:
            matched_count_10km += 1
        if nearest_km is None or distance_km < nearest_km:
            nearest_km = distance_km
            nearest_feature = feature
            nearest_relation = relation

    return LayerStats(
        layer=layer,
        feature_count=len(features),
        matched_count_3km=matched_count_3km,
        matched_count_10km=matched_count_10km,
        nearest_km=round(nearest_km, 2) if nearest_km is not None else None,
        nearest_relation=nearest_relation,
        nearest_feature=nearest_feature,
        source_confidence=confidence,
        data_completeness=completeness,
    )


def _component_scores_from_layers(layer_stats: list[LayerStats]) -> ComponentScores:
    direct_scores: dict[str, list[int]] = {}
    for stats in layer_stats:
        component = stats.layer.component
        if not component:
            continue
        direct_scores.setdefault(component, []).append(_layer_score(stats))

    values = dict(COMPONENT_BASELINES)
    for component, scores in direct_scores.items():
        if scores:
            values[component] = clamp_score(sum(scores) / len(scores))

    values["governance"] = clamp_score(
        values["governance"] * 0.45
        + values["sectorDemand"] * 0.30
        + _component_average(direct_scores, ["sectorDemand", "computeEcosystem"]) * 0.25
    )
    values["digitalAccess"] = clamp_score(
        values["digitalAccess"] * 0.35
        + values["connectivity"] * 0.50
        + values["sectorDemand"] * 0.15
    )
    values["aiLiteracy"] = clamp_score(
        values["aiLiteracy"] * 0.40
        + values["computeEcosystem"] * 0.35
        + values["sectorDemand"] * 0.25
    )
    values["dataMaturity"] = clamp_score(
        values["dataMaturity"] * 0.40
        + values["governance"] * 0.35
        + values["connectivity"] * 0.25
    )
    values["equity"] = clamp_score(
        values["equity"] * 0.45
        + values["sectorDemand"] * 0.35
        + values["digitalAccess"] * 0.20
    )
    values["resilience"] = clamp_score(
        values["resilience"] * 0.40
        + values.get("resilience", 36) * 0.25
        + values["physicalFeasibility"] * 0.20
        + values["power"] * 0.15
    )

    coverage_count = len({stats.layer.component for stats in layer_stats if stats.layer.component})
    scored_layer_count = len(layer_stats)
    nearest_values = [stats.nearest_km for stats in layer_stats if stats.nearest_km is not None]
    nearest = min(nearest_values) if nearest_values else None
    synthetic_penalty = 0
    coverage_score = clamp_score(35 + coverage_count * 7 + min(scored_layer_count, 12) * 2)
    proximity_score = 70 if nearest is not None and nearest <= 1 else 60 if nearest is not None and nearest <= 3 else 48

    values["dataCompleteness"] = clamp_score(coverage_score - synthetic_penalty)
    values["dataFreshness"] = 58
    values["sourceReliability"] = clamp_score(58 + min(scored_layer_count, 8) * 2)
    values["geographicResolution"] = clamp_score(
        (proximity_score * 0.55) + (coverage_score * 0.45)
    )

    return ComponentScores(**values)


def _component_average(scores: dict[str, list[int]], components: list[str]) -> int:
    values = [score for component in components for score in scores.get(component, [])]
    if not values:
        return 42
    return clamp_score(sum(values) / len(values))


def _layer_score(stats: LayerStats) -> int:
    nearest = stats.nearest_km
    if nearest is None:
        distance_score = 20
    elif nearest <= 0.25:
        distance_score = 88
    elif nearest <= 1:
        distance_score = 82
    elif nearest <= 3:
        distance_score = 72
    elif nearest <= 5:
        distance_score = 60
    elif nearest <= 10:
        distance_score = 48
    else:
        distance_score = 32

    density_score = min(stats.matched_count_3km * 5 + stats.matched_count_10km * 2, 24)
    quality_score = _metadata_score(stats.source_confidence, stats.data_completeness)
    return clamp_score(distance_score * 0.72 + density_score + quality_score)


def _metadata_score(confidence: str, completeness: str) -> int:
    confidence_score = {"high": 8, "medium": 5, "low": 2}.get(confidence, 3)
    completeness_score = {"good": 6, "partial": 3, "unknown": 1}.get(completeness, 1)
    return confidence_score + completeness_score


def _build_score_drivers(
    scores: ComponentScores,
    layer_stats: list[LayerStats],
    excluded_synthetic: list[ExcludedSyntheticLayer],
) -> list[ScoreDriver]:
    drivers: list[ScoreDriver] = []
    for component in COMPONENT_BASELINES:
        component_layers = [
            stats for stats in layer_stats if stats.layer.component == component
        ]
        supporting_layers = [stats.layer.label for stats in component_layers]
        nearest_values = [
            stats.nearest_km for stats in component_layers if stats.nearest_km is not None
        ]
        nearest = min(nearest_values) if nearest_values else None
        score = int(getattr(scores, component))
        explanation = _driver_explanation(component, score, component_layers, nearest)
        drivers.append(
            ScoreDriver(
                component=COMPONENT_LABELS[component],
                score=score,
                evidenceCount=sum(stats.matched_count_10km for stats in component_layers),
                nearestEvidenceKm=nearest,
                supportingLayers=supporting_layers,
                excludedSyntheticLayers=[
                    layer.layerLabel
                    for layer in excluded_synthetic
                    if _synthetic_component(layer.layerId) == component
                ],
                explanation=explanation,
            )
        )
    return drivers


def _driver_explanation(
    component: str,
    score: int,
    layer_stats: list[LayerStats],
    nearest: float | None,
) -> str:
    if not layer_stats:
        return (
            f"{COMPONENT_LABELS[component]} is scored from a conservative baseline "
            "because no active real/open evidence layer contributed to this component. "
            "Treat this as an evidence gap, not as proof that the component is absent "
            "or infeasible."
        )
    nearest_text = (
        f"nearest evidence is {nearest:.2f} km away"
        if nearest is not None
        else "nearest evidence could not be measured"
    )
    layer_names = ", ".join(stats.layer.label for stats in layer_stats)
    matched_count = sum(stats.matched_count_10km for stats in layer_stats)
    quality_text = _driver_quality_text(layer_stats)
    reason = _driver_score_reason(score)
    return (
        f"{COMPONENT_LABELS[component]} scored {score}/100 because {reason}. "
        f"Active real/open layers used: {layer_names}. The {nearest_text}, with "
        f"{matched_count} matched feature(s) within 10 km. {quality_text} "
        "Matched features show mapped proximity and coverage; they do not prove "
        "available capacity, service quality, land rights, permits, or feasibility."
    )


def _driver_score_reason(score: int) -> str:
    if score >= 80:
        return "nearby open-data evidence is strong for early planning"
    if score >= 65:
        return "nearby open-data evidence is useful but still partial"
    if score >= 45:
        return "evidence is limited, farther away, or incomplete"
    return "evidence is missing, weak, or only indirectly represented"


def _driver_quality_text(layer_stats: list[LayerStats]) -> str:
    confidence_values = sorted({stats.source_confidence for stats in layer_stats})
    completeness_values = sorted({stats.data_completeness for stats in layer_stats})
    return (
        "Source confidence: "
        f"{', '.join(confidence_values) or 'unknown'}; data completeness: "
        f"{', '.join(completeness_values) or 'unknown'}."
    )


def _build_matched_evidence(layer_stats: list[LayerStats]) -> list[MatchedEvidence]:
    matches: list[MatchedEvidence] = []
    for stats in layer_stats:
        if not stats.nearest_feature:
            continue
        properties = stats.nearest_feature.get("properties")
        if not isinstance(properties, dict):
            properties = {}
        geometry = stats.nearest_feature.get("geometry")
        geometry_type = geometry.get("type", "Unknown") if isinstance(geometry, dict) else "Unknown"
        name = str(properties.get("name") or stats.layer.label)
        matches.append(
            MatchedEvidence(
                layerId=stats.layer.layer_id,
                layerLabel=stats.layer.label,
                name=name,
                assetType=str(properties.get("asset_type") or "Unknown"),
                category=str(properties.get("category") or stats.layer.component or "Unknown"),
                source=str(properties.get("source") or "Unknown"),
                sourceType=str(properties.get("source_type") or stats.layer.source_type),
                sourceConfidence=str(
                    properties.get("source_confidence") or stats.source_confidence
                ),
                dataCompleteness=str(
                    properties.get("data_completeness") or stats.data_completeness
                ),
                geometryType=str(geometry_type),
                distanceKm=stats.nearest_km,
                relation=stats.nearest_relation,
                dataLimitation=str(
                    properties.get("data_limitation")
                    or "Open-data evidence must be validated before planning decisions."
                ),
            )
        )
    matches.sort(key=lambda item: item.distanceKm if item.distanceKm is not None else 9999)
    return matches[:18]


def _build_data_gaps(
    real_layer_ids: list[str],
    excluded_synthetic: list[ExcludedSyntheticLayer],
    scores: ComponentScores,
) -> list[str]:
    gaps: list[str] = []
    required_groups = {
        "power": {"power_plants", "substations", "transmission_lines"},
        "connectivity": {"telecom_assets", "peeringdb_facilities", "peeringdb_exchanges"},
        "sector demand": {
            "education_facilities",
            "healthcare_facilities",
            "government_facilities",
        },
        "physical feasibility": {"industrial_zones", "transport_corridors"},
        "cooling and water": {"water_context"},
    }
    layer_set = set(real_layer_ids)
    for group, layer_ids in required_groups.items():
        if not (layer_set & layer_ids):
            gaps.append(f"No active real/open {group} layer contributed to scoring.")

    if excluded_synthetic:
        gaps.append(
            f"{len(excluded_synthetic)} synthetic layer(s) were excluded from numeric scoring."
        )
    if scores.dataCompleteness < 65:
        gaps.append("Data completeness remains below the moderate threshold.")
    if scores.sourceReliability < 65:
        gaps.append("Source reliability still requires authoritative validation.")

    gaps.append(
        "Authoritative utility, telecom provider, zoning, permitting, land, environmental, and survey datasets are still required for decisions."
    )
    return gaps


def _build_evidence_summary(
    *,
    active_layer_count: int,
    layer_stats: list[LayerStats],
    matched_evidence: list[MatchedEvidence],
    excluded_synthetic: list[ExcludedSyntheticLayer],
) -> EvidenceSummary:
    nearest_values = [item.distanceKm for item in matched_evidence if item.distanceKm is not None]
    nearest = min(nearest_values) if nearest_values else None
    scored_layer_count = len(layer_stats)
    matched_feature_count = sum(stats.matched_count_10km for stats in layer_stats)
    if scored_layer_count == 0:
        summary = "No active real/open evidence layers contributed to the numeric score."
        confidence_impact = "Low reliability: scoring cannot be trusted beyond UI demonstration."
    else:
        summary = (
            f"{scored_layer_count} real/open layer(s) contributed to scoring with "
            f"{matched_feature_count} matched feature(s) within 10 km."
        )
        confidence_impact = (
            "Medium reliability for early planning; authoritative validation is still required."
        )
    if excluded_synthetic:
        summary += f" {len(excluded_synthetic)} synthetic layer(s) were excluded from scoring."

    return EvidenceSummary(
        activeLayerCount=active_layer_count,
        scoredLayerCount=scored_layer_count,
        realOpenLayerCount=scored_layer_count,
        syntheticLayerCount=len(excluded_synthetic),
        matchedFeatureCount=matched_feature_count,
        nearestEvidenceKm=nearest,
        summary=summary,
        confidenceImpact=confidence_impact,
    )


def _synthetic_component(layer_id: str) -> str | None:
    if "grid" in layer_id or "power" in layer_id:
        return "power"
    if "fiber" in layer_id or "ookla" in layer_id or "cell" in layer_id:
        return "connectivity"
    if "water" in layer_id or "cooling" in layer_id or "heat" in layer_id:
        return "coolingWater"
    if "zoning" in layer_id or "permitting" in layer_id or "construction" in layer_id:
        return "physicalFeasibility"
    if "workforce" in layer_id or "literacy" in layer_id:
        return "aiLiteracy"
    if "access" in layer_id:
        return "digitalAccess"
    return None


def _distance_to_geometry_km(
    lat: float,
    lng: float,
    geometry: dict[str, Any],
) -> tuple[float | None, str]:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if geometry_type == "Point":
        return _distance_to_coordinate_km(lat, lng, coordinates), "nearest point"
    if geometry_type == "MultiPoint":
        return _min_coordinate_distance(lat, lng, coordinates)
    if geometry_type == "LineString":
        return _distance_to_line_km(lat, lng, coordinates)
    if geometry_type == "MultiLineString":
        return _min_line_distance(lat, lng, coordinates)
    if geometry_type == "Polygon":
        return _distance_to_polygon_km(lat, lng, coordinates)
    if geometry_type == "MultiPolygon":
        return _min_polygon_distance(lat, lng, coordinates)
    return None, "unsupported geometry"


def _distance_to_coordinate_km(
    lat: float,
    lng: float,
    coordinate: Any,
) -> float | None:
    if not _is_coordinate(coordinate):
        return None
    return _haversine_km(lat, lng, float(coordinate[1]), float(coordinate[0]))


def _min_coordinate_distance(lat: float, lng: float, coordinates: Any) -> tuple[float | None, str]:
    distances = [
        distance
        for coordinate in coordinates or []
        if (distance := _distance_to_coordinate_km(lat, lng, coordinate)) is not None
    ]
    return (min(distances), "nearest point") if distances else (None, "nearest point")


def _distance_to_line_km(lat: float, lng: float, coordinates: Any) -> tuple[float | None, str]:
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        return None, "nearest line"
    distances = [
        _distance_to_segment_km(lat, lng, start, end)
        for start, end in zip(coordinates, coordinates[1:], strict=False)
        if _is_coordinate(start) and _is_coordinate(end)
    ]
    return (min(distances), "nearest line") if distances else (None, "nearest line")


def _min_line_distance(lat: float, lng: float, lines: Any) -> tuple[float | None, str]:
    distances = [
        distance
        for line in lines or []
        if (distance := _distance_to_line_km(lat, lng, line)[0]) is not None
    ]
    return (min(distances), "nearest line") if distances else (None, "nearest line")


def _distance_to_polygon_km(lat: float, lng: float, rings: Any) -> tuple[float | None, str]:
    if not isinstance(rings, list) or not rings:
        return None, "nearest polygon"
    exterior = rings[0]
    if _point_in_polygon(lng, lat, exterior):
        return 0.0, "inside polygon"
    return _distance_to_line_km(lat, lng, exterior)[0], "nearest polygon"


def _min_polygon_distance(lat: float, lng: float, polygons: Any) -> tuple[float | None, str]:
    distances = [
        distance
        for polygon in polygons or []
        if (distance := _distance_to_polygon_km(lat, lng, polygon)[0]) is not None
    ]
    return (min(distances), "polygon context") if distances else (None, "polygon context")


def _distance_to_segment_km(lat: float, lng: float, start: Any, end: Any) -> float:
    px, py = _project(lng, lat, lat)
    ax, ay = _project(float(start[0]), float(start[1]), lat)
    bx, by = _project(float(end[0]), float(end[1]), lat)
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    nearest_x = ax + t * dx
    nearest_y = ay + t * dy
    return math.hypot(px - nearest_x, py - nearest_y)


def _project(lng: float, lat: float, reference_lat: float) -> tuple[float, float]:
    x = math.radians(lng) * EARTH_RADIUS_KM * math.cos(math.radians(reference_lat))
    y = math.radians(lat) * EARTH_RADIUS_KM
    return x, y


def _haversine_km(lat_a: float, lng_a: float, lat_b: float, lng_b: float) -> float:
    delta_lat = math.radians(lat_b - lat_a)
    delta_lng = math.radians(lng_b - lng_a)
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(math.radians(lat_a))
        * math.cos(math.radians(lat_b))
        * math.sin(delta_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _point_in_polygon(lng: float, lat: float, ring: Any) -> bool:
    if not isinstance(ring, list) or len(ring) < 3:
        return False
    inside = False
    previous = ring[-1]
    for current in ring:
        if not (_is_coordinate(current) and _is_coordinate(previous)):
            previous = current
            continue
        x_i, y_i = float(current[0]), float(current[1])
        x_j, y_j = float(previous[0]), float(previous[1])
        intersects = (y_i > lat) != (y_j > lat) and lng < (
            (x_j - x_i) * (lat - y_i) / ((y_j - y_i) or 1e-12) + x_i
        )
        if intersects:
            inside = not inside
        previous = current
    return inside


def _is_coordinate(value: Any) -> bool:
    return (
        isinstance(value, list | tuple)
        and len(value) >= 2
        and isinstance(value[0], int | float)
        and isinstance(value[1], int | float)
    )
