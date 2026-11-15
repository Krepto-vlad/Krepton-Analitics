<!-- prev: index.md | next: deployment.md -->

# Technology Stack

## Stack Overview

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | React 19 + Vite + TypeScript | SPA, diploma Frontend min, fast local loop |
| **UI** | Custom SCSS modules + lucide-react | Design tokens / theme; no paid UI kit |
| **State** | Redux Toolkit | Global auth, portfolio, quotes; Frontend min global state |
| **Charts** | lightweight-charts | Ticker visualization |
| **Backend** | Node.js + Express 4 + TypeScript | Course stack; cookie middleware; not Nest (YAGNI) |
| **Database** | PostgreSQL | OLTP, constraints, EU managed option on Azure |
| **Migrations** | node-pg-migrate | DDL in Git |
| **ORM** | drizzle-orm | SQL-first mapping for users/watchlist/AI cache+quota; HMAC stays raw |
| **Logs** | pino | JSON logs + request id (Backend min) |
| **AI** | Gemini via backend gateway | News + ticker chat; not a ChatGPT iframe |
| **Market data** | yahoo-finance2 | Free public quotes, server-side |
| **Tests** | Jest + Testing Library | Unit/component; Playwright planned for e2e |
| **CI** | GitHub Actions (planned/partial) | Lint, test, build |
| **Cloud** | Azure (planned D4) | Course Cloud + EU residency |

No Redis, Kafka, or extra microservice — those would be other criteria we are **not** declaring.

## Key Technology Decisions

### SPA (React) instead of Next.js

**Context:** Frontend min requires a deliberate SPA with routing and global state.

**Decision:** Vite + React Router + RTK.

**Trade-offs:** CSR SEO is irrelevant behind auth. Cookie `withCredentials` is straightforward against a separate origin.

### Drizzle instead of Prisma

Drizzle covers the typed tables. The HMAC portfolio stays raw SQL so the anonymity boundary stays visible. See [Backend criterion](criteria/backend.md). Prisma would hide that join.

### In-memory quote cache instead of Redis

**Context:** Backend **max** mentions Redis. We only need Backend **min**.

**Decision:** Process memory + TTL constants.

**Trade-offs:** Multi-instance cache is not coherent — acceptable until a second API replica exists.

## Development Tools

| Tool | Purpose |
|------|---------|
| Git | History for reviewers |
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
| Azure | Hosting + managed Postgres (D4) | Paid near pre-defense |
