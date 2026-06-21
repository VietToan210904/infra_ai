"""Small shared helpers for static GeoJSON ingestion scripts."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class BoundingBox:
    south: float
    west: float
    north: float
    east: float

    def contains(self, lat: float, lon: float) -> bool:
        return self.south <= lat <= self.north and self.west <= lon <= self.east

    def intersects(self, west: float, south: float, east: float, north: float) -> bool:
        return not (
            east < self.west
            or west > self.east
            or north < self.south
            or south > self.north
        )


CITY_BBOXES: dict[str, BoundingBox] = {
    "hcmc": BoundingBox(south=10.35, west=106.35, north=11.20, east=107.10),
}


def bbox_from_args(city: str, bbox: list[float] | None) -> BoundingBox:
    if bbox:
        return BoundingBox(*bbox)
    return CITY_BBOXES[city]


def is_number(value: Any) -> bool:
    return isinstance(value, int | float) and not isinstance(value, bool)


def parse_float(value: Any) -> float | None:
    if is_number(value):
        return float(value)
    if value in (None, ""):
        return None
    try:
        return float(str(value).strip())
    except ValueError:
        return None


def feature_collection(
    name: str,
    features: list[dict[str, Any]],
    metadata: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "name": name,
        "metadata": metadata,
        "features": features,
    }


def write_geojson(path: Path, collection: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(collection, file, ensure_ascii=False, indent=2)
        file.write("\n")
