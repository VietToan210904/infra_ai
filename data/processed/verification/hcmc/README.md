# HCMC Synthetic Verification Fixtures

These GeoJSON files are synthetic demo fixtures for frontend exploration only.
They are not utility, telecom, authority, engineering, permit, construction, or
investment evidence.

Use them when real provider or authority data is not available yet, but keep the
map labels and metadata clearly marked as synthetic.

```bash
python scripts/validate_verification_geojson.py --input data/processed/verification/hcmc
python scripts/copy_verification_geojson_to_web.py
```
