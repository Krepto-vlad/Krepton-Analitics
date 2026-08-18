# Criterion: CI/CD

## Architecture Decision Record

### Status

**Status:** Proposed (pipeline on GitHub Actions)

**Date:** 2026-08-18

### Context

Experts want automatic lint, build, and tests on push/PR, with at least a simple CD path. Husky is local-only and does not count as CI.

### Decision

GitHub Actions: lint + format check + build + Jest. Cache npm. Fail the job on errors. `npm audit` job. CD may be `workflow_dispatch` to Azure. Docker **build** in CI is allowed as a compile check even if Containerization is undeclared.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Only Husky | Not CI; not visible to experts |
| Manual FTP of `dist` | Forbidden by the rubric |
| Full Kubernetes CD | Other criteria; YAGNI |

### Consequences

**Positive:** Same pipeline serves Auto tests.  
**Negative:** Workflow file must exist and stay green.  

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Pipeline diagram | ⚠️ | [deployment.md](../deployment.md) |
| 2 | Tool described | ✅ | GitHub Actions (target) |
| 3 | CI ≥ 3 stages (lint, build, test) | ❌ | Add `.github/workflows/` |
| 4 | Some CD (even manual trigger) | ❌ | After Azure exists |
| 5 | Auto on push/PR + dependency cache | ❌ | |
| 6 | Artifacts | ❌ | |
| 7 | Fail on error | ❌ | |
| 8 | Secrets store, not YAML | ⚠️ | Policy yes; Actions secrets when CD exists |
| 9 | Security scan (`npm audit`) | ⚠️ | Local note; job TBD |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| No workflow yet | CI/CD min | Phase D0.4 |

## References

- [deployment.md](../deployment.md)
- [automated-tests.md](automated-tests.md)
