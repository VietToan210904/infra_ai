"""Test path setup for the monorepo API package."""

from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ["ENABLE_LLM_EXPLANATIONS"] = "false"

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

API_ROOT = REPO_ROOT / "apps" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))
