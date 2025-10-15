# NLT AOI Tool

Standalone Area of Interest (AOI) microservice for IMPACT. Deployed to AWS Lambda via Serverless Framework. Exposes a single POST `/aoi` endpoint that accepts GeoJSON and a list of operations.

## API

POST `/aoi`

Request body:
```json
{
  "aoi": { /* GeoJSON Geometry | Feature | FeatureCollection */ },
  "operations": [
    { "op": "validate" },
    { "op": "bbox" },
    { "op": "simplify", "tolerance": 0.001 },
    { "op": "buffer", "tolerance": 500, "units": "meters" }
  ]
}
```

Response:
```json
{
  "valid": true,
  "result": { /* GeoJSON */ },
  "bbox": [minX, minY, maxX, maxY]
}
```

## Development

- Node 20+; `nvm use`
- Install: `npm i`
- Test: `npm test`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Package: `npm run build`

## Deployment

- Ensure AWS credentials are configured (role with Lambda/CloudFormation permissions)
- Deploy: `npm run deploy -- --stage dev`
- Remove: `npm run remove -- --stage dev`

## CI/CD

This repo includes GitHub Actions to run tests and lint on PRs, and optionally deploy on merge to `main` if AWS credentials are added as secrets.

## Project Kanban

Create a GitHub Project (Beta) and enable auto-add for new issues/PRs. Use labels `bug` and `enhancement` from issue templates.
