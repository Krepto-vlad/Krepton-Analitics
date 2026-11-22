# Criterion: Automated Tests (70%+)

## Architecture Decision Record

### Status

**Status:** Accepted. Backend coverage gate is 80% on statements, lines, and functions.

**Date:** 2026-08-25

### Context

Jest covers backend services, controllers, and middleware. React Testing Library covers frontend components. Playwright covers login against Postgres. Coverage is produced in CI.

### Decision

Jest for backend services, controllers, and middleware (Yahoo/Gemini/DB mocked). Frontend: Testing Library + engine unit tests. Coverage HTML/lcov is a **CI artifact**, not a committed folder.

Istanbul gate in `backend/jest.config.js`: statements, lines, and functions **≥ 80%**. Husky `pre-push` and GitHub Actions both run `test:coverage` in `backend/` and `frontend/`.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Only Cypress later | Component tests use Testing Library; the login flow uses Playwright |
| Coverage from snapshots | Tests have to exercise the logic, not only a stored snapshot |

## How to run

```bash
# backend — fails if coverage < 80%
cd backend && npm run test:coverage
# HTML report: backend/coverage/index.html (gitignored)

# frontend coverage report
cd frontend && npm run test:coverage
```

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Documented strategy | ✅ | This ADR |
| 2 | Coverage ≥ 70% + report | ✅ | Jest threshold **80%**; CI artifact `backend-coverage` |
| 3 | Unit tests + edge cases | ✅ | Auth, portfolio, import, AI quota/chat, controllers |
| 4 | Integration (API, auth, DB) | ✅ | Jest HTTP: `/health`, 401 portfolio, 400 search (mocked). Playwright CI job: migrate + `seed:demo` + login → dashboard against a **real Postgres service container** |
| 5 | FE component and/or e2e | ✅ | RTL: ErrorBanner, AppErrorBoundary, RequireAuth, AsyncStatePanel, Skeleton; Playwright: `frontend/e2e/login.spec.ts` (route guard + login → dashboard smoke) |
| 6 | Tests in CI logs | ✅ | `.github/workflows/ci.yml` — `backend`, `frontend`, and `e2e` jobs |
| 7 | Naming / folders | ✅ | `*.test.ts` / `__tests__`; e2e in `frontend/e2e/*.spec.ts` |
| 8 | How to run locally | ✅ | Commands above |
| 9 | Max: coverage quality gate | ✅ | statements, lines, and functions ≥ 80% |

## References

- `backend/jest.config.js`
- [cicd.md](cicd.md)
