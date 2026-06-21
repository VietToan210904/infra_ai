# Verification Data Requirements

InfraAI SiteCompass can show open-data infrastructure context today. It cannot
verify grid capacity, fibre capacity, cooling feasibility, zoning, permitting,
construction readiness, or AI readiness from OpenStreetMap alone.

The frontend now includes disabled verification-layer slots. They are marked
`Needs data` until a city, utility, telecom provider, engineering team, or
reviewed planning document supplies evidence.

## Files

Put processed verification GeoJSON here:

```text
data/processed/verification/hcmc/
```

Serve validated files to the frontend here:

```text
apps/web/public/data/verification/hcmc/
```

Expected file names:

- `grid_capacity_verification.geojson`
- `fiber_capacity_verification.geojson`
- `cooling_feasibility_verification.geojson`
- `zoning_verification.geojson`
- `permitting_status.geojson`
- `construction_readiness.geojson`
- `ai_readiness_assessment.geojson`

## Required Feature Properties

Every feature should include:

```json
{
  "name": "Asset or review area name",
  "asset_type": "grid_capacity | fiber_capacity | cooling_feasibility | zoning | permit | construction_readiness | ai_readiness",
  "category": "verification",
  "source": "Official agency, utility, provider, or reviewed document source",
  "source_type": "authoritative",
  "source_confidence": "low | medium | high",
  "data_completeness": "unknown | partial | good",
  "data_limitation": "Specific limitation for this evidence",
  "verification_status": "verified | partial | needs_review | rejected",
  "evidence_source": "Source URL, document ID, provider dataset name, or upload reference",
  "evidence_type": "official_dataset | provider_dataset | engineering_report | permit_record | reviewed_document",
  "evidence_date": "YYYY-MM-DD",
  "review_owner": "Person or team that reviewed the evidence",
  "last_reviewed": "YYYY-MM-DD"
}
```

## Layer Evidence

Grid capacity verification:

- Needs utility or grid-operator data.
- Should include available capacity, voltage, interconnection point, service
  territory, and review date when available.
- OSM power lines and substations are not enough.

Fibre capacity verification:

- Needs telecom provider, broadband authority, IXP, or licensed network data.
- Should include fibre route, point of presence, bandwidth, latency,
  redundancy, and service caveats when available.
- Towers and masts do not verify fibre service.

Cooling feasibility verification:

- Needs hydrology, climate, water-rights, environmental, and engineering data.
- Should include water availability, thermal constraints, flood/heat risk, and
  permit dependency when available.
- Surface-water proximity is only context.

Zoning verification:

- Needs official planning, cadastral, land-use, protected-land, or restricted
  area data.
- Should include legal zoning class, effective date, permitted uses, and
  restrictions when available.
- OSM land-use tags are not legal zoning.

Permitting status:

- Needs official permit portal, agency, or reviewed uploaded document evidence.
- Should include permit type, status, issuing authority, dates, and unresolved
  conditions when available.

Construction readiness:

- Needs human-reviewed engineering, legal, environmental, procurement, land
  control, site-access, and utility evidence.
- This app must not infer construction readiness automatically.

AI readiness assessment:

- Needs reviewed workforce, digital access, cybersecurity, data governance,
  public-service adoption, procurement, and institutional evidence.
- This app does not calculate AI readiness from OSM data.

## Validate and Copy

Validate provided files:

```bash
python3 scripts/validate_verification_geojson.py --input data/processed/verification/hcmc
```

Require all expected files:

```bash
python3 scripts/validate_verification_geojson.py --input data/processed/verification/hcmc --strict
```

Copy validated files to the frontend:

```bash
python3 scripts/copy_verification_geojson_to_web.py
```

After validation, update the matching layer in
`apps/web/src/data/infrastructureLayerRegistry.ts` from `needs_data` to
`available`, and set the source/confidence/completeness fields to match the
actual dataset.

## Responsible Use

Verification layers support review and planning workflow only. They do not
approve construction, allocate funding, grant permits, guarantee service
connection, or replace engineering, environmental, cybersecurity, procurement,
legal, or public consultation review.
