# InfraAI SiteCompass

InfraAI SiteCompass is an open-ended satellite-map AI infrastructure planning
assistant for Saigon / Ho Chi Minh City. It is not limited to data center
planning: data center feasibility is one planning intent inside a broader
Community AI Readiness Blueprint workflow.

City leaders can click a location or choose a candidate zone, inspect Mapbox
satellite infrastructure overlays, run readiness analysis, simulate scenarios,
and ask planning questions about compute, connectivity, power, data platforms,
AI literacy, governance, cybersecurity, and sector readiness.

Hackathon project: our team built and submitted InfraAI SiteCompass on Devpost:
https://devpost.com/software/infraai

## Challenge Alignment

The product supports Community AI Readiness Blueprint planning by:

- identifying readiness across education, workforce, healthcare, government, and nonprofits
- surfacing digital access, AI literacy, infrastructure, data-quality, and governance gaps
- recommending priority investments for long-term resilience
- producing scorecards, sector dashboards, strategic roadmaps, and policy-oriented recommendations
- including confidence levels, uncertainty, non-goals, guardrails, and human review warnings

## Repository Layout

- `apps/web` - React/Vite/TypeScript frontend with Mapbox satellite planning UI.
- `apps/api` - FastAPI backend for readiness analysis, planning chat, and MCP tools.
- `services/agents` - Python intent router, shared agent tools, guardrails, agent review, and optional OpenAI adapter.
- `services/data-pipelines` - public/open-data ingestion and geospatial processing helpers.
- `packages/contracts` - reserved for future OpenAPI specs and generated client types.
- `packages/shared` - reserved for frontend-safe shared code.
- `data` - shared mock, seed, processed GeoJSON, and sample data.
- `docs` - architecture, API, deployment, data-source, and responsible-AI docs.
- `scripts` - repeatable dev, CI, and data helper scripts.

## Tech Stack

- React, TypeScript, Vite
- Mapbox GL JS
- shadcn/ui-style local primitives
- FastAPI, Pydantic, Python agents
- Model Context Protocol server for external tool clients
- Optional OpenAI Python SDK for grounded explanations

## User Flow

1. Add a public Mapbox token in `.env`.
2. Start the FastAPI backend.
3. Start the Vite frontend.
4. Click a map location or choose a candidate zone.
5. Select a planning focus and scenario.
6. Run readiness analysis.
7. Ask the planning assistant open-ended questions.

Example questions:

- Can we build AI infrastructure here?
- Can we build a data center here?
- Where should we place edge AI nodes?
- Which area needs fiber upgrade first?
- Is this area ready for healthcare AI?
- What should we invest in first?
- Generate a strategic AI readiness roadmap.

## How The AI Recommends

The deterministic Python scorer owns all numeric readiness values. The backend
first reads local OSM and PeeringDB GeoJSON for the visible layers, calculates
nearby feature evidence around the selected point, and excludes synthetic layers
from numeric scoring. Agents then inspect evidence, compare scenarios, rank
investments, apply guardrails, and review score reliability. OpenAI can explain
those tool outputs, but it must not invent scores or approve real-world
decisions.

Readiness reports include an `agentReview` section with score reliability,
evidence strengths, evidence gaps, uncertainty notes, challenged assumptions,
next validation steps, matched evidence citations, score drivers, and excluded
synthetic context.

Planning intents include:

- general AI infrastructure readiness
- data center feasibility
- public AI compute hub
- edge AI nodes
- cloud-first strategy
- fiber/connectivity upgrade
- power/grid readiness
- city data platform
- AI literacy program
- governance/cybersecurity readiness
- sector-specific readiness

Legacy frontend values are still accepted:

- `PUBLIC_AI_COMPUTE_HUB` maps to `PUBLIC_COMPUTE_HUB`
- `REGIONAL_AI_DATA_CENTER` maps to `DATA_CENTER_FEASIBILITY`

## Scoring Criteria

General infrastructure readiness uses:

- 25% power
- 20% connectivity
- 15% compute ecosystem
- 15% cooling/water
- 10% physical feasibility
- 10% data maturity
- 5% governance

