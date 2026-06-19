# PLAN.md - InfraAI SiteCompass

## 0. Source of Truth

This file is the project planning source of truth for InfraAI SiteCompass.

If another planning file exists, treat it as legacy context unless this file explicitly references it. The current implementation baseline is the existing React/Vite app in this repository. Do not plan a Next.js rewrite unless the team explicitly decides to migrate later.

---

## 1. Product Summary

**InfraAI SiteCompass** is a satellite-map AI readiness dashboard for public-sector AI infrastructure planning in Ho Chi Minh City / Saigon.

The MVP lets a public-sector technology leader choose a candidate location on a satellite-style map and generate a synthetic decision-support blueprint for:

1. **Public-sector AI compute hub**
2. **Regional AI data center**

The system does not approve construction or make final funding decisions. It supports early planning by showing:

- suitability score
- readiness level
- confidence level
- infrastructure bottlenecks
- sector readiness across education, workforce, healthcare, government, and nonprofits
- priority investments
- 0-36 month roadmap
- responsible AI and human review warnings

Long-term vision: expand from these two demo presets into a broader city AI infrastructure planning agent that can answer open-ended questions about compute, network, data infrastructure, public-service AI, human capacity, and governance/security.

---

## 2. Current Stage

Current stage: **working mock frontend MVP**.

The app is already implemented as a React/Vite frontend with synthetic HCMC planning data under `apps/web`. The immediate goal is **demo readiness**, not a framework rewrite, real-data ingestion, FastAPI integration, or full LLM routing.

### Completed in the Current App

- HCMC/Saigon map experience with Mapbox GL JS and a demo fallback map.
- Candidate site selection by clicking the map or choosing preset locations.
- Preset candidate zones:
  - Saigon Hi-Tech Park / Thu Duc
  - Thu Thiem / District 2 area
  - Tan Thuan / District 7 area
  - District 1 civic core
- Infrastructure type selector:
  - public-sector AI compute hub
  - regional AI data center
- Scenario selector with deterministic mock result adjustments.
- Synthetic GeoJSON layers:
  - education readiness
  - healthcare readiness
  - government readiness
  - overall readiness heatmap
- Layer toggle panel with working and planned layers clearly separated.
- Mock `analyzeSite(payload)` API boundary.
- Readiness report panel with score, confidence, recommendation, component scores, sector readiness, bottlenecks, investments, roadmap, and human review warning.
- Rule-based planning assistant that explains the current mock report without inventing new scores.

### Partial or Needs Polish

- Compute hub vs regional data center comparison is present but should be more obvious in the dashboard and assistant.
- Scenario effects are deterministic but need clearer before/after explanation for demo storytelling.
- Several layer toggles are planned-only and should remain visibly labeled as planned data integrations.
- Data confidence appears in the plan, but current implementation only partially represents confidence through report labels and layer metadata.
- The current mock scoring is mostly fixed and does not yet compute location-specific weighted features.

### Future, Not Current MVP

- Real geospatial feature extraction.
- Weighted scoring from per-zone infrastructure features.
- Intent routing for broad open-ended infrastructure questions.
- FastAPI backend.
- LLM-backed agent.
- Real public datasets or authoritative infrastructure data.
- Multi-city support.

---

## 3. Challenge Alignment

This project targets **Community AI Readiness Blueprint**.

The MVP should clearly demonstrate:

- AI readiness levels across education, workforce, healthcare, government, and nonprofits.
- Gaps in digital access, AI literacy, and infrastructure.
- Priority investments for long-term resilience.
- Scorecards, sector dashboard, roadmap, and policy-style recommendations.
- Human-in-the-loop decision support rather than automated approval.

---

## 4. Target Users

Primary users:

- public-sector technology leaders
- city CTOs
- digital transformation offices
- city planning teams
- economic development agencies

Secondary users:

- workforce development agencies
- nonprofit coalitions
- education planning teams
- healthcare planning teams
- public innovation labs

The system supports early-stage planning before engineering studies, procurement, permitting, or funding approval.

---

## 5. Current MVP User Flow

