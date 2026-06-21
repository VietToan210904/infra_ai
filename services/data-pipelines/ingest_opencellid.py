#!/usr/bin/env python3
"""Convert OpenCelliD CSV exports into HCMC GeoJSON."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from geojson_utils import bbox_from_args, feature_collection, parse_float, write_geojson


SOURCE_NAME = "OpenCelliD"
DEFAULT_LIMITATION = (
    "OpenCelliD provides community cellular observations. It does not verify "
    "fibre routes, bandwidth, latency, redundancy, coverage guarantees, or "
    "network service contracts."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert OpenCelliD CSV exports to GeoJSON."
    )
    parser.add_argument("--input", required=True, type=Path, help="OpenCelliD CSV.")
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
        default=Path("data/processed/external/hcmc/opencellid_cell_sites.geojson"),
        help="Output GeoJSON file.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bbox = bbox_from_args(args.city, args.bbox)

    features: list[dict[str, Any]] = []
    skipped = 0

    with args.input.open("r", encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            lat = parse_float(row.get("lat") or row.get("latitude"))
            lon = parse_float(row.get("lon") or row.get("longitude"))
            if lat is None or lon is None:
                skipped += 1
                continue
            if not bbox.contains(lat, lon):
                skipped += 1
                continue

            radio = row.get("radio") or ""
            cell = row.get("cell") or row.get("cellid") or ""
            features.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {
                        "source_id": cell,
                        "name": f"{radio} cell {cell}".strip() or "Cell site",
                        "asset_type": "Cellular network observation",
                        "category": "Network Infrastructure",
                        "source": SOURCE_NAME,
                        "source_type": "open_data",
                        "source_confidence": "low",
                        "data_completeness": "unknown",
                        "data_limitation": DEFAULT_LIMITATION,
                        "radio": radio,
                        "mcc": row.get("mcc") or "",
                        "network": row.get("net") or row.get("network") or "",
                        "area": row.get("area") or "",
                        "range_m": parse_float(row.get("range")),
                        "samples": parse_float(row.get("samples")),
                        "raw_record": row,
                    },
                }
            )

    write_geojson(
        args.output,
        feature_collection(
            "opencellid_cell_sites",
            features,
            {
                "source": SOURCE_NAME,
                "source_type": "open_data",
                "source_confidence": "low",
                "data_completeness": "unknown",
                "data_limitation": DEFAULT_LIMITATION,
            },
        ),
    )
    print(f"Saved {len(features)} feature(s) to {args.output} ({skipped} skipped)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
