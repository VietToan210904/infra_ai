# HCMC Verification GeoJSON Templates

Use this folder as a contract for official or provider-supplied verification
layers. These files are intentionally not generated from OpenStreetMap.

Expected processed file names:

- `grid_capacity_verification.geojson`
- `fiber_capacity_verification.geojson`
- `cooling_feasibility_verification.geojson`
- `zoning_verification.geojson`
- `permitting_status.geojson`
- `construction_readiness.geojson`
- `ai_readiness_assessment.geojson`

Put reviewed files in `data/processed/verification/hcmc/`, validate them, then
copy them into `apps/web/public/data/verification/hcmc/`.

```bash
python3 scripts/validate_verification_geojson.py --input data/processed/verification/hcmc
python3 scripts/copy_verification_geojson_to_web.py
```

After validated files exist, update the matching layer in
`apps/web/src/data/infrastructureLayerRegistry.ts` from `needs_data` to
`available`, and set source/confidence/completeness to match the actual source.
