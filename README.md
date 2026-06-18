# InfraAI SiteCompass

InfraAI SiteCompass is a satellite-map AI readiness dashboard for public-sector AI infrastructure planning in Saigon / Ho Chi Minh City, Vietnam.

A public-sector technology leader can choose a candidate location on a satellite map and generate a mocked decision-support blueprint for either a public-sector AI compute hub or a regional AI data center. The MVP evaluates physical infrastructure, digital access, AI literacy, sector readiness, governance, environmental constraints, and phased investment priorities.

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

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Add your Mapbox public token:

```bash
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_API_BASE_URL=http://localhost:8000
```

Run the Vite dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## shadcn/ui Notes

This project includes local shadcn-compatible primitives in `src/components/ui` and a `components.json` config. The MVP uses:

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

To add more shadcn components later:

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

The frontend mock functions live in `src/api/siteApi.ts`, so replacing them with FastAPI calls should be localized.
