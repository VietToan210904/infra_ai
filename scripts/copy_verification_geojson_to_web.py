#!/usr/bin/env python3
"""Copy authority/provider verification GeoJSON into the Vite public directory."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


DEFAULT_SOURCE = Path("data/processed/verification/hcmc")
DEFAULT_DESTINATION = Path("apps/web/public/data/verification/hcmc")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy verification GeoJSON files into apps/web/public."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Source directory. Default: {DEFAULT_SOURCE}",
    )
    parser.add_argument(
        "--destination",
        type=Path,
        default=DEFAULT_DESTINATION,
        help=f"Destination directory. Default: {DEFAULT_DESTINATION}",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.source.exists():
        print(f"[copy] Source directory does not exist: {args.source}")
        print("[copy] Add validated verification GeoJSON files before copying.")
        return 1

    args.destination.mkdir(parents=True, exist_ok=True)
    copied_count = 0

    for source_file in sorted(args.source.glob("*.geojson")):
        destination_file = args.destination / source_file.name
        shutil.copy2(source_file, destination_file)
        copied_count += 1
        print(f"[copy] {source_file} -> {destination_file}")

    if copied_count == 0:
        print(f"[copy] No GeoJSON files found in {args.source}")
        return 1

    print(f"[copy] Copied {copied_count} verification GeoJSON file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
