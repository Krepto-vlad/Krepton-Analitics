# Criterion: Business Analysis

## Architecture Decision Record

### Status

**Status:** Accepted. The committee packet is submitted.

**Date:** 2026-08-18 (draft) → submitted

### Context

Krepton Analytics is a privacy-first hub: import, dashboard, rebalancing, and a scoped assistant. It does not connect to a bank and it does not tell the user what to buy.

### Decision

Document Krepton as a **privacy-first analytics hub**: in-scope import/dashboard/rebalancing/scoped AI; out-of-scope brokerage and advice. Section [01-project-overview](../../01-project-overview/index.md) is the BA body.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Broker-connected product | Forbidden by project rules; KYC and PSD2 |
| “AI that tells you what to buy” | MiFID / ethics; we use guardrails instead |
| Write the scope only in Russian notes | The thesis is in English |

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
| 9 | Regulatory (GDPR, disclaimers) | ✅ | Privacy Policy in the app; the same boundary is in the submitted packet |
| 10 | Use case diagram | ✅ | features.md and `Docs/BA/diagrams/` |
| 11 | BA max (matrix, KPIs, full stories, MoSCoW, risks) | ✅ | Submitted packet in `Docs/BA/` |

## References

- `Docs/BA/` — analysis pack and diagrams
