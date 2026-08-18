# Backend npm audit (2026-08-18, axios bump same day)

Command: `npm audit` in `backend/`. Diploma Backend min asks for a vulnerability check; this file is the evidence table.

CI: `.github/workflows/ci.yml` job `audit` fails the pipeline on **critical** advisories and uploads the JSON report for high/moderate. High findings that we accept (xlsx) must not block merge.

| Package | Severity | Direct? | Action |
|---------|----------|---------|--------|
| **axios** | — | yes | **Fixed** — bumped to `^1.19.0` (GHSA in 1.17.x). |
| **xlsx** (SheetJS community) | high | yes | **Accepted** — no patched community build on npm (`fixAvailable: false`). Mitigations: memory-only upload, `IMPORT_MAX_FILE_SIZE_BYTES`, row/column caps, no disk persist. Revisit if we switch to ExcelJS / a maintained fork. |
| brace-expansion, js-yaml, ip-address, fast-uri | high | no | Transitive (eslint / istanbul / tooling). Not imported by app code. Track parent updates. |
| body-parser | low | no (Express) | Optional bump with Express line. |
| hono, @hono/node-server | moderate | no | Transitive (yahoo-finance2 / tooling). Not our HTTP server. |

No **critical** findings on this run.

Re-run: `npm audit --audit-level=critical` (CI gate) and `npm audit --audit-level=high` (review).
