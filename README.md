# Krepton Analytics

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

## Layout

| Path | |
|------|--|
| `backend/` | API, migrations, demo seed |
| `frontend/` | Web app |
| `Docs/database/` | Database: dictionary, ER diagram, query plans, roles |
| `Docs/diploma/thesis/` | Thesis |
| `Docs/BA/` | Business analysis |
| `backend/openapi.yaml` | HTTP API |