1. User opens the InfraAI SiteCompass dashboard.
2. User sees a three-panel layout:
   - site selection map
   - planning assistant
   - readiness report
3. User chooses a preset HCMC candidate site or clicks the map.
4. User selects an infrastructure type:
   - public-sector AI compute hub
   - regional AI data center
5. User selects a scenario, such as build now, upgrade fiber first, validate grid capacity first, AI literacy training, cloud-first, or delay investment.
6. User runs the mock site analysis.
7. The dashboard shows suitability score, confidence, bottlenecks, sector readiness, investments, roadmap, and human review warning.
8. User asks the planning assistant a question about risks, investments, public benefit, roadmap, or compute hub vs data center fit.

---

## 6. Current Tech Stack

Use the existing stack:

- **Frontend:** React 19 + TypeScript
- **Build tool:** Vite 6
- **Workspace:** npm workspaces with the current web app in `apps/web`
- **Styling:** Tailwind CSS
- **UI primitives:** local shadcn-style components built on Radix UI
- **Map:** Mapbox GL JS with demo fallback if no Mapbox token is configured
- **Icons:** lucide-react
- **Data:** TypeScript mock data and synthetic GeoJSON
- **Analysis:** deterministic TypeScript mock functions
- **Backend:** not implemented; future FastAPI integration is planned
- **Testing:** not yet configured; add Vitest later for scoring and scenario logic

Important rule: do not replace the current Vite app with Next.js for MVP work.

---

## 7. Current Code Boundaries

The current monorepo separates runtime areas by ownership:

- `apps/web` contains the current React/Vite frontend MVP.
- `apps/api` is reserved for the future FastAPI backend.
- `services/agents` is reserved for future agent workflows, prompts, tools, evaluators, and memory.
- `services/data-pipelines` is reserved for future ingestion and geospatial preprocessing.
- `packages/contracts` is reserved for API contracts, OpenAPI specs, JSON schemas, and generated client types.
- `packages/shared` is reserved for truly shared frontend-safe code.
- `data` is reserved for shared mock, seed, GeoJSON, and sample data.
- `infra` is reserved for Docker, compose, Terraform, Kubernetes, and deployment files.
- `docs` stores architecture and operational documentation.
- `scripts` stores repeatable developer, CI, and data helper scripts.

The current app keeps implementation mostly localized:

- `apps/web/src/App.tsx` owns the main dashboard state and layout.
- `apps/web/src/api/siteApi.ts` is the mock API boundary for site analysis and assistant chat.
- `apps/web/src/data/mockAnalysis.ts` contains deterministic analysis results and scenario adjustments.
- `apps/web/src/data/mockGeoJson.ts` contains candidate zones and synthetic map layers.
- `apps/web/src/types/site.ts` contains the current frontend domain contracts.
- `apps/web/src/components/` contains map, assistant, selectors, report, and UI components.

Future backend or real-data work should preserve the same conceptual boundary: the UI asks for an analysis result; the scoring or backend layer returns structured report data; the assistant explains that report.

---

## 8. Immediate Next Stage - Demo Readiness

The next implementation stage should polish the existing mock MVP so it can be explained clearly in under 3 minutes.

### Priority 1 - Compute Hub vs Data Center Clarity

Make the tradeoff obvious:

- Public-sector AI compute hub should read as the near-term, lower-risk civic infrastructure option.
- Regional AI data center should read as a larger, more infrastructure-heavy option that requires stronger grid, cooling, water, and governance validation.
- The report should show both options side-by-side or clearly state why one is recommended over the other.
- The assistant should be able to answer: "Why not a regional data center yet?"

### Priority 2 - Scenario Explanation

Make scenario effects easier to demo:

- Show what changed when the user selects fiber upgrade, grid validation, AI literacy training, cloud-first, or delay investment.
- Explain whether the score, confidence, or sector readiness changed.
- Keep scenario behavior deterministic for reliability.

### Priority 3 - Synthetic Data Transparency

Keep the demo credible:

- Clearly label synthetic layers and mock analysis.
- Keep planned-only layers disabled or visually locked.
- Always include confidence and human review warnings.
- Avoid implying that grid capacity, cooling feasibility, land availability, or permitting has been verified.

