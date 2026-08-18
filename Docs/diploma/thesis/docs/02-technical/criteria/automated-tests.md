# Criterion: Automated Tests (70%+)

## Architecture Decision Record

### Status

**Status:** Proposed (raise coverage, add integration + e2e)

**Date:** 2026-08-18

### Context

Backend min already asks 70% unit coverage. This criterion also wants integration tests, UI tests, CI execution, and a written strategy. Fake `expect(true)` tests are penalized.

### Decision

Jest for backend services (auth, rebalancing, parsers, FX, chat scope, quote cache) and frontend components (Testing Library). One Playwright (or RTL) happy path. Coverage HTML as CI artifact. Document gaps (Yahoo mocked in unit tests).

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Only Cypress later | RTL is enough for component min; e2e can be Playwright |
| Coverage from snapshots | Rubric −2 for tests that skip logic |
| Manual-only testing | That is the *other* testing criterion, not declared |

### Consequences

**Positive:** One coverage number serves Backend + this criterion.  
**Negative:** Threshold in CI must wait until the number is honestly ≥ 70%.  

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Documented strategy | ⚠️ | This ADR |
| 2 | Coverage ≥ 70% + report | ❌ | `npm run test:coverage` |
| 3 | Unit tests + edge cases | ⚠️ | Some service tests exist |
| 4 | Integration (API, auth, DB) | ❌ | |
| 5 | FE component and/or e2e | ❌ | Replace stub Dashboard test |
| 6 | Tests in CI logs | ❌ | Depends on Actions |
| 7 | Naming / folders | ✅ | `*.test.ts` / `__tests__` |
| 8 | How to run locally | ✅ | `npm test` in `frontend/` and `backend/` |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Yahoo in e2e | Flaky network | Mock at unit; smoke against staging later |
| Coverage unknown | Cannot claim min | Measure, then enable `--coverageThreshold` |

## References

- `backend` / `frontend` Jest configs
- [cicd.md](cicd.md)
