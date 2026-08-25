# Criterion: Automated Tests (70%+)

## Architecture Decision Record

### Status

**Status:** In progress (backend unit 70% in CI; FE RTL min done; Playwright e2e added, runs in CI against a real Postgres service)

**Date:** 2026-08-25

### Context

Backend min already asks 70% unit coverage. This criterion also wants integration tests, UI tests, CI execution, and a written strategy. Fake `expect(true)` tests are penalized.

### Decision

Jest for backend services, controllers, and middleware (Yahoo/Gemini/DB mocked). Frontend: Testing Library + engine unit tests. Coverage HTML/lcov is a **CI artifact**, not a committed folder.

Istanbul gate in `backend/jest.config.js`: statements, lines, and functions **≥ 70%**. Branches are not gated (~50% today). Husky `pre-push` and GitHub Actions both run `npm run test:coverage` in `backend/`.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Only Cypress later | RTL is enough for component min; e2e can be Playwright |
| Coverage from snapshots | Rubric −2 for tests that skip logic |
| Gate branches at 70% | Number is not honest yet; would fail CI |
| Manual-only testing | That is the *other* testing criterion, not declared |

### Consequences

**Positive:** One coverage number serves Backend min. Quality gate is real (CI fails under 70%). The Playwright job also doubles as the "one DB test" — it runs migrations + `seed:demo` against a real `services: postgres` container, so login → dashboard is exercised against actual Postgres, not mocks.  
**Negative:** The Jest HTTP integration suite (`httpApi.test.ts`) itself still does not hit Postgres — that gap is now covered by the Playwright job instead of a supertest test.  
**Neutral:** Mutation, Pact, k6, and FE coverage 70% are Auto tests **max** and **not claimed**. Target is 7–8 via gate + critical unit + thin pyramid (one DB-backed e2e + Playwright, same job). Qualitative/JMeter is a different criterion.

## How to run

```bash
# backend — fails if coverage < 70%
cd backend && npm run test:coverage
# HTML report: backend/coverage/index.html (gitignored)

# frontend
cd frontend && npm test
```

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Documented strategy | ✅ | This ADR |
| 2 | Coverage ≥ 70% + report | ✅ | Jest threshold; CI artifact `backend-coverage` (screenshot TBD) |
| 3 | Unit tests + edge cases | ✅ | Auth, portfolio, import, AI quota/chat, controllers |
| 4 | Integration (API, auth, DB) | ✅ | Jest HTTP: `/health`, 401 portfolio, 400 search (mocked). Playwright CI job: migrate + `seed:demo` + login → dashboard against a **real Postgres service container** |
| 5 | FE component and/or e2e | ✅ | RTL: ErrorBanner, AppErrorBoundary, RequireAuth, AsyncStatePanel, Skeleton; Playwright: `frontend/e2e/login.spec.ts` (route guard + login → dashboard smoke) |
| 6 | Tests in CI logs | ✅ | `.github/workflows/ci.yml` — `backend`, `frontend`, and `e2e` jobs |
| 7 | Naming / folders | ✅ | `*.test.ts` / `__tests__`; e2e in `frontend/e2e/*.spec.ts` |
| 8 | How to run locally | ✅ | Commands above |
| 9 | Max: coverage quality gate | ✅ | statements/lines/functions ≥ 70%; branches not gated |
| 10 | Max: screenshot green CI + coverage % | ❌ | Appendix |
| 11 | Max skip | — | No mutation, Pact, k6, Cypress, FE 70% gate, branch 70% gate |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Yahoo/Gemini mocked in unit tests | Not a live-market integration | Staging smoke later; keep mocks in CI |
| FE coverage not gated | Honest: RTL min, not 70% SPA | Do not gate |
| Jest HTTP suite still mocks the DB | `httpApi.test.ts` alone is not "API+Postgres" | Covered instead by the Playwright `e2e` CI job (real `services: postgres`) |
| Branches ~50% | Not the diploma counter | Leave ungated |

## References

- `backend/jest.config.js`
- [cicd.md](cicd.md)
