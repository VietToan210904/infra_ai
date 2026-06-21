# Dataset Source Candidates

This catalog lists realistic sources for expanding InfraAI SiteCompass beyond
the current OpenStreetMap baseline. Treat each source as a candidate until its
license, schema, freshness, coverage, and authority are reviewed.

## Already Implemented

### OpenStreetMap via Overpass API

- URL: https://wiki.openstreetmap.org/wiki/Overpass_API
- Status: implemented
- Data type: open-data infrastructure features
- Useful for: power plants, substations, transmission lines, telecom assets,
  schools, hospitals, government offices, transport corridors, water context
- Limitation: open-data proxy only; does not verify capacity, approval, legal
  zoning, permits, construction readiness, or AI readiness

## HCMC Official / Public-Sector Portals

### HCMC Data Portal

- URL: https://data.hochiminhcity.gov.vn/
- Status: candidate official source
- Useful for: city datasets, metadata, public-sector data discovery
- Notes: official city data portal. Some open-data access appears to route
  through a citizen/business open-data portal.

### HCMC Open Data Portal

- URL: https://opendata.hochiminhcity.gov.vn/
- Status: candidate official source
- Useful for: downloadable open datasets if available through the portal
- Notes: may require browser interaction and anti-bot verification.

### HCMC Department of Planning and Architecture

- URL: https://qhkt.hochiminhcity.gov.vn/
- Status: candidate official source
- Useful for: planning, architecture, zoning, planning lookup links
- Notes: source for official planning information and links to planning tools.

### HCMC Planning Lookup

- URL: https://gisxaydung.tphcm.gov.vn/
- Status: candidate official/interactive source
- Useful for: zoning and land-use verification
- Notes: likely interactive. Confirm whether official exports or APIs are
  allowed before ingesting.

### HCMC Digital Map Portal

- URL: https://bando.tphcm.gov.vn/
- Status: candidate official/interactive source
- Useful for: city basemap and civic spatial layers
- Notes: browser app. Confirm data access terms before ingesting.

### Vietnam National Construction Activity Database

- URL: https://csdlhdxd.gov.vn/
- Status: candidate official/interactive source
- Useful for: construction activity, permitting context, project records
- Notes: not a direct construction-readiness approval source by itself.

## Power / Grid

### EVN

- URL: https://www.evn.com.vn/
- Status: authority/provider source for requests
- Useful for: grid capacity verification, connection feasibility, utility
  approval evidence
- Notes: public pages provide news and system context. Actual grid capacity,
  feeder capacity, interconnection feasibility, and approval data should be
  requested from the utility/grid operator and cannot be inferred from OSM.

### WRI Global Power Plant Database

- URL: https://datasets.wri.org/datasets/global-power-plant-database
- Status: downloadable global source
- Useful for: power plant inventory, plant capacity, generation/fuel context
- Notes: not grid-capacity verification and not a substation capacity dataset.

### Global Energy Monitor Global Integrated Power Tracker

- URL: https://globalenergymonitor.org/projects/global-integrated-power-tracker
- Status: downloadable / dashboard source
- Useful for: power facilities, status, capacity, ownership, location accuracy
- Notes: global facility inventory; still not grid interconnection approval.

### OpenInfraMap

- URL: https://openinframap.org/
- Status: OSM-derived visual source
- Useful for: power and telecom infrastructure inspection
- Notes: based on OpenStreetMap; useful for QA, not an authority source.

## Network / Fibre / Telecom

### OpenCelliD

- URL: https://www.opencellid.org/
- Status: open cellular database with API access
- Useful for: cell tower / cellular coverage proxy
- Notes: does not verify fibre capacity, bandwidth, latency, or redundancy.

### Ookla Open Data

- URL: https://github.com/teamookla/ookla-open-data
- Status: downloadable global performance tiles
- Useful for: fixed/mobile speed and latency context
- Notes: performance measurements are useful for digital-access context, not
  fibre route/capacity verification.

### PeeringDB

- URL: https://www.peeringdb.com/
- Status: implemented API ingestion
- Useful for: IXPs, networks, data centers/facilities, carriers
- Notes: user-maintained interconnection data. Useful for network ecosystem
  context, not guaranteed provider capacity.

## Water / Cooling / Climate / Flood Context

### WRI Aqueduct

- URL: https://www.wri.org/aqueduct
- Status: open global water-risk data
- Useful for: water stress, flood and drought risk context
- Notes: useful for screening. Does not grant water rights or cooling permits.

### JRC Global Surface Water Explorer

- URL: https://global-surface-water.appspot.com/
- Status: open global surface-water dataset
- Useful for: historical surface-water extent and change
- Notes: surface water nearby does not prove cooling feasibility.

### Google Earth Engine Landsat 8 Collection 2 Level 2

- URL: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
- Status: remote-sensing source
- Useful for: land surface temperature and heat-context analysis
- Notes: requires geospatial processing. Heat context does not equal cooling
  feasibility.

## AI Readiness / Digital Capacity

### Oxford Insights Government AI Readiness Index

- URL: https://oxfordinsights.com/ai-readiness/government-ai-readiness-index-2025/
- Status: country-level benchmark
- Useful for: national AI readiness context
- Notes: country-level, not HCMC site-level readiness.

### ITU ICT Statistics

- URL: https://www.itu.int/en/ITU-D/Statistics/Pages/publications/wtid.aspx
- Status: international ICT indicator source
- Useful for: national telecom/digital-access indicators
- Notes: usually not city/block-level and not fibre-capacity verification.

### Vietnam National Statistics Office

- URL: https://www.nso.gov.vn/
- Status: official statistical source
- Useful for: population, workforce, education, economic indicators
- Notes: useful for context. City-level AI readiness still needs a defined
  methodology and reviewed local indicators.

## Request-Only / Provider-Only Evidence

These are the datasets most likely needed for true verification:

- Utility/grid operator capacity at substations, feeders, and interconnection
  points
- Telecom provider fibre routes, PoPs, bandwidth, latency, redundancy, and SLA
  evidence
- Official zoning polygons with permitted-use classes and effective dates
- Permit records and approval/condition status
- Engineering review packages covering geotechnical, access, utilities,
  cooling, water, environmental, and procurement readiness
- Local AI readiness survey or official city digital-transformation metrics

Until those are supplied, the frontend should keep the corresponding
verification layers marked `Needs data`.
