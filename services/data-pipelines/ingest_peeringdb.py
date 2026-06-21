#!/usr/bin/env python3
"""Ingest PeeringDB facilities and internet exchanges into GeoJSON.

PeeringDB is useful context for network/data-center/interconnection ecosystems.
It does not verify fibre routes, bandwidth, latency, redundancy, contracts, or
service availability for a candidate site.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from geojson_utils import bbox_from_args, feature_collection, parse_float, write_geojson


DEFAULT_API_BASE = "https://www.peeringdb.com/api"
DEFAULT_LIMITATION = (
    "PeeringDB is user-maintained interconnection data. It does not verify "
    "site-level fibre capacity, bandwidth, latency, redundancy, contracts, or "
    "service availability."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch PeeringDB HCMC network facilities/exchanges as GeoJSON."
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
        default=Path("data/processed/external/hcmc"),
        help="Output directory.",
    )
    parser.add_argument("--api-base", default=DEFAULT_API_BASE)
    parser.add_argument("--timeout", type=int, default=60)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bbox = bbox_from_args(args.city, args.bbox)
    args.output.mkdir(parents=True, exist_ok=True)

    print(f"PeeringDB ingest bbox: {bbox}")
    successes = 0

    for endpoint, output_file, asset_type in (
        ("fac", "peeringdb_facilities.geojson", "Interconnection facility"),
        ("ix", "peeringdb_exchanges.geojson", "Internet exchange"),
    ):
        try:
            records = fetch_peeringdb_records(
                api_base=args.api_base,
                endpoint=endpoint,
                timeout=args.timeout,
            )
            features, skipped = convert_records(records, bbox, asset_type)
            output_path = args.output / output_file
            write_geojson(
                output_path,
                feature_collection(
                    output_path.stem,
                    features,
                    {
                        "source": "PeeringDB",
                        "source_type": "open_data",
                        "source_confidence": "medium",
                        "data_completeness": "unknown",
                        "data_limitation": DEFAULT_LIMITATION,
                    },
                ),
            )
            print(
                f"Saved {len(features)} {endpoint} feature(s) to {output_path}"
                + (f" ({skipped} skipped)" if skipped else "")
            )
            successes += 1
        except Exception as exc:  # noqa: BLE001 - keep batch resilient.
            print(f"ERROR: PeeringDB {endpoint} failed: {exc}", file=sys.stderr)

    return 0 if successes else 1


def fetch_peeringdb_records(
    api_base: str,
    endpoint: str,
    timeout: int,
) -> list[dict[str, Any]]:
    query = urlencode({"country": "VN"})
    url = f"{api_base.rstrip('/')}/{endpoint}?{query}"
    request = Request(
        url,
        headers={"User-Agent": "InfraAI-SiteCompass/0.1 open-data-planning-demo"},
    )

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            with urlopen(request, timeout=timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
            records = payload.get("data", [])
            if not isinstance(records, list):
                raise ValueError("PeeringDB response did not include a data list")
            return [record for record in records if isinstance(record, dict)]
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt == 0:
                print(f"Temporary PeeringDB failure, retrying once: {exc}")
                time.sleep(2)
                continue
    raise RuntimeError(f"PeeringDB request failed after retry: {last_error}")


def convert_records(
    records: list[dict[str, Any]],
    bbox: Any,
    asset_type: str,
) -> tuple[list[dict[str, Any]], int]:
    features: list[dict[str, Any]] = []
    skipped = 0

    for record in records:
        lat = parse_float(
            record.get("latitude")
            or record.get("lat")
            or record.get("fac_latitude")
        )
        lon = parse_float(
            record.get("longitude")
            or record.get("lon")
            or record.get("lng")
            or record.get("fac_longitude")
        )

        if lat is None or lon is None:
            skipped += 1
            continue
        if not bbox.contains(lat, lon):
            skipped += 1
            continue

        peeringdb_id = record.get("id")
        name = str(record.get("name") or record.get("name_long") or "")
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "source_id": str(peeringdb_id) if peeringdb_id is not None else "",
                    "name": name,
                    "asset_type": asset_type,
                    "category": "Network Infrastructure",
                    "source": "PeeringDB",
                    "source_type": "open_data",
                    "source_confidence": "medium",
                    "data_completeness": "unknown",
                    "data_limitation": DEFAULT_LIMITATION,
                    "organization": record.get("org_name") or "",
                    "address": " ".join(
                        str(part)
                        for part in (
                            record.get("address1"),
                            record.get("address2"),
                        )
                        if part
                    ),
                    "city": record.get("city") or "",
                    "country": record.get("country") or "",
                    "website": record.get("website") or "",
                    "net_count": record.get("net_count"),
                    "ix_count": record.get("ix_count"),
                    "carrier_count": record.get("carrier_count"),
                    "created": record.get("created") or "",
                    "updated": record.get("updated") or "",
                },
            }
        )

    return features, skipped


if __name__ == "__main__":
    raise SystemExit(main())
