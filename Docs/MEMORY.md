# Krepton Analytics — Project Memory
_Last updated: 2026-07-01_

## Project
Diploma POC → full product. Monorepo at `POC/`. Frontend: React+Vite+TS+SCSS Modules. Backend: Node+Express+TS. DB: PostgreSQL (Neon.tech). Deploy: Vercel (FE) + Render.com (BE). Free tier only.

## What is done
- **WelcomePage** — hero, DOM-rotation ticker (RAF, no CSS anim), stats, features grid, privacy banner, footer. Inter font. 3D tilt card (repel effect). Navbar always dark.
- **PricingPage** (`/pricing`) — 3 plans extracted from landing.
- **SecurityPage** (`/security`) — full privacy/architecture content, FAQ.
- **AuthPage** (`/login`, `/register`) — password strength, rules checklist, nickname-only registration.
- **Router** — lazy-loaded pages, routes: `/`, `/pricing`, `/security`, `/login`, `/register`, `/dashboard`(stub).
- **Ticker tape** — backend `GET /api/stocks/ticker-tape`: fetches 8 symbols on startup, caches in memory, refreshes every 24h via `setInterval`. Timer stored + graceful shutdown (`SIGTERM`/`SIGINT`). Frontend: 1 request on mount, 5-min client cache, fallback to static data.
- **Git hooks** — Husky: pre-commit (lint-staged), pre-push (lint+format check), commit-msg (prefix: FRONT/BACK/FIX/DEPLOY/INIT).

## Key decisions
- Ticker: DOM rotation (not CSS `-50%`) — works any screen width, no jump.
- Glow lives on card `box-shadow`, not separate element — follows 3D tilt.
- No `previewFade` — caused black stripe on tilt.
- Yahoo Finance via `axios` direct calls (no `yahoo-finance2` package).
- JWT in HttpOnly cookies only. No localStorage tokens.
- Broker files parsed in-memory, never touch disk.

## Code patterns
- SCSS Modules + `_variables.scss` + `_mixins.scss`. No Tailwind.
- `$font-family: 'Inter'`. `letter-spacing: -0.02em` on large headings.
- Constants in `constants.ts` both FE and BE.
- Backend: controller → service → Yahoo API. `asyncHandler` wraps async routes.

## Next steps (Modules planned)
1. Multi-broker CSV/XLSX import
2. Rebalancing calculator (Ray Dalio / Buffett / Custom)
3. Dividend calendar (12-month forecast)
4. Stock screener (P/E, ROE, Debt/Equity)
5. AI daily news summary per portfolio (Module 12 — new)
6. Auth backend (JWT, bcrypt, PostgreSQL users table)
7. Dashboard page (real portfolio UI)
