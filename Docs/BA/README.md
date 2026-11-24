# Criterion: Business Analysis

## Architecture Decision Record

### Status

**Status:** Accepted. The analysis pack in this folder is submitted.

**Date:** 2026-08-18 (draft) → submitted

### Context

Krepton Analytics is a privacy-first hub: import, dashboard, rebalancing, and a scoped assistant. It does not connect to a bank and it does not tell the user what to buy.

### Decision

Document Krepton as a **privacy-first analytics hub**: in-scope import/dashboard/rebalancing/scoped AI; out-of-scope brokerage and advice. Section [01-project-overview](../thesis/docs/01-project-overview/index.md) is the BA body.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Broker-connected product | Forbidden by project rules; KYC and PSD2 |
| “AI that tells you what to buy” | MiFID / ethics; we use guardrails instead |
| Write the scope only in Russian notes | The thesis is in English |

## Files in this folder

| File | Contents |
|------|----------|
| [Business Analysis for “Krepton Analytics“.docx](<./Business Analysis for “Krepton Analytics“.docx>) | Full business analysis document |
| [BA_Barsukou_Uladzislau.docx](./BA_Barsukou_Uladzislau.docx) | Business analysis submission |
| [Personas.docx](./Personas.docx) | User personas |
| [Product value.docx](<./Product value.docx>) | Product value and KPIs |
| [Krepton_Backlog.xlsx](./Krepton_Backlog.xlsx) | Backlog: epics, stories, priorities |
| [Defense_Barsukou_Uladzislau.pptx](./Defense_Barsukou_Uladzislau.pptx) | Presentation slides |
| [diagrams/](./diagrams/) | Use case, context, activity, and SSD diagrams, UI mockups (PNG and PlantUML source) |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Vision / elevator pitch | ✅ | [index.md](../thesis/docs/index.md) |
| 2 | Problem statement | ✅ | [problem-and-goals.md](../thesis/docs/01-project-overview/problem-and-goals.md) |
| 3 | Goals and objectives | ✅ | same |
| 4 | Stakeholders | ✅ | [stakeholders.md](../thesis/docs/01-project-overview/stakeholders.md) |
| 5 | In / out of scope | ✅ | [scope.md](../thesis/docs/01-project-overview/scope.md) |
| 6 | Proposed solution + landscape | ✅ | [02-technical/index.md](../thesis/docs/02-technical/index.md) |
| 7 | Epics + user-story skeleton | ✅ | [features.md](../thesis/docs/01-project-overview/features.md) |
| 8 | Non-functional requirements | ✅ | features.md NFR table |
| 9 | Regulatory (GDPR, disclaimers) | ✅ | Privacy Policy in the app; the same boundary is in the analysis document |
| 10 | Use case diagram | ✅ | features.md and `Docs/BA/diagrams/` |
| 11 | BA max (matrix, KPIs, full stories, MoSCoW, risks) | ✅ | Documents in this folder |

## References

- [Thesis overview chapter](../thesis/docs/01-project-overview/index.md)
- [Diagrams](./diagrams/)
