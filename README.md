# InfraAI SiteCompass

InfraAI SiteCompass is a satellite-map AI readiness dashboard for public-sector AI infrastructure planning in Saigon / Ho Chi Minh City, Vietnam.

A public-sector technology leader can choose a candidate location on a satellite map and generate a mocked decision-support blueprint for either a public-sector AI compute hub or a regional AI data center. The MVP evaluates physical infrastructure, digital access, AI literacy, sector readiness, governance, environmental constraints, and phased investment priorities.

## Repository Layout

This repo is organized as a production-oriented monorepo:

- `apps/web` - current React/Vite frontend MVP.
- `apps/api` - reserved for the future FastAPI backend.
- `services/agents` - reserved for future agent workflows, prompts, tools, evaluators, and memory.
- `services/data-pipelines` - reserved for future public/synthetic data ingestion and geospatial processing.
- `packages/contracts` - reserved for OpenAPI specs, JSON schemas, and generated shared client types.
- `packages/shared` - reserved for truly shared frontend-safe code.
- `data` - reserved for shared mock, seed, GeoJSON, and sample data.
- `infra` - reserved for Docker, compose, Terraform, and Kubernetes deployment files.
- `docs` - architecture, API, deployment, data-source, and responsible-AI docs.
- `scripts` - repeatable dev, CI, and data helper scripts.

## Tech Stack

- React
- TypeScript
- Vite
- shadcn/ui-style component system
- Tailwind CSS
- Leaflet
- Esri World Imagery public satellite tiles
- OpenStreetMap street tiles
- lucide-react icons
- Mock API functions now, FastAPI integration later

## Local Setup

Install dependencies from the repo root:

```bash
npm install
```

Create a local frontend environment file if you need to configure future API
settings:

```bash
cp apps/web/.env.example apps/web/.env
```

The current map uses Leaflet with public Esri satellite imagery and
OpenStreetMap street tiles, so no Mapbox account, token, or payment card is
required for local development.

Optional future API setting:

```bash
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

The frontend can display static OpenStreetMap infrastructure GeoJSON layers
served from `apps/web/public/data/osm/hcmc/`.

Generate HCMC OpenStreetMap layers with Overpass:

```bash
python3 services/data-pipelines/ingest_osm_overpass.py --city hcmc
```

Copy processed GeoJSON into the Vite public directory:

```bash
python3 scripts/copy_osm_geojson_to_web.py
```

Then run the frontend:

```bash
npm run dev
```

Implemented real/open-data layer groups:

- Power infrastructure: power plants, substations, transmission lines
- Network infrastructure: telecom masts, communication towers, telecom-tagged assets, existing data-center-like assets where tagged, PeeringDB interconnection facilities
- Innovation and human capacity: research institutes, research offices, IT offices
- Public-service infrastructure: education, healthcare, government, and public safety facilities
- Land and environmental context: industrial zones and water context
- Transport and logistics context: major roads and rail corridors

OpenStreetMap layers may be incomplete or outdated. They do not verify grid
capacity, fibre availability, bandwidth, latency, data-center capacity, zoning,
water/cooling feasibility, transport capacity, permitting, construction
readiness, funding readiness, workforce capacity, or AI readiness.

## External Source Ingestion

PeeringDB can be fetched directly:

```bash
python3 services/data-pipelines/ingest_peeringdb.py --city hcmc
python3 scripts/copy_external_geojson_to_web.py
```

WRI Global Power Plant Database, OpenCelliD, and Ookla Open Data are supported
through converters once the source files are downloaded:

```bash
python3 services/data-pipelines/ingest_wri_power_plants.py \
  --input path/to/global_power_plant_database.csv

python3 services/data-pipelines/ingest_opencellid.py \
  --input path/to/opencellid_export.csv

python3 services/data-pipelines/ingest_ookla_open_data.py \
  --service fixed --year 2024 --quarter 4
```

The frontend serves external GeoJSON from:

```text
apps/web/public/data/external/hcmc/
```

## Verification Layers

The frontend includes disabled `Needs data` slots for verified grid capacity,
verified fibre capacity, cooling feasibility, verified zoning, permitting
status, construction readiness, and AI readiness assessment.

These layers require official/provider/engineering evidence before they can be
enabled. Use the verification data contract in
`docs/VERIFICATION_DATA_REQUIREMENTS.md`.

Validate future verification GeoJSON:

```bash
python3 scripts/validate_verification_geojson.py --input data/processed/verification/hcmc
```

Copy validated verification GeoJSON into the frontend:

```bash
python3 scripts/copy_verification_geojson_to_web.py
```

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
- Leaflet map with Esri satellite imagery and OpenStreetMap street fallback
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
- Synthetic MVP GeoJSON layers:
  - Education readiness
  - Healthcare readiness
  - Government readiness
  - Overall readiness heatmap
- Layer visibility toggles
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

## Synthetic Data Disclaimer

All map layers and analysis outputs in this MVP are synthetic. They are intended for hackathon demo workflows only and are not authoritative infrastructure, zoning, environmental, grid, healthcare, education, or government datasets.

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
    "education",
    "healthcare",
    "government",
    "overall_readiness"
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
