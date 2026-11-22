

# Krepton Analytics

## Project Information

| Field          | Value               |
| -------------- | ------------------- |
| **Student**    | Uladzislau Barsukou |
| **Group**      | 23-HR-JS1           |
| **Supervisor** | Katsiaryna Shylina  |

## Links

| Resource | URL |
|----------|-----|
| Production | [https://www.kreptonanalytics.com](https://www.kreptonanalytics.com) |
| API | [https://api.kreptonanalytics.com](https://api.kreptonanalytics.com) |
| Repository | [https://github.com/Krepto-vlad/Krepton-Analitics](https://github.com/Krepto-vlad/Krepton-Analitics) |
| API Docs | `backend/openapi.yaml` (Swagger UI in non-prod) |
| Design | [Figma URL if published] |

## Elevator Pitch

Krepton Analytics is a privacy-first web hub for retail investors who already hold positions at a broker. It does not execute trades and does not connect to bank APIs. The investor imports a broker report or adds positions manually, then sees allocation, drift, rebalancing math, and optional AI explanations (news briefing and ticker chat) with explicit “not investment advice” disclaimers. Market data is proxied from public sources (Yahoo Finance) on the backend. The user database stores an email and a password hash — no real names or account numbers.

## Evaluation Criteria Checklist

| # | Criterion | Status | Documentation |
|---|-----------|--------|---------------|
| 1 | Business Analysis | ✅ submitted | [business-analysis.md](02-technical/criteria/business-analysis.md) |
| 2 | Backend | ✅ live | [backend.md](02-technical/criteria/backend.md) |
| 3 | Frontend | ✅ live. Desktop and phone screenshots, plus a production Lighthouse run, are on the frontend page | [frontend.md](02-technical/criteria/frontend.md) |
| 4 | Database | ✅ | [database.md](02-technical/criteria/database.md) |
| 5 | AI Assistant / Chatbot | ✅ live | [ai-assistant.md](02-technical/criteria/ai-assistant.md) |
| 6 | Cloud | ✅ live since 2026-09-02 | [cloud.md](02-technical/criteria/cloud.md) |
| 7 | CI/CD | ✅ | [cicd.md](02-technical/criteria/cicd.md) |
| 8 | Automated tests 70%+ | ✅ backend gate is 80% | [automated-tests.md](02-technical/criteria/automated-tests.md) |



## Documentation Navigation

- [Project Overview](01-project-overview/index.md) — business context, goals, and BA material
- [Technical Implementation](02-technical/index.md) — architecture, stack, and criterion ADRs
- [User Guide](03-user-guide/index.md) — how to use the application
- [Retrospective](04-retrospective/index.md) — how the build went
- [Appendices](appendices/index.md) — glossary, API, database schema

---

*Last updated: 2026-08-18*
