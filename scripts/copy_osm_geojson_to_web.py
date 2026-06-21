#!/usr/bin/env python3
"""Copy processed OSM GeoJSON files into the Vite public directory."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy processed OSM GeoJSON files into apps/web/public."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("data/processed/osm/hcmc"),
        help="Directory containing processed GeoJSON files.",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=Path("apps/web/public/data/osm/hcmc"),
        help="Frontend public directory to receive GeoJSON files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.source.exists():
      print(f"Source directory does not exist: {args.source}")
      return 1

    args.target.mkdir(parents=True, exist_ok=True)
    files = sorted(args.source.glob("*.geojson"))

    if not files:
        print(f"No GeoJSON files found in {args.source}")
        return 1

    for file in files:
        target = args.target / file.name
        shutil.copy2(file, target)
        print(f"Copied {file} -> {target}")

    print(f"Copied {len(files)} GeoJSON files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
