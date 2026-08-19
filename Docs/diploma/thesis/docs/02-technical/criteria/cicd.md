# Criterion: CI/CD

## Architecture Decision Record

### Status

**Status:** Accepted (CI on GitHub Actions; CD after Azure)

**Date:** 2026-08-18

### Context

Experts want automatic lint, build, and tests on push/PR, with at least a simple CD path. Husky is local-only and does not count as CI.

### Decision

GitHub Actions workflow `.github/workflows/ci.yml`:

- **backend:** lint, Prettier check, `tsc`, Jest with **70% coverage gate**, upload `coverage/` (HTML + lcov).
- **frontend:** lint, Prettier check, production build, Jest (no 70% gate yet).
- **audit:** `npm audit --audit-level=critical` per package; JSON report uploaded.
- **docker:** `docker compose config` plus `docker build` for API and web (no registry push).

Triggers: `push` to `main` / `master` / `develop`, and every `pull_request`. npm cache via `package-lock.json`. Jobs fail on lint/build/test errors.

Local push: Husky `pre-push` also runs lint, format check, and `backend` `test:coverage` so a red coverage number never reaches GitHub.

CD (`workflow_dispatch` → Azure) waits for phase D4. That is the remaining CI/CD **min** hole.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Only Husky | Not CI; not visible to experts |
| Manual FTP of `dist` | Forbidden by the rubric |
| Full Kubernetes CD | Other criteria; YAGNI |
| Fail CI on every `npm audit` high | `xlsx` has no patched community build; we fail on **critical** and record high in the artifact |

### Consequences

**Positive:** Same pipeline serves Backend coverage + Auto tests logs.  
**Negative:** `pre-push` is slower (~20 s Jest). Frontend coverage is not gated.

## Pipeline

```mermaid
flowchart LR
  push[push / PR] --> lint[Lint + Prettier]
  lint --> build[Build FE + BE]
  build --> test[Jest]
  test --> cov[Backend coverage ≥ 70%]
  cov --> art[Artifacts: HTML coverage, audit JSON]
  push --> docker[Compose config + docker build]
```

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Pipeline diagram | ✅ | Mermaid above; [deployment.md](../deployment.md) |
| 2 | Tool described | ✅ | GitHub Actions |
| 3 | CI ≥ 3 stages (lint, build, test) | ✅ | `.github/workflows/ci.yml` |
| 4 | Some CD (even manual trigger) | ❌ | After Azure exists |
| 5 | Auto on push/PR + dependency cache | ✅ | `on.push` / `on.pull_request`; `cache: npm` |
| 6 | Artifacts | ✅ | `backend-coverage`, `npm-audit-*`, `*-dist` |
| 7 | Fail on error | ✅ | Non-zero Jest/lint/build/docker build fails the job |
| 8 | Secrets store, not YAML | ⚠️ | No secrets in YAML; Actions secrets when CD exists |
| 9 | Security scan (`npm audit`) | ✅ | `audit` job + working note |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| No CD job | CI/CD min incomplete | Phase D4 |

## References

- `.github/workflows/ci.yml`
- `.husky/pre-push`
- [deployment.md](../deployment.md)
- [automated-tests.md](automated-tests.md)
