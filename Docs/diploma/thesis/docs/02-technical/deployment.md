<!-- prev: tech-stack.md | next: criteria/business-analysis.md -->

# Deployment & DevOps

## Infrastructure

Target (phase D4 — not live yet):

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │ Azure (EU)      │
              │  Frontend host  │
              │  API host       │
              │  Postgres       │  ← managed service (Cloud min)
              └─────────────────┘
```

Until D4, reviewers run the stack locally. **Containerization is not a declared criterion.** Dockerfiles exist as the CI/Azure deploy contract; the daily loop is still `npm run dev`.

### Environments

| Environment | URL | Branch |
|-------------|-----|--------|
| **Development** | `localhost:5173` (FE), `localhost:3001` (API) | feature branches |
| **CI** | GitHub Actions | push / PR |
| **Production** | [Azure URL TBD] | `main` |

## CI/CD Pipeline

Live CI: `.github/workflows/ci.yml` (see [CI/CD criterion](criteria/cicd.md)).

```
push/PR → lint + format check → build FE/BE → Jest (backend coverage ≥ 70%) → artifacts
         → npm audit (fail on critical)
         → docker compose config + docker build (API + web, no registry push)
CD (manual/workflow_dispatch to Azure) is phase D4.
```

Local `git push` also runs Husky: lint, Prettier, backend coverage.

Secrets stay in GitHub Secrets / Azure settings, never in YAML.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `JWT_SECRET` | Access-token signing | Yes |
| `PORTFOLIO_SECRET` | HMAC for `owner_token` | Yes |
| `FRONTEND_URL` | SPA origin (CORS + cookie `Secure` if `https://`) | Yes in Compose/prod |
| `VITE_API_URL` | Browser API base (baked into the web image) | Yes for frontend build |
| `GEMINI_API_KEY` | LLM gateway | For AI features |
| `GOOGLE_CLIENT_ID` | OAuth | Optional login |
| `NODE_ENV` | `development` / `production` | Yes |

Copy from `.env.example` at the repo root (Compose) and from `backend/.env.example` / `frontend/.env.example` (inner loop). Never commit `.env`.

## How to Run Locally

### Prerequisites

- Node.js 20+
- PostgreSQL
- npm

### Setup

```bash
git clone [repository-url]
cd POC

# backend
cd backend
cp .env.example .env
npm install
npm run migrate:up
npm run dev

# frontend (second terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL, register a user, add a position or import a report.

### Docker

Deploy contract (not the inner loop). Proven in CI by job **Docker images**; `compose up` still needs a machine with Docker.

```
                    ┌──────────────────────────────────┐
                    │ docker compose network: krepton  │
  browser ──8080──► │ web (nginx-unprivileged)         │
                    │              │ VITE_API_URL      │
  browser ──3001──► │ api (node, non-root) ──► postgres│
                    └──────────────────────────────────┘
```

```bash
cp .env.example .env
docker compose up --build
```

| Image | Base | Why |
|-------|------|-----|
| `krepton-analytics-api:local` | `node:22-bookworm-slim` | Matches CI Node 22; glibc for `bcrypt` |
| `krepton-analytics-web:local` | `nginxinc/nginx-unprivileged:1.27-alpine` | Static SPA, non-root, port 8080 |
| `postgres:16-bookworm` | Official | Pin major; not `latest` |

Secrets stay in `.env` / Azure settings. HttpOnly cookies are `Secure` only when `FRONTEND_URL` starts with `https://` (HTTP Compose on localhost still logs in). Broker uploads stay in RAM — no upload volume.

Minimum resources for Compose: ~2 GB RAM, 2 CPU. Rebuild `web` after changing `VITE_*`.

## Monitoring & Logging

| Aspect | Tool |
|--------|------|
| **Application logs** | pino JSON on stdout; Azure Log stream after D4 |
| **Correlation** | `x-request-id` |
| **ELK / Prometheus** | Not in scope (Backend max) |
