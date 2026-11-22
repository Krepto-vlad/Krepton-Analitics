<!-- prev: index.md | next: deployment.md -->

# Technology Stack

## Stack Overview

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | React 19 + Vite + TypeScript | Single-page app |
| **UI** | Custom SCSS modules + lucide-react | Design tokens and light/dark theme |
| **State** | Redux Toolkit | Auth, portfolio, and quotes shared across pages |
| **Charts** | lightweight-charts | Ticker visualization |
| **Backend** | Node.js + Express 4 + TypeScript | HTTP API and cookie session |
| **Database** | PostgreSQL | OLTP, constraints, EU managed option on Azure |
| **Migrations** | node-pg-migrate | DDL in Git |
| **ORM** | drizzle-orm | SQL-first mapping for users/watchlist/AI cache+quota; HMAC stays raw |
| **Logs** | pino | JSON logs and a request id |
| **AI** | Gemini via backend gateway | News + ticker chat; not a ChatGPT iframe |
| **Market data** | yahoo-finance2 | Free public quotes, server-side |
| **Tests** | Jest + Testing Library + Playwright | Unit/component; e2e login smoke in CI against Postgres |
| **CI** | GitHub Actions | Lint, format, coverage, build, audit, Playwright; deploy on green `main` |
| **Cloud** | Azure | Static Web Apps, Container Apps, PostgreSQL Flexible Server. Live since 2026-09-02 |

## Key Technology Decisions

### SPA (React) instead of Next.js

**Context:** The client is one application with routes and shared state.

**Decision:** Vite + React Router + RTK.

**Trade-offs:** CSR SEO is irrelevant behind auth. Cookie `withCredentials` is straightforward against a separate origin.

### Drizzle instead of Prisma

Drizzle covers the typed tables. The HMAC portfolio stays raw SQL so the anonymity boundary stays visible. See [Backend criterion](criteria/backend.md). Prisma would hide that join.

### In-memory quote cache instead of Redis

**Decision:** Quotes are cached in the API process with a TTL.

## Development Tools

| Tool | Purpose |
|------|---------|
| Git | Source history |
| npm | Workspaces-style frontend/ and backend/ |
| ESLint + Prettier | Lint/format (CI + Husky local) |
| Jest | Unit and component tests |
| OpenAPI 3 | `backend/openapi.yaml` |

## External Services & APIs

| Service | Purpose | Pricing |
|---------|---------|---------|
| Yahoo Finance | Quotes, search, headlines | Free / unofficial — best effort |
| Google Gemini | Briefing + ticker chat | Free tier + quota in our DB |
| Google OAuth | Optional login | Free |
| Azure | Hosting + managed Postgres | Live. Static Web Apps free tier; Container Apps scale-to-zero; smallest Postgres Burstable SKU |
