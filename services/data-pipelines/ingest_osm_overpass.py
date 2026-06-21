#!/usr/bin/env python3
"""Ingest OpenStreetMap infrastructure layers with the Overpass API.

This script intentionally produces static GeoJSON for the frontend MVP. It does
not validate engineering capacity, grid interconnection rights, fibre
availability, zoning, permitting, water, cooling, or construction feasibility.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter"
DEFAULT_LIMITATION = (
    "OpenStreetMap data may be incomplete or outdated and must be validated "
    "before planning or investment decisions."
)


@dataclass(frozen=True)
class BoundingBox:
    south: float
    west: float
    north: float
    east: float

    def to_overpass(self) -> str:
        return f"{self.south},{self.west},{self.north},{self.east}"


@dataclass(frozen=True)
class LayerSpec:
    name: str
    output_file: str
    category: str
    filters: tuple[str, ...]
    force_line: bool = False


CITY_BBOXES: dict[str, BoundingBox] = {
    "hcmc": BoundingBox(south=10.35, west=106.35, north=11.20, east=107.10),
}


LAYER_SPECS: tuple[LayerSpec, ...] = (
    LayerSpec(
        name="power_plants",
        output_file="power_plants.geojson",
        category="Power Infrastructure",
        filters=('"power"="plant"',),
    ),
    LayerSpec(
        name="substations",
        output_file="substations.geojson",
        category="Power Infrastructure",
        filters=('"power"="substation"',),
    ),
    LayerSpec(
        name="transmission_lines",
        output_file="transmission_lines.geojson",
        category="Power Infrastructure",
        filters=('"power"="line"',),
        force_line=True,
    ),
    LayerSpec(
        name="telecom_assets",
        output_file="telecom_assets.geojson",
        category="Network Infrastructure",
        filters=('"man_made"="mast"', '"tower:type"="communication"', '"telecom"'),
    ),
    LayerSpec(
        name="existing_data_centers",
        output_file="existing_data_centers.geojson",
        category="Core AI Infrastructure",
        filters=(
            '"telecom"="data_center"',
            '"building"="data_center"',
            '"man_made"="data_center"',
        ),
    ),
    LayerSpec(
        name="tech_research_facilities",
        output_file="tech_research_facilities.geojson",
        category="Innovation and Human Capacity",
        filters=(
            '"amenity"="research_institute"',
            '"office"="research"',
            '"office"="it"',
            '"craft"="electronics_repair"',
        ),
    ),
    LayerSpec(
        name="education_facilities",
        output_file="education_facilities.geojson",
        category="Public-Service Infrastructure",
        filters=(
            '"amenity"="school"',
            '"amenity"="university"',
            '"amenity"="college"',
        ),
    ),
    LayerSpec(
        name="healthcare_facilities",
        output_file="healthcare_facilities.geojson",
        category="Public-Service Infrastructure",
        filters=('"amenity"="hospital"', '"amenity"="clinic"'),
    ),
    LayerSpec(
        name="government_facilities",
        output_file="government_facilities.geojson",
        category="Public-Service Infrastructure",
        filters=('"office"="government"', '"amenity"="townhall"'),
    ),
    LayerSpec(
        name="public_safety_facilities",
        output_file="public_safety_facilities.geojson",
        category="Public-Service Infrastructure",
        filters=('"amenity"="police"', '"amenity"="fire_station"'),
    ),
    LayerSpec(
        name="industrial_zones",
        output_file="industrial_zones.geojson",
        category="Land and Physical Context",
        filters=('"landuse"="industrial"', '"industrial"'),
    ),
    LayerSpec(
        name="transport_corridors",
        output_file="transport_corridors.geojson",
        category="Transport and Logistics Context",
        filters=(
            '"highway"="motorway"',
            '"highway"="trunk"',
            '"highway"="primary"',
            '"railway"="rail"',
        ),
        force_line=True,
    ),
    LayerSpec(
        name="water_context",
        output_file="water_context.geojson",
        category="Water and Cooling Context",
        filters=(
            '"natural"="water"',
            '"water"="reservoir"',
            '"landuse"="reservoir"',
            '"waterway"="river"',
            '"waterway"="canal"',
        ),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch OSM infrastructure layers from Overpass and save GeoJSON."
    )
    parser.add_argument(
        "--city",
        default="hcmc",
        choices=sorted(CITY_BBOXES),
        help="Named city config to use when --bbox is not provided.",
    )
    parser.add_argument(
        "--bbox",
        nargs=4,
        type=float,
        metavar=("SOUTH", "WEST", "NORTH", "EAST"),
        help="Custom bounding box in south west north east order.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output directory for GeoJSON files.",
    )
    parser.add_argument(
        "--overpass-url",
        default=DEFAULT_OVERPASS_URL,
        help="Overpass API interpreter URL.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="HTTP timeout in seconds for each Overpass request.",
    )
    parser.add_argument(
        "--layers",
        nargs="+",
        choices=[layer.name for layer in LAYER_SPECS],
        help="Optional subset of layer names to fetch.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bbox = (
        BoundingBox(*args.bbox)
        if args.bbox
        else CITY_BBOXES[args.city]
    )
    output_dir = args.output or Path("data/processed/osm") / args.city
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"OSM Overpass ingest bbox: {bbox.to_overpass()}")
    print(f"Output directory: {output_dir}")

    successes = 0
    failures = 0
    selected_layers = [
        layer for layer in LAYER_SPECS if not args.layers or layer.name in args.layers
    ]

    for layer in selected_layers:
        try:
            print(f"\nFetching {layer.name}...")
            query = build_overpass_query(layer, bbox)
            payload = fetch_overpass(
                query=query,
                overpass_url=args.overpass_url,
                timeout=args.timeout,
            )
            collection, skipped = convert_overpass_to_geojson(payload, layer)
            output_path = output_dir / layer.output_file
            write_geojson(output_path, collection)
            print(
                f"Saved {len(collection['features'])} features to {output_path}"
                + (f" ({skipped} skipped)" if skipped else "")
            )
            successes += 1
        except Exception as exc:  # noqa: BLE001 - keep batch ingestion resilient.
            failures += 1
            print(f"ERROR: {layer.name} failed: {exc}", file=sys.stderr)
            continue

    print(f"\nComplete. Successful layers: {successes}. Failed layers: {failures}.")
    return 0 if successes else 1


def build_overpass_query(layer: LayerSpec, bbox: BoundingBox) -> str:
    bbox_text = bbox.to_overpass()
    selectors: list[str] = []

    for osm_type in ("node", "way", "relation"):
        for tag_filter in layer.filters:
            selectors.append(f"  {osm_type}[{tag_filter}]({bbox_text});")

    return "\n".join(
        [
            "[out:json][timeout:120];",
            "(",
            *selectors,
            ");",
            "out body geom;",
        ]
    )


def fetch_overpass(query: str, overpass_url: str, timeout: int) -> dict[str, Any]:
    encoded = urlencode({"data": query}).encode("utf-8")
    request = Request(
        overpass_url,
        data=encoded,
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "User-Agent": "InfraAI-SiteCompass/0.1 open-data-planning-demo",
        },
        method="POST",
    )

    last_error: Exception | None = None

    for attempt in range(2):
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt == 0:
                print(f"Temporary Overpass failure, retrying once: {exc}")
                time.sleep(3)
                continue

    raise RuntimeError(f"Overpass request failed after retry: {last_error}")


def convert_overpass_to_geojson(
    payload: dict[str, Any],
    layer: LayerSpec,
) -> tuple[dict[str, Any], int]:
    elements = payload.get("elements", [])
    if not isinstance(elements, list):
        raise ValueError("Overpass response did not include an elements list")

    features: list[dict[str, Any]] = []
    skipped = 0

    for element in elements:
        try:
            feature = element_to_feature(element, layer)
        except ValueError as exc:
            skipped += 1
            print(f"  Skipping invalid {layer.name} element: {exc}")
            continue

        if feature is None:
            skipped += 1
            continue

        features.append(feature)

    return (
        {
            "type": "FeatureCollection",
            "name": layer.name,
            "metadata": {
                "source": "OpenStreetMap",
                "source_type": "open_data",
                "source_confidence": "medium",
                "data_completeness": "unknown",
                "data_limitation": DEFAULT_LIMITATION,
            },
            "features": features,
        },
        skipped,
    )


def element_to_feature(
    element: dict[str, Any],
    layer: LayerSpec,
) -> dict[str, Any] | None:
    osm_type = element.get("type")
    osm_id = element.get("id")
    tags = element.get("tags") or {}

    if not isinstance(tags, dict):
        tags = {}

    geometry = geometry_from_element(element, force_line=layer.force_line)
    if geometry is None:
        return None

    return {
        "type": "Feature",
        "properties": {
            "osm_id": str(osm_id),
            "osm_type": osm_type,
            "name": tags.get("name") or tags.get("operator") or "",
            "asset_type": determine_asset_type(tags, layer),
            "category": layer.category,
            "source": "OpenStreetMap",
            "source_type": "open_data",
            "source_confidence": "medium",
            "data_completeness": "unknown",
            "data_limitation": DEFAULT_LIMITATION,
            "raw_tags": tags,
        },
        "geometry": geometry,
    }


def geometry_from_element(
    element: dict[str, Any],
    force_line: bool,
) -> dict[str, Any] | None:
    osm_type = element.get("type")

    if osm_type == "node":
        lat = element.get("lat")
        lon = element.get("lon")
        if not is_number(lat) or not is_number(lon):
            raise ValueError("node missing lat/lon")
        return {"type": "Point", "coordinates": [lon, lat]}

    if osm_type == "way":
        return geometry_from_way_geometry(element.get("geometry"), force_line)

    if osm_type == "relation":
        return geometry_from_relation_members(element.get("members"), force_line)

    raise ValueError(f"unknown OSM element type {osm_type}")


def geometry_from_way_geometry(
    geometry: Any,
    force_line: bool,
) -> dict[str, Any] | None:
    coords = coordinates_from_overpass_geometry(geometry)
    if len(coords) < 2:
        return None

    if not force_line and len(coords) >= 4 and coords[0] == coords[-1]:
        return {"type": "Polygon", "coordinates": [coords]}

    return {"type": "LineString", "coordinates": coords}


def geometry_from_relation_members(
    members: Any,
    force_line: bool,
) -> dict[str, Any] | None:
    if not isinstance(members, list):
        return None

    closed_rings: list[list[list[float]]] = []
    line_parts: list[list[list[float]]] = []

    for member in members:
        if not isinstance(member, dict) or member.get("type") != "way":
            continue

        coords = coordinates_from_overpass_geometry(member.get("geometry"))
        if len(coords) < 2:
            continue

        if not force_line and len(coords) >= 4 and coords[0] == coords[-1]:
            closed_rings.append(coords)
        else:
            line_parts.append(coords)

    if closed_rings and not force_line:
        if len(closed_rings) == 1:
            return {"type": "Polygon", "coordinates": [closed_rings[0]]}
        return {
            "type": "MultiPolygon",
            "coordinates": [[ring] for ring in closed_rings],
        }

    if len(line_parts) == 1:
        return {"type": "LineString", "coordinates": line_parts[0]}

    if len(line_parts) > 1:
        return {"type": "MultiLineString", "coordinates": line_parts}

    return None


def coordinates_from_overpass_geometry(geometry: Any) -> list[list[float]]:
    if not isinstance(geometry, list):
        return []

    coords: list[list[float]] = []
    for point in geometry:
        if not isinstance(point, dict):
            continue
        lat = point.get("lat")
        lon = point.get("lon")
        if is_number(lat) and is_number(lon):
            coords.append([lon, lat])

    return coords


def determine_asset_type(tags: dict[str, Any], layer: LayerSpec) -> str:
    if layer.name == "power_plants":
        return "Power plant"
    if layer.name == "substations":
        return "Substation"
    if layer.name == "transmission_lines":
        return "Transmission line"
    if layer.name == "telecom_assets":
        if tags.get("tower:type") == "communication":
            return "Communication tower"
        if tags.get("man_made") == "mast":
            return "Telecom mast"
        return f"Telecom asset{(': ' + str(tags['telecom'])) if tags.get('telecom') else ''}"
    if layer.name == "existing_data_centers":
        return "Mapped data center"
    if layer.name == "tech_research_facilities":
        if tags.get("amenity") == "research_institute":
            return "Research institute"
        if tags.get("office") == "it":
            return "IT office"
        if tags.get("office") == "research":
            return "Research office"
        return "Technology support facility"
    if layer.name == "education_facilities":
        amenity = tags.get("amenity")
        if amenity == "university":
            return "University"
        if amenity == "college":
            return "College"
        return "School"
    if layer.name == "healthcare_facilities":
        return "Hospital" if tags.get("amenity") == "hospital" else "Clinic"
    if layer.name == "government_facilities":
        return "Town hall" if tags.get("amenity") == "townhall" else "Government office"
    if layer.name == "public_safety_facilities":
        return "Fire station" if tags.get("amenity") == "fire_station" else "Police facility"
    if layer.name == "industrial_zones":
        return "Industrial zone"
    if layer.name == "transport_corridors":
        if tags.get("railway") == "rail":
            return "Rail corridor"
        return f"{str(tags.get('highway', 'transport')).replace('_', ' ').title()} corridor"
    if layer.name == "water_context":
        if tags.get("waterway"):
            return f"{str(tags['waterway']).replace('_', ' ').title()} waterway"
        return "Surface water feature"

    return layer.name.replace("_", " ").title()


def write_geojson(path: Path, collection: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(collection, file, ensure_ascii=False, indent=2)
        file.write("\n")


def is_number(value: Any) -> bool:
    return isinstance(value, int | float)


if __name__ == "__main__":
    raise SystemExit(main())
