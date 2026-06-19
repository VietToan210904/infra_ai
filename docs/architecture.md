# Architecture

InfraAI SiteCompass uses a monorepo layout with clear ownership boundaries:

- `apps/web` contains the current React/Vite frontend MVP.
- `apps/api` is reserved for the future FastAPI backend.
- `services/agents` is reserved for future agent workflows.
- `services/data-pipelines` is reserved for future ingestion and geospatial processing.
- `packages/contracts` is reserved for API contracts and generated types.
- `infra` is reserved for deployment and operations.
