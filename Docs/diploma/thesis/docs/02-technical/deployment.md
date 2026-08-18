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

Until D4, reviewers run the stack locally. Container files may exist for CI/Azure; **Containerization is not a declared criterion**.

### Environments

| Environment | URL | Branch |
|-------------|-----|--------|
| **Development** | `localhost:5173` (FE), `localhost:3001` (API) | feature branches |
| **CI** | GitHub Actions | push / PR |
| **Production** | [Azure URL TBD] | `main` |

## CI/CD Pipeline

Intended pipeline (see [CI/CD criterion](criteria/cicd.md)):

```
push/PR → lint + format check → build FE/BE → Jest → (optional docker build) → CD (manual/workflow_dispatch)
```

Secrets stay in GitHub Secrets / Azure settings, never in YAML.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `JWT_SECRET` | Access-token signing | Yes |
| `PORTFOLIO_SECRET` | HMAC for `owner_token` | Yes |
| `GEMINI_API_KEY` | LLM gateway | For AI features |
| `GOOGLE_CLIENT_ID` | OAuth | Optional login |
| `NODE_ENV` | `development` / `production` | Yes |

Copy from `.env.example` (frontend and backend). Never commit `.env`.

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

If `Dockerfile` / `compose` files are in the repo, they are the **deploy contract**. Local inner loop remains `npm run dev` until Docker is proven in CI.

## Monitoring & Logging

| Aspect | Tool |
|--------|------|
| **Application logs** | pino JSON on stdout; Azure Log stream after D4 |
| **Correlation** | `x-request-id` |
| **ELK / Prometheus** | Not in scope (Backend max) |
