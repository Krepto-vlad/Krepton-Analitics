# Criterion: Business Analysis

## Architecture Decision Record

### Status

**Status:** Proposed (committee packet — fill remaining BA max items after topic approval)

**Date:** 2026-08-18

### Context

The course requires a separate BA defense. The product exists as a POC; this section is the shared language for committee, experts, and the thesis. Without written scope, reviewers would treat bank-API or “AI advisor” expectations as in-scope.

### Decision

Document Krepton as a **privacy-first analytics hub**: in-scope import/dashboard/rebalancing/scoped AI; out-of-scope brokerage and advice. Section [01-project-overview](../../01-project-overview/index.md) is the BA body.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Broker-connected product | Forbidden by project rules; KYC and PSD2 |
| “AI that tells you what to buy” | MiFID / ethics; we use guardrails instead |
| Write BA only in Russian working notes | Thesis language is English; reviewers read this folder |

### Consequences

**Positive:** Clear non-goals reduce expert scope fights.  
**Negative:** BA max (personas matrix, full user-story fields, MoSCoW everywhere) is not finished.  
**Neutral:** Product docs in `Docs/` remain internal and are not the submission.

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Vision / elevator pitch | ✅ | [index.md](../../index.md) |
| 2 | Problem statement | ✅ | [problem-and-goals.md](../../01-project-overview/problem-and-goals.md) |
| 3 | Goals and objectives | ✅ | same |
| 4 | Stakeholders | ✅ | [stakeholders.md](../../01-project-overview/stakeholders.md) |
| 5 | In / out of scope | ✅ | [scope.md](../../01-project-overview/scope.md) |
| 6 | Proposed solution + landscape | ✅ | [02-technical/index.md](../index.md) |
| 7 | Epics + user-story skeleton | ✅ | [features.md](../../01-project-overview/features.md) |
| 8 | Non-functional requirements | ✅ | features.md NFR table |
| 9 | Regulatory (GDPR, disclaimers) | ⚠️ | Overview here; legal PDFs live with the app |
| 10 | Use case diagram | ✅ | features.md |
| 11 | BA max (matrix, KPIs, full stories, MoSCoW, risks) | ❌ | After topic approval if targeting 10 |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| KPIs still qualitative | Weaker BA-max grade | Add measurable targets when staging exists |

## References

- `Docs/BA/` — analysis pack and diagrams
