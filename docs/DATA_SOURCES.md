# Data Sources

InfraAI SiteCompass now includes a real-data satellite-map foundation for
open-data infrastructure inspection. These layers support early exploration
only. They do not provide scoring, AI-generated recommendations, construction
approval, or engineering-grade validation.

## Current Implemented Source

### OpenStreetMap via Overpass API

- Source: OpenStreetMap
- Access method: Overpass API
- Source type: open data
- Source confidence: medium
- Data completeness: unknown
- Current default city: Ho Chi Minh City / Saigon
- Default bbox: south `10.35`, west `106.35`, north `11.20`, east `107.10`

Default limitation:

```text
OpenStreetMap data may be incomplete or outdated and must be validated before planning or investment decisions.
```

### Synthetic Demo Fixtures

- Source: repo-generated demo GeoJSON
- Access method: local files in `data/processed/external/hcmc/` and
  `data/processed/verification/hcmc/`
- Source type: synthetic
- Source confidence: low
- Data completeness: partial

Synthetic fixtures fill missing AI-infrastructure components so the frontend
can show a complete planning workflow before real provider or authority data is
available. They are always labeled synthetic and must not be treated as
verification evidence.

## Current Implemented Layer Categories

Power infrastructure:

- Power plants: `power=plant`
- Substations: `power=substation`
- Transmission lines: `power=line`

Network infrastructure:

- Telecom masts: `man_made=mast`
- Communication towers: `tower:type=communication`
- Telecom-tagged assets: `telecom=*`
- Existing data-center-like assets where tagged: `telecom=data_center`, `building=data_center`, `man_made=data_center`
- PeeringDB interconnection facilities where coordinates are available
- Synthetic fibre corridors, cellular observations, and fixed/mobile network
  performance placeholders where provider or Ookla/OpenCelliD files are not yet
  loaded

Innovation and human-capacity context:

- Research institutes: `amenity=research_institute`
- Research offices: `office=research`
- IT offices: `office=it`
- Synthetic workforce, digital-access, AI-literacy, and population-density
  placeholders for AI-readiness exploration

Public-service infrastructure:

- Schools: `amenity=school`
- Universities: `amenity=university`
- Colleges: `amenity=college`
- Hospitals: `amenity=hospital`
- Clinics: `amenity=clinic`
- Government offices: `office=government`
- Town halls / civic offices: `amenity=townhall`
- Public safety facilities: `amenity=police`, `amenity=fire_station`

Land, water, and logistics context:

- Industrial zones: `landuse=industrial`, `industrial=*`
- Transport corridors: `highway=motorway`, `highway=trunk`, `highway=primary`, `railway=rail`
- Water context: `natural=water`, `water=reservoir`, `landuse=reservoir`, `waterway=river`, `waterway=canal`
- Synthetic flood, heat, water-availability, zoning, protected-land, and
  water-risk placeholders for risk screening

## Current Limitations

- OSM may be incomplete or outdated.
- No authoritative grid-capacity validation is included.
- No fibre availability, bandwidth, latency, or redundancy validation is included.
- No zoning or land-use validation is included.
- No water or cooling feasibility validation is included.
- No official data-center inventory or operator validation is included.
- No road, rail, or logistics capacity validation is included.
- No workforce, research, or institutional capacity scoring is included.
- No permitting, procurement, cybersecurity, or public consultation validation is included.
- No AI readiness scoring is calculated yet.
- Synthetic verification layers are demo placeholders only and do not prove site
  feasibility.
- Open-data proximity does not mean a site can connect to infrastructure.
- Open-data infrastructure visibility does not mean construction readiness.

## Verification Data Requirements

The frontend includes synthetic demo fixtures for:

- Synthetic grid capacity
- Synthetic fibre capacity
- Synthetic cooling feasibility
- Synthetic zoning
- Synthetic permitting status
- Synthetic construction readiness
- Synthetic AI readiness

These layers are intentionally not generated from OpenStreetMap and are not real
verification evidence. They must be replaced with official, provider,
engineering, or human-reviewed planning evidence before they can support any
planning claim. See
`docs/VERIFICATION_DATA_REQUIREMENTS.md` for the GeoJSON contract, validation
script, expected file names, and responsible-use rules.

Potential source candidates are cataloged in
`docs/DATASET_SOURCE_CANDIDATES.md`.

## Running the OSM Ingestion

From the repo root:

```bash
python3 services/data-pipelines/ingest_osm_overpass.py --city hcmc
```

With a custom bbox:

