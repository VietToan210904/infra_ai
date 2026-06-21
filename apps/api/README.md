# InfraAI API

FastAPI backend for InfraAI SiteCompass.

The API owns the deterministic AI infrastructure readiness workflow:

- intent-compatible site analysis
- local GeoJSON evidence matching for visible layers
- transparent readiness scoring
- sector readiness scorecards
- agent-reviewed report reliability
- shared tool handlers for chat and MCP
- guardrails and non-goals
- planning-agent chat responses
- optional OpenAI explanations when configured

## Endpoints

- `GET /health`
- `POST /api/analyze-site`
- `POST /api/agent/chat`
- `MCP /mcp`

`/mcp` is a Model Context Protocol endpoint. It is meant for MCP clients, not
plain browser requests, and exposes the same planning tools used by chat:
intent classification, readiness analysis, matched site evidence, score-driver
explanations, scenario comparison, priority ranking, roadmap generation,
guardrails, and platform help.

Synthetic layers are retained as planning context and uncertainty, but they are
excluded from numeric scoring. Numeric scores are driven by active real/open
GeoJSON layers such as OpenStreetMap and PeeringDB.

## Local Run

From the repo root:

```bash
python -m pip install -e "apps/api[dev]" -e "services/agents[dev]"
python -m uvicorn app.main:app --app-dir apps/api --reload
```

Set the frontend to call the API:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

OpenAI is optional. To enable LLM explanations in local backend development,
copy `.env.example` to `apps/api/.env` and set:

```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=your_model
ENABLE_LLM_EXPLANATIONS=true
```

You can also put the same backend variables in the repo-root `.env`. Do not
prefix them with `VITE_`; the OpenAI key must stay server-side only.

Check whether the backend is ready to call OpenAI:

```bash
curl http://localhost:8000/health
```

`llmReady` is `true` only when all three conditions are true:

- `ENABLE_LLM_EXPLANATIONS=true`
- `OPENAI_API_KEY` is present
- `OPENAI_MODEL` is present

The backend never exposes the OpenAI key to the browser. If OpenAI is disabled
or unavailable, the API returns deterministic rule-based explanations.
