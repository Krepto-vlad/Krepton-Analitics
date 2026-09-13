<!-- prev: tech-stack.md | next: criteria/business-analysis.md -->

# Deployment & DevOps

## Infrastructure

Live since 2026-09-02 (phase D4 done):

```
                          Internet
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
   www.kreptonanalytics.com          api.kreptonanalytics.com
              │                                │
              ▼                                ▼
   ┌─────────────────────┐        ┌─────────────────────────┐
   │ Azure Static Web App │        │ Azure Container App      │
   │ (East US 2)           │        │ (North Europe)           │
   │ SPA, free tier        │        │ scale-to-zero, GHCR image│
   └─────────────────────┘        └────────────┬─────────────┘
                                                 ▼
                                   ┌─────────────────────────┐
                                   │ Azure Database for       │
                                   │ PostgreSQL Flexible      │
                                   │ Server (North Europe)    │  ← managed service (Cloud min)
                                   └─────────────────────────┘
```

Reviewers open the public URL directly — no local setup needed. Static Web Apps only has non-EU regions available on the free tier and serves no personal data (pure static assets), so it stays outside the GDPR EU-residency scope; the API and the database — where personal data actually lives — are both in North Europe (EU). **Containerization is not a declared criterion**, but the backend image is the real CI/Azure deploy contract now (Container Apps pulls it from GHCR after green CI on `main`); the daily dev loop is still `npm run dev`, not `docker compose up`.

### Environments

| Environment | URL | Branch |
|-------------|-----|--------|
| **Development** | `localhost:5173` (FE), `localhost:3001` (API) | feature branches |
| **CI** | GitHub Actions | push / PR |
| **Production** | `https://www.kreptonanalytics.com` (FE), `https://api.kreptonanalytics.com` (API) | `main` |

## CI/CD Pipeline

Live CI: `.github/workflows/ci.yml` (see [CI/CD criterion](criteria/cicd.md)).

```
push/PR → lint + format check → build FE/BE → Jest coverage (backend gate ≥ 80%; frontend report only) → artifacts
         → npm audit (fail on critical)
         → docker compose config + docker build (API + web, no registry push)
         → Playwright e2e
```

Live CD: `.github/workflows/deploy.yml`, triggered when **CI succeeds on `main`**, plus `workflow_dispatch` for a redeploy with no new commit or a one-side-only rollout.

```
green CI on main → build + push API image to GHCR → az containerapp update → wait /health
                 → build SPA (VITE_API_URL=api.kreptonanalytics.com) → deploy to Static Web Apps → wait SPA URL
```

Local `git commit` runs Husky lint-staged. Local `git push` runs lint, Prettier, backend + frontend coverage.

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
| `PADDLE_API_KEY` | Paddle Billing server key | For paid checkout |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook HMAC | For paid checkout |
| `PADDLE_ENV` | `sandbox` or `production` | Defaults to sandbox |
| `PADDLE_PLUS_MONTHLY_PRICE_ID` | Plus monthly price id | For paid checkout |
| `PADDLE_PLUS_ANNUAL_PRICE_ID` | Plus annual price id | For paid checkout |
| `ADMIN_EMAILS` | Comma-separated allowlist | Complimentary Plus grants |
| `SNAPTRADE_CLIENT_ID` | SnapTrade Commercial client id | For Plus broker sync |
| `SNAPTRADE_CONSUMER_KEY` | SnapTrade consumer key (server-only) | For Plus broker sync |
| `VITE_PADDLE_CLIENT_TOKEN` | Paddle.js client token (baked into SPA) | For checkout overlay |
| `VITE_PADDLE_ENV` | `sandbox` or `production` (baked into SPA) | Defaults to sandbox |
| `NODE_ENV` | `development` / `production` | Yes |

Copy from `.env.example` at the repo root (Compose) and from `backend/.env.example` / `frontend/.env.example` (inner loop). Never commit `.env`. In production, backend variables (`DATABASE_URL`, `JWT_SECRET`, `PORTFOLIO_SECRET`, `GOOGLE_CLIENT_ID`, SMTP, Paddle, `ADMIN_EMAILS`) live in the Container App's environment variables blade; `VITE_API_URL` / `VITE_GOOGLE_CLIENT_ID` / `VITE_PADDLE_CLIENT_TOKEN` / `VITE_PADDLE_ENV` are baked in at build time by `deploy.yml` from GitHub Secrets.

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
| **Application logs** | pino JSON on stdout; visible live in the Container App's Log stream (Azure Portal) |
| **Correlation** | `x-request-id` |
| **ELK / Prometheus** | Not in scope (Backend max) |

## Cost & Idle Runbook

Container Apps scale to zero after inactivity and Static Web Apps free tier does not bill by traffic, so the idle bill is dominated by the smallest PostgreSQL Flexible Server SKU (Burstable, EU region). To pause spend for an extended break: stop the Postgres Flexible Server in the Azure Portal (Overview → Stop); the Container App and Static Web App cost nothing extra while idle. Restart the Postgres server before demoing — the Container App will reconnect on its next request (retry/backoff already in `index.ts`).
