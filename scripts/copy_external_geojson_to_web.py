#!/usr/bin/env python3
"""Copy processed external-source GeoJSON files into the Vite public directory."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


DEFAULT_SOURCE = Path("data/processed/external/hcmc")
DEFAULT_TARGET = Path("apps/web/public/data/external/hcmc")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy external-source GeoJSON files into apps/web/public."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Directory containing processed GeoJSON files. Default: {DEFAULT_SOURCE}",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=DEFAULT_TARGET,
        help=f"Frontend public directory to receive GeoJSON. Default: {DEFAULT_TARGET}",
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

    print(f"Copied {len(files)} external GeoJSON files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