```bash
python3 services/data-pipelines/ingest_osm_overpass.py \
  --bbox 10.35 106.35 11.20 107.10 \
  --output data/processed/osm/hcmc
```

The script writes:

- `data/processed/osm/hcmc/power_plants.geojson`
- `data/processed/osm/hcmc/substations.geojson`
- `data/processed/osm/hcmc/transmission_lines.geojson`
- `data/processed/osm/hcmc/telecom_assets.geojson`
- `data/processed/osm/hcmc/existing_data_centers.geojson`
- `data/processed/osm/hcmc/tech_research_facilities.geojson`
- `data/processed/osm/hcmc/education_facilities.geojson`
- `data/processed/osm/hcmc/healthcare_facilities.geojson`
- `data/processed/osm/hcmc/government_facilities.geojson`
- `data/processed/osm/hcmc/public_safety_facilities.geojson`
- `data/processed/osm/hcmc/industrial_zones.geojson`
- `data/processed/osm/hcmc/transport_corridors.geojson`
- `data/processed/osm/hcmc/water_context.geojson`

## Serving GeoJSON in the Frontend

Copy processed files into the Vite public directory:

```bash
python3 scripts/copy_osm_geojson_to_web.py
```

The frontend then fetches:

- `/data/osm/hcmc/power_plants.geojson`
- `/data/osm/hcmc/substations.geojson`
- `/data/osm/hcmc/transmission_lines.geojson`
- `/data/osm/hcmc/telecom_assets.geojson`
- `/data/osm/hcmc/existing_data_centers.geojson`
- `/data/osm/hcmc/tech_research_facilities.geojson`
- `/data/osm/hcmc/education_facilities.geojson`
- `/data/osm/hcmc/healthcare_facilities.geojson`
- `/data/osm/hcmc/government_facilities.geojson`
- `/data/osm/hcmc/public_safety_facilities.geojson`
- `/data/osm/hcmc/industrial_zones.geojson`
- `/data/osm/hcmc/transport_corridors.geojson`
- `/data/osm/hcmc/water_context.geojson`

Synthetic and external files are copied with:

```bash
python3 scripts/copy_external_geojson_to_web.py
python3 scripts/copy_verification_geojson_to_web.py
```

Run the frontend:

```bash
npm run dev
```

## Running External Source Ingestion

Fetch public PeeringDB facility and exchange records:

```bash
python3 services/data-pipelines/ingest_peeringdb.py --city hcmc
python3 scripts/copy_external_geojson_to_web.py
```

The current PeeringDB run produced:

- `data/processed/external/hcmc/peeringdb_facilities.geojson`
- `data/processed/external/hcmc/peeringdb_exchanges.geojson`

Convert WRI Global Power Plant Database CSV or ZIP after downloading it:

```bash
python3 services/data-pipelines/ingest_wri_power_plants.py \
  --input path/to/global_power_plant_database.csv
```

Convert an OpenCelliD CSV export:

```bash
python3 services/data-pipelines/ingest_opencellid.py \
  --input path/to/opencellid_export.csv
```

Download and convert Ookla fixed or mobile performance tiles:

```bash
python3 services/data-pipelines/ingest_ookla_open_data.py \
  --service fixed \
  --year 2024 \
  --quarter 4

python3 services/data-pipelines/ingest_ookla_open_data.py \
  --service mobile \
  --year 2024 \
  --quarter 4
```

Ookla files can be large. For a quick parser smoke test, use `--max-features`.

## Validating Future Verification Layers

Place reviewed authority/provider GeoJSON files, or clearly marked synthetic
fixtures, in:

```text
data/processed/verification/hcmc/
```

Validate them:

```bash
python3 scripts/validate_verification_geojson.py --input data/processed/verification/hcmc
```

Copy them to the frontend:

```bash
python3 scripts/copy_verification_geojson_to_web.py
```

After validation, copy the files to the frontend. If a synthetic fixture is
replaced by real evidence, update the matching layer config in
`apps/web/src/data/infrastructureLayerRegistry.ts` with the actual source,
source type, confidence, completeness, label, and limitation.

## Future Possible Sources

- WRI Global Power Plant Database
- OpenCelliD
- Local government open data portals
- Flood, heat, and environmental risk datasets
- Zoning and land-use datasets
- Census, workforce, and education datasets
- User-uploaded authoritative planning documents

## Responsible Use

This platform supports early planning only. It does not approve construction,
allocate public funding, guarantee grid capacity, confirm fibre access, replace
engineering review, replace environmental review, replace cybersecurity review,
replace procurement review, or replace public consultation.
