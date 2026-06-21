#!/usr/bin/env python3
"""Convert Ookla Open Data shapefile ZIPs into city-clipped GeoJSON.

Ookla publishes fixed and mobile performance tiles. This script intentionally
clips and republishes only aggregate tiles for planning context. It does not
verify fibre routes, provider capacity, service availability, SLAs, or latency
between a candidate site and a specific compute/network destination.
"""

from __future__ import annotations

import argparse
import io
import json
import struct
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any, BinaryIO, Iterator
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from geojson_utils import bbox_from_args, feature_collection, parse_float, write_geojson


SOURCE_NAME = "Speedtest by Ookla Open Data"
DEFAULT_LIMITATION = (
    "Ookla performance tiles are aggregate observed speed-test measurements. "
    "They do not verify fibre routes, bandwidth contracts, provider capacity, "
    "site-level latency, redundancy, or service availability."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clip Ookla Open Data shapefile ZIPs to a city bbox."
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
        "--service",
        choices=["fixed", "mobile"],
        default="fixed",
        help="Ookla layer type.",
    )
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--quarter", type=int, choices=[1, 2, 3, 4], default=4)
    parser.add_argument(
        "--input-zip",
        type=Path,
        help="Local Ookla shapefile ZIP. If omitted, --download-url or year/quarter is used.",
    )
    parser.add_argument(
        "--download-url",
        help="Explicit ZIP URL. Defaults to the official Ookla S3 URL for year/quarter/service.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output GeoJSON file. Defaults to data/processed/external/hcmc/ookla_<service>_performance.geojson.",
    )
    parser.add_argument(
        "--max-features",
        type=int,
        help="Optional development guardrail for very large files.",
    )
    parser.add_argument("--timeout", type=int, default=180)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bbox = bbox_from_args(args.city, args.bbox)
    output = args.output or Path(
        f"data/processed/external/hcmc/ookla_{args.service}_performance.geojson"
    )

    zip_path = args.input_zip
    with tempfile.TemporaryDirectory() as temporary_dir:
        if zip_path is None:
            url = args.download_url or ookla_download_url(
                service=args.service,
                year=args.year,
                quarter=args.quarter,
            )
            zip_path = Path(temporary_dir) / Path(url).name
            download_file(url, zip_path, args.timeout)

        features = convert_ookla_zip(
            zip_path=zip_path,
            bbox=bbox,
            service=args.service,
            year=args.year,
            quarter=args.quarter,
            max_features=args.max_features,
        )

    write_geojson(
        output,
        feature_collection(
            f"ookla_{args.service}_performance",
            features,
            {
                "source": SOURCE_NAME,
                "source_type": "open_data",
                "source_confidence": "medium",
                "data_completeness": "partial",
                "data_limitation": DEFAULT_LIMITATION,
                "service": args.service,
                "year": args.year,
                "quarter": args.quarter,
            },
        ),
    )
    print(f"Saved {len(features)} Ookla tile feature(s) to {output}")
    return 0


def ookla_download_url(service: str, year: int, quarter: int) -> str:
    quarter_month = {1: "01", 2: "04", 3: "07", 4: "10"}[quarter]
    filename = f"{year}-{quarter_month}-01_performance_{service}_tiles.zip"
    return (
        "https://ookla-open-data.s3.amazonaws.com/"
        f"shapefiles/performance/type={service}/year={year}/quarter={quarter}/"
        f"{filename}"
    )


def download_file(url: str, output_path: Path, timeout: int) -> None:
    print(f"Downloading {url}")
    request = Request(
        url,
        headers={"User-Agent": "InfraAI-SiteCompass/0.1 open-data-planning-demo"},
    )
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            with urlopen(request, timeout=timeout) as response:
                with output_path.open("wb") as file:
                    while chunk := response.read(1024 * 1024):
                        file.write(chunk)
            return
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt == 0:
                print(f"Temporary Ookla download failure, retrying once: {exc}")
                time.sleep(3)

    raise RuntimeError(f"Ookla download failed after retry: {last_error}")


def convert_ookla_zip(
    zip_path: Path,
    bbox: Any,
    service: str,
    year: int,
    quarter: int,
    max_features: int | None,
) -> list[dict[str, Any]]:
    if not zip_path.exists():
        raise FileNotFoundError(zip_path)

    with zipfile.ZipFile(zip_path) as archive:
        shp_name = first_member_with_suffix(archive, ".shp")
        dbf_name = first_member_with_suffix(archive, ".dbf")
        if not shp_name or not dbf_name:
            raise ValueError(f"{zip_path} must contain .shp and .dbf files")

        with archive.open(shp_name) as shp_file, archive.open(dbf_name) as dbf_file:
            dbf = DbfReader(dbf_file)
            shapes = iter_shapefile_records(shp_file)
            features: list[dict[str, Any]] = []

            for record_index, (shape, properties) in enumerate(zip(shapes, dbf.records())):
                if shape is None:
                    continue
                if not bbox.intersects(
                    west=shape["bbox"][0],
                    south=shape["bbox"][1],
                    east=shape["bbox"][2],
                    north=shape["bbox"][3],
                ):
                    continue

                if not shape_centroid_in_bbox(shape, bbox):
                    continue

                properties = normalize_dbf_properties(properties)
                features.append(
                    {
                        "type": "Feature",
                        "geometry": shape["geometry"],
                        "properties": {
                            "source_id": properties.get("quadkey") or str(record_index),
                            "name": f"Ookla {service} performance tile",
                            "asset_type": f"{service.title()} network performance tile",
                            "category": "Network Infrastructure",
                            "source": SOURCE_NAME,
                            "source_type": "open_data",
                            "source_confidence": "medium",
                            "data_completeness": "partial",
                            "data_limitation": DEFAULT_LIMITATION,
                            "service": service,
                            "year": year,
                            "quarter": quarter,
                            **properties,
                        },
                    }
                )

                if max_features and len(features) >= max_features:
                    break

    return features


