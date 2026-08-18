# Criterion: Automated Tests (70%+)

## Architecture Decision Record

### Status

**Status:** In progress (backend unit 70% in CI; FE RTL min done; e2e still thin)

**Date:** 2026-08-18

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

**Positive:** One coverage number serves Backend min.  
**Negative:** Auto-tests **min** still wants a real integration path and more FE tests.

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
| 2 | Coverage ≥ 70% + report | ✅ | Jest threshold; CI artifact `backend-coverage` |
| 3 | Unit tests + edge cases | ✅ | Auth, portfolio, import, AI quota/chat, controllers |
| 4 | Integration (API, auth, DB) | ❌ | `stocks.test.ts` is still a placeholder |
| 5 | FE component and/or e2e | ✅ | 3 RTL: ErrorBanner, AppErrorBoundary, RequireAuth (Playwright extra) |
| 6 | Tests in CI logs | ✅ | `.github/workflows/ci.yml` |
| 7 | Naming / folders | ✅ | `*.test.ts` / `__tests__` |
| 8 | How to run locally | ✅ | Commands above |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Yahoo mocked in unit tests | Not a live-market integration | Staging smoke later |
| FE coverage not gated | Auto tests min | RTL min done; gate later if needed |
| No test DB | Integration hole | D3 |

## References

- `backend/jest.config.js`
- [cicd.md](cicd.md)
