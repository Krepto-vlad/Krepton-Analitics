# Krepton Analytics — Project Memory
_Last updated: 2026-07-01 18:15_
_Key: MEMORY_V2_

## Project
Diploma POC → full product. Monorepo at `POC/`. Frontend: React+Vite+TS+SCSS Modules. Backend: Node+Express+TS. DB: PostgreSQL (Neon.tech). Deploy: Vercel (FE) + Render.com (BE). Free tier only.

## What is done
- **WelcomePage** — hero, DOM-rotation ticker (RAF), stats, features grid, privacy banner, footer. Inter font. 3D tilt card. Navbar always dark.
- **PricingPage** (`/pricing`), **SecurityPage** (`/security`), **AuthPage** (`/login`, `/register`) — password strength, rules checklist, nickname-only registration.
- **Router** — lazy-loaded pages: `/`, `/pricing`, `/security`, `/login`, `/register`, `/dashboard`(stub).
- **Ticker tape** — backend `GET /api/stocks/ticker-tape`: fetches 8 symbols on startup, in-memory cache, refreshes 24h. `Cache-Control: public, max-age=3600` on response. Frontend: in-memory fallback cache (1h). `chartPreviousClose` used to calculate real % change outside market hours.
- **Git hooks** — Husky: pre-commit, pre-push, commit-msg (FRONT/BACK/FIX/DEPLOY/INIT).
- **components/ui/** — `Button` (primary/outline/ghost/loading), `Input` (label/hint/error/rightElement). Used in AuthPage.
- **components/layout/** — `Navbar` (with mobile hamburger, `activeRoute` prop), `Footer`. Used in all 3 marketing pages.
- **Docs/** — `ARCHITECTURE_FRONTEND.md`, `ARCHITECTURE_BACKEND.md`, `MEMORY.md`, `ВозможныеФичи.txt`.
- **Auth backend** — `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. bcrypt(12), JWT в HttpOnly cookie (15min), rate limit 10req/15min. PostgreSQL таблица `users` (id, email, password_hash). Migration через node-pg-migrate.
- **Auth frontend** — `authSlice` (Redux), `authApi.ts`, `ProtectedRoute` в роутере. AuthPage подключена к Redux. При старте приложения вызывается `fetchCurrentUserThunk` для восстановления сессии.

## Key decisions
- Ticker cache: HTTP `Cache-Control: public, max-age=3600` (browser-level, shared across tabs) + in-memory JS fallback. Yahoo Finance only called server-side.
- `chartPreviousClose ?? previousClose` for % change calculation — works when market is closed.
- Auth page overflow fix: removed `justify-content: center` from `.page`, added `.content` wrapper with `margin: auto 0` — handles both short (login) and long (register) forms.
- Auth naming: Sign Up / Sign In consistently everywhere.
- No Tailwind. SCSS Modules only.
- JWT in HttpOnly cookies only.
- Broker files parsed in-memory, never touch disk.

## Code patterns
- SCSS Modules + `_variables.scss` + `_mixins.scss`.
- `letter-spacing: -0.02em` on large headings. Glow on `box-shadow`.
- Constants in `constants.ts` both FE and BE.
- Backend: controller → service → Yahoo API. `asyncHandler` wraps async routes.
- Named exports only. Full variable names. No magic values.

## Next steps (Modules planned)
1. ~~**Auth backend**~~ — DONE
2. **Dashboard page** — real portfolio UI
3. Multi-broker CSV/XLSX import
4. Rebalancing calculator (Ray Dalio / Buffett / Custom)
5. Dividend calendar (12-month forecast)
6. Stock screener (P/E, ROE, Debt/Equity)
7. AI daily news summary per portfolio (Module 12)