Sector readiness uses:

- 25% infrastructure readiness
- 20% digital access
- 20% data maturity
- 15% AI literacy
- 10% governance
- 10% use-case feasibility

Confidence uses:

- 40% data completeness
- 25% data freshness
- 20% source reliability
- 15% geographic resolution

The backend also calculates intent-specific scores for data center feasibility,
edge AI nodes, public compute hubs, cloud-first strategy, fiber upgrades,
AI literacy investment, governance/cybersecurity, power/grid readiness, city
data platforms, and sector-specific readiness.

## Scenario Simulator

Supported scenarios:

- Build now
- Upgrade fiber first
- Validate grid capacity first
- Launch AI literacy training
- Cloud-first instead of local infrastructure
- Delay investment
- Governance first
- Edge pilot first
- Open data platform first

Each scenario modifies relevant component scores transparently in the backend
and returns the same frontend-compatible report shape.

## Data And Map Layers

The frontend displays Mapbox basemaps plus static HCMC GeoJSON served from
`apps/web/public/data/`.

Implemented overlay groups include:

- power infrastructure
- network infrastructure
- innovation, education, healthcare, government, and public-safety context
- land, water, climate-risk, population, workforce, digital-access, and AI-readiness context

Some layers are real/open data, and some are clearly labeled synthetic demo
fixtures. Synthetic data supports UI and planning demonstration only. It cannot
prove AI infrastructure feasibility and is excluded from numeric readiness
scoring.

Refresh HCMC OpenStreetMap layers:

```bash
python3 services/data-pipelines/ingest_osm_overpass.py --city hcmc
python3 scripts/copy_osm_geojson_to_web.py
```

Fetch public PeeringDB records:

```bash
python3 services/data-pipelines/ingest_peeringdb.py --city hcmc
python3 scripts/copy_external_geojson_to_web.py
```

## Local Setup

Install frontend dependencies from the repo root:

```bash
npm install
```

Create a local frontend environment file at the repo root:

```bash
cp apps/web/.env.example .env
```

Add your public Mapbox token and API base URL:

```bash
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_API_BASE_URL=http://localhost:8000
```

Install and run the backend from the repo root:

```bash
python -m pip install -e "apps/api[dev]" -e "services/agents[dev]"
python -m uvicorn app.main:app --app-dir apps/api --reload
```

The backend also mounts MCP tools at:

```text
http://localhost:8000/mcp
```

Use an MCP-compatible client or inspector for that endpoint. The browser
frontend continues to use the REST endpoints.

Run the Vite dev server:

```bash
npm run dev
```

Build and lint:

```bash
npm run build
npm run lint
```

## Optional OpenAI Explanations

OpenAI is optional and backend-only. To enable LLM explanations, copy
`apps/api/.env.example` to `apps/api/.env` and set:

```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=your_model
ENABLE_LLM_EXPLANATIONS=true
```

If OpenAI is disabled, missing, or unavailable, the backend returns the
deterministic rule-based agent response with the same API shape.

Check backend LLM status:

```bash
curl http://localhost:8000/health
```

The `llmReady` field is `true` only when `ENABLE_LLM_EXPLANATIONS=true`,
`OPENAI_API_KEY` is present, and `OPENAI_MODEL` is present.

## Responsible AI And Non-Goals

InfraAI SiteCompass does not approve construction, issue permits, allocate
public funding, guarantee grid capacity, or replace engineering, environmental,
cybersecurity, or community review.

The current system is a decision-support prototype. It uses synthetic and
open-data planning context, so all outputs require human review and authoritative
provider, utility, environmental, land, cybersecurity, and community validation.

## Current Limitations

- Full GeoJSON proximity scoring is deferred.
- Utility/provider capacity validation is not implemented.
- Real permitting, environmental, land ownership, and construction readiness evidence is not authoritative.
- OpenAI explanations are optional and never the source of numeric scores.
- The frontend falls back to local deterministic mock analysis when the backend is not available.
