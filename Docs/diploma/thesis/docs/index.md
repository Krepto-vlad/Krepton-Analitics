<!-- prev: none | next: 01-project-overview/index.md -->

# Krepton Analytics

## Project Information

| Field | Value |
|-------|-------|
| **Student** | [Full Name] |
| **Group** | [Group Number] |
| **Supervisor** | [Supervisor Name] |
| **Date** | [Submission Date] |

## Links

| Resource | URL |
|----------|-----|
| Production | [Deployed Application URL — Azure, phase D4] |
| Repository | [GitHub URL] |
| API Docs | `backend/openapi.yaml` (Swagger UI in non-prod) |
| Design | [Figma URL if published] |

## Elevator Pitch

Krepton Analytics is a privacy-first web hub for retail investors who already hold positions at a broker. It does not execute trades and does not connect to bank APIs. The investor imports a broker report or adds positions manually, then sees allocation, drift, rebalancing math, and optional AI explanations (news briefing and ticker chat) with explicit “not investment advice” disclaimers. Market data is proxied from public sources (Yahoo Finance) on the backend. The user database stores an email and a password hash — no real names or account numbers.

## Evaluation Criteria Checklist

| # | Criterion | Status | Documentation |
|---|-----------|--------|---------------|
| 1 | Business Analysis | ⚠️ draft | [business-analysis.md](02-technical/criteria/business-analysis.md) |
| 2 | Backend | ⚠️ in progress | [backend.md](02-technical/criteria/backend.md) |
| 3 | Frontend | ⚠️ in progress | [frontend.md](02-technical/criteria/frontend.md) |
| 4 | Database | ⚠️ in progress | [database.md](02-technical/criteria/database.md) |
| 5 | AI Assistant / Chatbot | ⚠️ in progress | [ai-assistant.md](02-technical/criteria/ai-assistant.md) |
| 6 | Cloud | ❌ not deployed yet | [cloud.md](02-technical/criteria/cloud.md) |
| 7 | CI/CD | ⚠️ partial | [cicd.md](02-technical/criteria/cicd.md) |
| 8 | Automated tests 70%+ | ⚠️ partial | [automated-tests.md](02-technical/criteria/automated-tests.md) |

Status is for the student tracker. Before expert slots, replace ⚠️/❌ with evidence links (coverage report, public URL, diagrams).

## Documentation Navigation

- [Project Overview](01-project-overview/index.md) — business context, goals, and BA material
- [Technical Implementation](02-technical/index.md) — architecture, stack, and criterion ADRs
- [User Guide](03-user-guide/index.md) — how to use the application
- [Retrospective](04-retrospective/index.md) — limitations and lessons (fill before defense)
- [Appendices](appendices/index.md) — glossary, API, database schema

---

*Last updated: 2026-08-18*