### Priority 4 - Demo Script Fit

The UI and document should support this story:

1. Click an HCMC candidate site.
2. Analyze it as a public-sector AI compute hub.
3. Compare why a regional AI data center is not ready yet.
4. Show sector readiness and bottlenecks.
5. Run a scenario.
6. End with human review requirements.

---

## 9. Next Engineering Target - Weighted Scoring

After demo polish, replace fixed mock outputs with transparent weighted scoring while preserving deterministic behavior.

### Target Feature Inputs

Normalize scores from 0 to 100:

- power readiness
- connectivity readiness
- compute ecosystem access
- cooling and water feasibility
- physical site feasibility
- sector demand and public benefit
- governance readiness
- digital access gap
- AI literacy gap
- infrastructure gap
- data confidence

### Target Compute Hub Weights

Public-sector AI compute hub:

```text
Power and grid readiness: 20%
Connectivity and latency: 25%
Compute ecosystem access: 15%
Cooling and water feasibility: 10%
Physical site feasibility: 10%
Sector demand and public benefit: 15%
Governance and responsible AI readiness: 5%
```

### Target Regional Data Center Weights

Regional AI data center:

```text
Power and grid readiness: 30%
Connectivity and latency: 20%
Compute ecosystem access: 15%
Cooling and water feasibility: 20%
Physical site feasibility: 10%
Sector demand and public benefit: 3%
Governance and responsible AI readiness: 2%
```

### Readiness Levels

```text
0-30   = Not Ready
31-50  = Early Ready
51-70  = Suitable with Upgrades
71-85  = Feasibility Review Ready
86-100 = Strategic Ready
```

### Confidence Levels

```text
0-45   = Low
46-75  = Medium
76-100 = High
```

Confidence should reflect data completeness, data freshness, source reliability, geospatial coverage, and whether key assumptions are synthetic.

---

## 10. Sector Readiness Target

Each sector should eventually be scored with this explainable formula:

```text
Sector AI Readiness =
  25% Infrastructure readiness
  20% Digital access
  20% Data maturity
  15% AI literacy / human capacity
  10% Governance and safety
  10% Use-case feasibility
```

Required sectors:

- education
- workforce
- healthcare
- government
- nonprofits

Healthcare recommendations must stay conservative. If governance is weak, recommend only low-risk administrative AI such as scheduling, resource forecasting, routing, or summarization. Do not recommend clinical diagnosis, treatment recommendations, or automated patient prioritization without strong governance and human review.

---

## 11. Future Vision - Broader AI Infrastructure Agent

The broader product vision is an open-ended city AI infrastructure planning agent. This is not required for the immediate demo-ready MVP.

Future supported categories:

- compute infrastructure: GPU clusters, AI compute hubs, regional data centers, edge compute nodes
- network infrastructure: fiber, low-latency corridors, 5G coverage, redundant connectivity
- power and energy infrastructure: grid validation, substations, backup power, energy resilience
- cooling and environmental infrastructure: heat risk, cooling feasibility, water stress, flood resilience
- data infrastructure: data lakes, open data portals, data-sharing platforms, healthcare interoperability
- public-service AI infrastructure: civic chatbots, document AI, smart traffic AI, flood-prediction AI
- human-capacity infrastructure: AI literacy, teacher training, civil servant training, workforce reskilling
- governance and security infrastructure: procurement standards, cybersecurity controls, audit logs, human review workflows

Future agent capabilities:

- classify user intent
- classify infrastructure category
- ask clarification questions when needed
- route to the correct analysis module
- generate policy memo style recommendations from structured model outputs

Important rule: the LLM should explain model outputs, not invent readiness scores.

---

## 12. Future Backend and API Direction

FastAPI is a future integration, not part of the current MVP.

Future endpoints should preserve the current frontend concept:

### `POST /api/analyze-site`

Input should include:

- latitude
- longitude
- infrastructure type or category
- selected scenario
- active layers

Output should return a structured readiness report compatible with the frontend dashboard.

### `POST /api/agent/chat`

Input should include:

- user message
- selected location, if any
- current analysis result
- selected infrastructure type or category

