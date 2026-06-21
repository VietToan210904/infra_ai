#!/usr/bin/env python3
"""Validate authority/provider verification GeoJSON before frontend serving.

This script checks the project-specific metadata that separates verified
planning evidence from open-data proxy layers. It does not certify the source;
human review still has to confirm that the provider, agency, document, or
engineering evidence is legitimate.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


EXPECTED_FILES = (
    "grid_capacity_verification.geojson",
    "fiber_capacity_verification.geojson",
    "cooling_feasibility_verification.geojson",
    "zoning_verification.geojson",
    "permitting_status.geojson",
    "construction_readiness.geojson",
    "ai_readiness_assessment.geojson",
)

REQUIRED_PROPERTIES = (
    "asset_type",
    "source",
    "source_type",
    "source_confidence",
    "data_completeness",
    "data_limitation",
    "verification_status",
    "evidence_source",
    "evidence_type",
)

VALID_SOURCE_TYPES = {"authoritative", "authoritative_planned", "user_uploaded"}
VALID_CONFIDENCE = {"low", "medium", "high"}
VALID_COMPLETENESS = {"unknown", "partial", "good"}
VALID_VERIFICATION_STATUS = {
    "verified",
    "partial",
    "needs_review",
    "rejected",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate verification GeoJSON files for InfraAI SiteCompass."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/processed/verification/hcmc"),
        help="Directory containing verification GeoJSON files.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Require all expected verification GeoJSON files to exist.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.input.exists():
        print(f"[validate] Input directory does not exist: {args.input}")
        return 1

    errors: list[str] = []
    files = sorted(args.input.glob("*.geojson"))

    if args.strict:
        existing_names = {path.name for path in files}
        for expected_file in EXPECTED_FILES:
            if expected_file not in existing_names:
                errors.append(f"Missing expected file: {expected_file}")

    if not files:
        errors.append(f"No .geojson files found in {args.input}")

    for path in files:
        validate_file(path, errors)

    if errors:
        print("[validate] Verification GeoJSON validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"[validate] Validated {len(files)} verification GeoJSON file(s).")
    return 0


def validate_file(path: Path, errors: list[str]) -> None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{path}: invalid JSON at line {exc.lineno}, column {exc.colno}")
        return

    if data.get("type") != "FeatureCollection":
        errors.append(f"{path}: root type must be FeatureCollection")
        return

    features = data.get("features")
    if not isinstance(features, list):
        errors.append(f"{path}: features must be an array")
        return

    for index, feature in enumerate(features):
        validate_feature(path, index, feature, errors)


def validate_feature(
    path: Path,
    index: int,
    feature: Any,
    errors: list[str],
) -> None:
    label = f"{path}: feature {index}"

    if not isinstance(feature, dict) or feature.get("type") != "Feature":
        errors.append(f"{label}: must be a GeoJSON Feature")
        return

    geometry = feature.get("geometry")
    if not isinstance(geometry, dict) or not geometry.get("type"):
        errors.append(f"{label}: geometry is required")

    properties = feature.get("properties")
    if not isinstance(properties, dict):
        errors.append(f"{label}: properties object is required")
        return

    for property_name in REQUIRED_PROPERTIES:
        if properties.get(property_name) in (None, ""):
            errors.append(f"{label}: missing property {property_name}")

    source_type = properties.get("source_type")
    if source_type and source_type not in VALID_SOURCE_TYPES:
        errors.append(
            f"{label}: source_type must be one of {sorted(VALID_SOURCE_TYPES)}"
        )

    source_confidence = properties.get("source_confidence")
    if source_confidence and source_confidence not in VALID_CONFIDENCE:
        errors.append(
            f"{label}: source_confidence must be one of {sorted(VALID_CONFIDENCE)}"
        )

    data_completeness = properties.get("data_completeness")
    if data_completeness and data_completeness not in VALID_COMPLETENESS:
        errors.append(
            f"{label}: data_completeness must be one of {sorted(VALID_COMPLETENESS)}"
        )

    verification_status = properties.get("verification_status")
    if verification_status and verification_status not in VALID_VERIFICATION_STATUS:
        errors.append(
            f"{label}: verification_status must be one of "
            f"{sorted(VALID_VERIFICATION_STATUS)}"
        )


if __name__ == "__main__":
    raise SystemExit(main())
