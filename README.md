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
- Mapbox GL JS
- lucide-react icons
- Mock API functions now, FastAPI integration later

## Local Setup

Install dependencies from the repo root:

```bash
npm install
```

Create a local frontend environment file:

```bash
cp apps/web/.env.example apps/web/.env
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
- Mapbox `standard-satellite` style
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

