#!/usr/bin/env python3
"""Convert WRI Global Power Plant Database CSV/ZIP into HCMC GeoJSON."""

from __future__ import annotations

import argparse
import csv
import io
import zipfile
from pathlib import Path
from typing import Any, Iterable

from geojson_utils import bbox_from_args, feature_collection, parse_float, write_geojson


SOURCE_NAME = "WRI Global Power Plant Database"
DEFAULT_LIMITATION = (
    "WRI power plant records provide generation-facility context. They do not "
    "verify grid capacity, substation capacity, interconnection rights, utility "
    "approval, or construction readiness."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert WRI Global Power Plant Database CSV/ZIP to GeoJSON."
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Path to WRI CSV or ZIP containing a CSV.",
    )
    parser.add_argument("--city", default="hcmc", choices=["hcmc"])
    parser.add_argument(
        "--bbox",
        nargs=4,
        type=float,
        metavar=("SOUTH", "WEST", "NORTH", "EAST"),
        help="Custom bbox in south west north east order.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/processed/external/hcmc/wri_power_plants.geojson"),
        help="Output GeoJSON file.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bbox = bbox_from_args(args.city, args.bbox)

    rows = read_csv_rows(args.input)
    features: list[dict[str, Any]] = []
    skipped = 0

    for row in rows:
        lat = parse_float(row.get("latitude"))
        lon = parse_float(row.get("longitude"))
        if lat is None or lon is None:
            skipped += 1
            continue
        if not bbox.contains(lat, lon):
            skipped += 1
            continue

        country = str(row.get("country") or "").upper()
        if country and country not in {"VNM", "VN", "VIETNAM", "VIET NAM"}:
            skipped += 1
            continue

        capacity_mw = parse_float(row.get("capacity_mw"))
        primary_fuel = row.get("primary_fuel") or ""
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "source_id": row.get("gppd_idnr") or row.get("wepp_id") or "",
                    "name": row.get("name") or "Unnamed power plant",
                    "asset_type": "Power plant",
                    "category": "Power Infrastructure",
                    "source": SOURCE_NAME,
                    "source_type": "open_data",
                    "source_confidence": "medium",
                    "data_completeness": "partial",
                    "data_limitation": DEFAULT_LIMITATION,
                    "capacity_mw": capacity_mw,
                    "primary_fuel": primary_fuel,
                    "commissioning_year": row.get("commissioning_year") or "",
                    "owner": row.get("owner") or "",
                    "geolocation_source": row.get("geolocation_source") or "",
                    "raw_record": row,
                },
            }
        )

    write_geojson(
        args.output,
        feature_collection(
            "wri_power_plants",
            features,
            {
                "source": SOURCE_NAME,
                "source_type": "open_data",
                "source_confidence": "medium",
                "data_completeness": "partial",
                "data_limitation": DEFAULT_LIMITATION,
            },
        ),
    )
    print(f"Saved {len(features)} feature(s) to {args.output} ({skipped} skipped)")
    return 0


def read_csv_rows(path: Path) -> Iterable[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(path)

    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            csv_names = [
                name for name in archive.namelist() if name.lower().endswith(".csv")
            ]
            if not csv_names:
                raise ValueError(f"No CSV file found inside {path}")
            with archive.open(csv_names[0]) as raw_file:
                text_file = io.TextIOWrapper(raw_file, encoding="utf-8-sig")
                yield from csv.DictReader(text_file)
        return

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        yield from csv.DictReader(file)


if __name__ == "__main__":
    raise SystemExit(main())
