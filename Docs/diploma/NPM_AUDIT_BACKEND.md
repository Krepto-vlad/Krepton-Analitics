# Backend npm audit (2026-08-18)

Command: `npm audit` in `backend/`. Diploma Backend min asks for a vulnerability check; this file is the evidence table.

| Package | Severity | Direct? | Action |
|---------|----------|---------|--------|
| **axios** | high (several GHSA in 1.17.x: DoS / prototype pollution) | yes | **Open** — `npm audit` reports fix in `>=1.18.0`. Bump in a dedicated change (`npm install axios@^1.18.0`) before CI quality gate. |
| **xlsx** (SheetJS community) | high (prototype pollution, ReDoS) | yes | **Accepted** — no patched community build on npm (`fixAvailable: false`). Mitigations: memory-only upload, `IMPORT_MAX_FILE_SIZE_BYTES`, row/column caps, no disk persist. Revisit if we switch to ExcelJS / a maintained fork. |
| brace-expansion, form-data, js-yaml, ip-address, fast-uri | high (transitive) | no | Fix when parent deps update; not imported by app code directly. |
| body-parser | low | no (Express) | Optional bump with Express line; not a diploma blocker. |
| hono, @hono/node-server | moderate | no | Transitive (likely yahoo-finance2 / tooling). Not our HTTP server. |

No **critical** findings on this run.

Re-run before expert Backend / CI: `npm audit --audit-level=high`.