Output should return an assistant message grounded in the structured report.

Fallback behavior should remain deterministic if no LLM key is configured.

---

## 13. Responsible AI Requirements

### Non-Goal Statement

InfraAI SiteCompass does not approve data center construction, issue permits, allocate public funding, guarantee grid capacity, or replace engineering and environmental review. It supports early-stage planning by identifying readiness gaps, tradeoffs, and priority investments.

### Human Review Required

Human review is required for:

- final site approval
- public funding allocation
- permitting
- engineering feasibility
- environmental review
- water and cooling impact
- cybersecurity review
- public-sector procurement
- community consultation

### Agent Must Not Say

- "Approved for construction."
- "Guaranteed grid capacity."
- "No human review needed."
- "This site is definitely safe."

### Agent Should Say

- "Suitable for feasibility review."
- "Suitable with upgrades."
- "Not recommended under current assumptions."
- "Insufficient data."

---

## 14. Demo-Ready MVP Acceptance Criteria

The immediate MVP is demo-ready when:

1. The app opens to the current three-panel dashboard.
2. The map shows HCMC/Saigon context with candidate locations.
3. The user can choose or click a site.
4. The user can select public-sector AI compute hub or regional AI data center.
5. The user can run analysis and receive a readiness report.
6. The report clearly explains the recommended infrastructure direction.
7. Compute hub vs data center tradeoffs are obvious.
8. Sector readiness is visible for education, workforce, healthcare, government, and nonprofits.
9. Bottlenecks and priority investments are visible.
10. Scenario selection visibly changes or explains the recommendation.
11. Human review and synthetic data warnings are visible.
12. The demo can be completed in under 3 minutes using synthetic data.

The MVP does not require:

- real public datasets
- real geospatial extraction
- FastAPI backend
- LLM-backed agent
- multi-city support
- construction approval or engineering-grade feasibility

---

## 15. Demo Script

Use this walkthrough:

1. "This is InfraAI SiteCompass, a satellite-map AI readiness dashboard for city AI infrastructure planning."
2. "The current demo uses synthetic planning data for Ho Chi Minh City."
3. "The user is a public-sector technology leader deciding what kind of AI infrastructure a location is ready for."
4. Click a candidate site, such as Saigon Hi-Tech Park / Thu Duc.
5. Select public-sector AI compute hub and run analysis.
6. Show the readiness score, confidence, bottlenecks, sector readiness, and roadmap.
7. Explain that the site is a better near-term fit for a civic compute hub than a regional AI data center.
8. Switch to regional AI data center and explain the stronger requirements around grid, cooling, water, and governance.
9. Run a scenario such as fiber upgrade, grid validation, or AI literacy training.
10. Show how the recommendation or confidence changes.
11. End with the responsible AI warning: the system informs planning, but humans decide.

---

## 16. Evaluation Plan

### Functional Checks

- Map click or candidate selection updates selected location.
- Infrastructure type changes rerun or refresh analysis.
- Scenario changes rerun or refresh analysis.
- Readiness report always includes score, confidence, bottlenecks, investments, roadmap, and human review.
- Assistant refuses approval-style requests and stays grounded in the current report.

### Demo Checks

- A new viewer can understand the app without external explanation.
- Synthetic data is clearly labeled.
- Compute hub vs data center comparison is understandable.
- The demo flow takes under 3 minutes.

### Future Test Coverage

When scoring is extracted into utility modules, add Vitest tests for:

- score-to-level mapping
- confidence mapping
- weighted infrastructure scoring
- bottleneck detection
- priority investment generation
- scenario adjustments
- healthcare safety constraints

---

## 17. Handoff Notes

- Keep the current Vite frontend as the baseline.
- Keep the current frontend in `apps/web`; root scripts should delegate to that workspace.
- Do not introduce a framework migration during demo polish.
- Keep mock behavior deterministic so the demo is reliable.
- Keep all synthetic-data and human-review disclaimers visible.
- Treat broad open-ended AI infrastructure planning as a roadmap direction, not an immediate MVP blocker.
- Next implementation work should start with comparison clarity between public-sector AI compute hub and regional AI data center.