def first_member_with_suffix(archive: zipfile.ZipFile, suffix: str) -> str | None:
    for name in archive.namelist():
        if name.lower().endswith(suffix):
            return name
    return None


class DbfReader:
    def __init__(self, file: BinaryIO):
        header = file.read(32)
        if len(header) < 32:
            raise ValueError("Invalid DBF header")

        self.file = file
        self.record_count = struct.unpack("<I", header[4:8])[0]
        self.header_length = struct.unpack("<H", header[8:10])[0]
        self.record_length = struct.unpack("<H", header[10:12])[0]
        self.fields = self._read_fields()

        consumed = 32 + len(self.fields) * 32 + 1
        if self.header_length > consumed:
            file.read(self.header_length - consumed)

    def _read_fields(self) -> list[dict[str, Any]]:
        fields: list[dict[str, Any]] = []
        while True:
            descriptor = self.file.read(32)
            if not descriptor:
                break
            if descriptor[0] == 0x0D:
                break

            name = descriptor[:11].split(b"\x00", 1)[0].decode("utf-8", "ignore")
            fields.append(
                {
                    "name": name,
                    "type": chr(descriptor[11]),
                    "length": descriptor[16],
                    "decimals": descriptor[17],
                }
            )
        return fields

    def records(self) -> Iterator[dict[str, Any]]:
        for _ in range(self.record_count):
            record = self.file.read(self.record_length)
            if len(record) < self.record_length or record[:1] == b"*":
                continue

            offset = 1
            parsed: dict[str, Any] = {}
            for field in self.fields:
                raw = record[offset : offset + field["length"]]
                offset += field["length"]
                text = raw.decode("utf-8", "ignore").strip()
                parsed[field["name"]] = parse_dbf_value(text, field)
            yield parsed


def parse_dbf_value(text: str, field: dict[str, Any]) -> Any:
    if text == "":
        return ""
    if field["type"] in {"N", "F"}:
        if field["decimals"] == 0:
            try:
                return int(text)
            except ValueError:
                return text
        return parse_float(text)
    if field["type"] == "L":
        return text.upper() in {"Y", "T"}
    return text


def iter_shapefile_records(file: BinaryIO) -> Iterator[dict[str, Any] | None]:
    header = file.read(100)
    if len(header) < 100:
        raise ValueError("Invalid shapefile header")

    while True:
        record_header = file.read(8)
        if not record_header:
            break
        if len(record_header) < 8:
            raise ValueError("Invalid shapefile record header")

        content_length_words = struct.unpack(">i", record_header[4:8])[0]
        content = file.read(content_length_words * 2)
        if len(content) < content_length_words * 2:
            raise ValueError("Truncated shapefile record")

        yield parse_shape_record(content)


def parse_shape_record(content: bytes) -> dict[str, Any] | None:
    stream = io.BytesIO(content)
    shape_type = struct.unpack("<i", stream.read(4))[0]

    if shape_type == 0:
        return None
    if shape_type not in {5, 15, 25}:
        return None

    bbox = list(struct.unpack("<4d", stream.read(32)))
    num_parts = struct.unpack("<i", stream.read(4))[0]
    num_points = struct.unpack("<i", stream.read(4))[0]
    parts = list(struct.unpack(f"<{num_parts}i", stream.read(num_parts * 4)))
    points = [
        list(struct.unpack("<2d", stream.read(16)))
        for _ in range(num_points)
    ]

    rings: list[list[list[float]]] = []
    for part_index, start in enumerate(parts):
        end = parts[part_index + 1] if part_index + 1 < len(parts) else len(points)
        ring = points[start:end]
        if len(ring) >= 4:
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            rings.append(ring)

    if not rings:
        return None

    return {"bbox": bbox, "geometry": {"type": "Polygon", "coordinates": rings}}


def normalize_dbf_properties(properties: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in properties.items():
        normalized[key.lower()] = value
    return normalized


def shape_centroid_in_bbox(shape: dict[str, Any], bbox: Any) -> bool:
    coordinates = shape["geometry"]["coordinates"][0]
    lon_sum = 0.0
    lat_sum = 0.0
    count = 0
    for lon, lat in coordinates:
        lon_sum += lon
        lat_sum += lat
        count += 1
    if count == 0:
        return False
    return bbox.contains(lat=lat_sum / count, lon=lon_sum / count)


if __name__ == "__main__":
    raise SystemExit(main())
