# Agent scripts

All scripts run in **bun** inside GitHub Actions. They read env vars from workflow secrets and dump JSON to `./out/` which is uploaded as an artifact.

## Contract
Each `fetch-*.ts` script:
- Reads its required secrets from `process.env`.
- Accepts CLI args via `process.argv` for date ranges / filters.
- Writes `./out/{name}.json` with shape `{ source, fetchedAt, ok, error?, data }`.
- Exits 0 on success (even if `ok:false` in the JSON) so one bad source doesn't fail the whole run.
- Never logs secrets. Never writes secrets to disk.

## Adding a new source
1. Copy an existing script.
2. Add the secret to `agent-fetch-data.yml` env block.
3. Add the source to `package-report.ts`.
4. Document the secret in `docs/AGENT_SETUP.md`.