# InfraAI SiteCompass

InfraAI SiteCompass is a satellite-map AI readiness dashboard for public-sector AI infrastructure planning in Saigon / Ho Chi Minh City, Vietnam.

A public-sector technology leader can choose a candidate location on a satellite map and generate a mocked decision-support blueprint for either a public-sector AI compute hub or a regional AI data center. The MVP evaluates physical infrastructure, digital access, AI literacy, sector readiness, governance, environmental constraints, and phased investment priorities.

## Repository Layout

This repo is organized as a production-oriented monorepo:

- `apps/web` - current React/Vite frontend MVP.
- `apps/api` - reserved for the future FastAPI backend.
- `services/agents` - reserved for future agent workflows, prompts, tools, evaluators, and memory.
- `services/data-pipelines` - public/open-data ingestion and geospatial processing helpers.
- `packages/contracts` - reserved for OpenAPI specs, JSON schemas, and generated shared client types.
- `packages/shared` - reserved for truly shared frontend-safe code.
- `data` - shared mock, seed, processed GeoJSON, and sample data.
- `infra` - reserved for Docker, compose, Terraform, and Kubernetes deployment files.
- `docs` - architecture, API, deployment, data-source, and responsible-AI docs.
- `scripts` - repeatable dev, CI, and data helper scripts.

## Tech Stack

- React
- TypeScript
- Vite
- shadcn/ui-style component system
- Tailwind CSS
- Mapbox GL JS
- lucide-react icons
- Mock API functions now, FastAPI integration later

## Local Setup

Install dependencies from the repo root:

```bash
npm install
```

Create a local frontend environment file at the repo root:

```bash
cp apps/web/.env.example .env
```

Add your Mapbox public token:

```bash
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_API_BASE_URL=http://localhost:8000
```

Run the Vite dev server from the repo root:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Real Open-Data Map Layers

The frontend displays Mapbox basemaps plus static HCMC infrastructure GeoJSON
served from `apps/web/public/data/`.

Implemented open-data overlay groups include:

- Power infrastructure: power plants, substations, transmission lines
- Network infrastructure: telecom assets, existing data-center-like assets, PeeringDB facilities and internet exchanges
- Innovation and public-service context: tech/research, education, healthcare, government, and public safety facilities
- Land, water, and logistics context: industrial zones, transport corridors, and water context

Generate or refresh HCMC OpenStreetMap layers:

```bash
python3 services/data-pipelines/ingest_osm_overpass.py --city hcmc
python3 scripts/copy_osm_geojson_to_web.py
```

Fetch public PeeringDB records:

```bash
python3 services/data-pipelines/ingest_peeringdb.py --city hcmc
python3 scripts/copy_external_geojson_to_web.py
```

Verification layers for grid capacity, fibre capacity, cooling feasibility,
zoning, permitting, construction readiness, and AI readiness are included as
disabled `Needs data` slots until official/provider evidence is supplied. See
`docs/VERIFICATION_DATA_REQUIREMENTS.md`.

## shadcn/ui Notes

The frontend includes local shadcn-compatible primitives in `apps/web/src/components/ui` and an `apps/web/components.json` config. The MVP uses:

- Button
- Card
- Badge
- Select
- Input/Textarea primitives
- Table
- Progress
- Alert
- Separator
- ScrollArea
- Skeleton
- Tooltip
- Accordion

To add more shadcn components later, run the command from `apps/web`:

```bash
npx shadcn@latest add component-name
```

## Features Completed

- Saigon / Ho Chi Minh City satellite map centered at `[106.7009, 10.7769]`
- Mapbox satellite and streets basemaps
- HCMC-focused map bounds
- Click-to-select candidate location with marker and popup
- Saigon preset candidate zones:
  - Saigon Hi-Tech Park / Thu Duc
  - Thu Thiem / District 2 area
  - Tan Thuan / District 7 area
  - District 1 civic core
- Infrastructure type selector:
  - Public-sector AI compute hub
  - Regional AI data center
- Scenario selector with deterministic mock result adjustments
- Real open-data HCMC infrastructure overlays with layer visibility toggles
- Mock `analyzeSite(payload)` API function with 500ms delay
- Readiness report panel with:
  - Suitability score
  - Confidence badge
  - Recommendation
  - Component score bars
  - Sector readiness table
  - Bottlenecks
  - Priority investments
  - Strategic roadmap
  - Human review warning
- AI agent chat panel that explains the current mock report without inventing new scores

## Data Disclaimer

Map overlays are based on open data and may be incomplete or outdated. Analysis
outputs are still mocked for MVP workflows and are not authoritative
infrastructure, zoning, environmental, grid, healthcare, education, government,
or permitting datasets.

InfraAI SiteCompass does not approve construction, issue permits, allocate funding, guarantee grid capacity, or replace engineering and environmental review.

## Future FastAPI Endpoints

### `POST /api/analyze-site`

Request:

```json
{
  "lat": 10.7769,
  "lng": 106.7009,
  "infrastructureType": "PUBLIC_AI_COMPUTE_HUB",
  "activeLayers": [
    "power_plants",
    "substations",
    "transmission_lines",
    "telecom_assets"
  ],
  "scenario": "BUILD_NOW"
}
```

### `POST /api/agent/chat`

Request:

```json
{
  "message": "Can we build AI infrastructure here?",
  "lat": 10.7769,
  "lng": 106.7009,
  "infrastructureType": "PUBLIC_AI_COMPUTE_HUB",
  "currentAnalysis": {}
}
```

The frontend mock functions live in `apps/web/src/api/siteApi.ts`, so replacing them with FastAPI calls should be localized.
