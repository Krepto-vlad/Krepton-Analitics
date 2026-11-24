# Krepton Analytics

[![CI](https://github.com/Krepto-vlad/Krepton-Analitics/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Krepto-vlad/Krepton-Analitics/actions/workflows/ci.yml)

Analytics app for a personal stock portfolio. Market data is loaded on the server from Yahoo Finance. Accounts, holdings, and the AI cache are stored in PostgreSQL.

Live app: [www.kreptonanalytics.com](https://www.kreptonanalytics.com)  
API: [api.kreptonanalytics.com](https://api.kreptonanalytics.com)

## Stack

React 19, Vite, TypeScript, Redux Toolkit, SCSS on the frontend. Node.js, Express, TypeScript on the backend. PostgreSQL, with schema changes in `backend/src/migrations/`. Deployed on Azure.

## Requirements

- Node.js 20+
- npm 9+
- PostgreSQL 16+ for local development

Docker is optional.

## Run locally

Two terminals.

```bash
cd backend
cp .env.example .env
npm install
npm run migrate:up
npm run dev
```

API: http://localhost:3001 (`/health`).

Fill `DATABASE_URL`, `JWT_SECRET`, and `PORTFOLIO_SECRET` in `backend/.env`. The file is gitignored.

```bash
npm run seed:demo
```

Creates `demo@krepton.local` if that email is not there yet. Skipped when `NODE_ENV=production`. Password: `SEED_DEMO_PASSWORD`.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| `web` | http://localhost:8080 |
| `api` | http://localhost:3001/health |
| `postgres` | localhost:5432, database `krepton_analytics` |

Migrations run when the API container starts. Rebuild `web` after changing a `VITE_*` variable.

## Tests

```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npm run test:e2e
```

Playwright expects the API and a migrated, seeded database to be running. See `frontend/e2e/README.md`.

The PostgreSQL integration, API contract, and load suites need a database whose name contains `test`. The first run creates it and applies the migrations.

```bash
cd backend
export TEST_DATABASE_URL=postgresql://user:password@localhost:5432/krepton_test
npm run test:db
npm run load:test
```

PowerShell: `$env:TEST_DATABASE_URL = '...'`. Details: [Docs/automated-tests](Docs/automated-tests/README.md).

## Documentation by area

Each area has one folder under `Docs/` with an `README.md` (decision record, requirements checklist with evidence), plus its diagrams, screenshots, and supporting files. The index is [Docs/README.md](Docs/README.md).

| Area | Documents | Code and artifacts |
|------|-----------|--------------------|
| Business analysis | [Docs/BA/](Docs/BA/README.md): analysis document, personas, product value, backlog, slides, `diagrams/` (use case, context, activity, SSD, mockups) | n/a |
| Backend | [Docs/backend/](Docs/backend/README.md), [API reference](Docs/backend/api-reference.md) | `backend/src/` (`routes`, `controllers`, `services`, `repositories`, `middleware`), contract in `backend/openapi.yaml` |
| Frontend | [Docs/frontend/](Docs/frontend/README.md): structure, responsive layouts, screenshots, Lighthouse | `frontend/src/` (`pages`, `features`, `components`, `store`, `api`, `styles`) |
| Database | [Docs/database/](Docs/database/README.md): data dictionary, ER diagram, query plans, roles and `\du` screenshot | `backend/src/migrations/`, `backend/src/db/schema.ts`, `backend/src/repositories/`, demo seed `npm run seed:demo` |
| AI assistant | [Docs/ai-assistant/](Docs/ai-assistant/README.md): guardrails, [user guide](Docs/ai-assistant/user-guide.md), [example dialogs](Docs/ai-assistant/dialogs.md), [latency](Docs/ai-assistant/lab-latency.md) | `backend/src/services/` (`geminiClient.ts`, `tickerChatService`, `newsSummaryService`), chat UI in `frontend/src/pages/TickerDetailPage/components/` (`TickerChatDrawer.tsx` and neighbors) |
| Cloud | [Docs/cloud/](Docs/cloud/README.md), [deployment steps](Docs/cloud/deployment.md) | Azure resources; live app and API URLs at the top of this file |
| CI/CD | [Docs/ci-cd/](Docs/ci-cd/README.md) | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, CI badge above |
| Automated tests | [Docs/automated-tests/](Docs/automated-tests/README.md): suites, coverage gates, load test results, faults the suites caught | `backend/src/__tests__/` (`unit`, `db`, `property`), `frontend/src/__tests__/`, `frontend/e2e/`, `backend/scripts/runLoadTest.ts` |
| Thesis | [Docs/thesis/](Docs/thesis/README.md): chapters in MkDocs | n/a |

Other documents: [rebalancing](Docs/rebalancing.md) (how holdings are scored against a target) and the [privacy policy](Docs/Privacy-Policy_EN.pdf).
