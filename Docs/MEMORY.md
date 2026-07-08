# Krepton Analytics — Project Memory
_Last updated: 2026-07-07 21:13_
_Key: MEMORY_V5_

## Project
Diploma POC → full product. Monorepo at `POC/`. Frontend: React+Vite+TS+SCSS Modules. Backend: Node+Express+TS. DB: PostgreSQL (Neon.tech). Deploy: Vercel (FE) + Render.com (BE). Free tier only.

## What is done
- **WelcomePage** — hero, DOM-rotation ticker (RAF), stats, features grid, privacy banner, footer. Inter font. 3D tilt card. Navbar always dark.
- **PricingPage** (`/pricing`), **SecurityPage** (`/security`), **AuthPage** (`/login`, `/register`) — password strength, rules checklist.
- **Router** — lazy-loaded pages. ProtectedLayout (single AppShell via Outlet) wraps all protected routes so shell never remounts on navigation.
- **Ticker tape** — backend `GET /api/stocks/ticker-tape`: 8 symbols, startup fetch, 24h cache. Frontend: 1h in-memory fallback.
- **Git hooks** — Husky: pre-commit, pre-push, commit-msg (FRONT/BACK/FIX/DEPLOY/INIT).
- **components/ui/** — `Button` (primary/outline/ghost/loading), `Input` (label/hint/error/rightElement).
- **components/layout/** — `Navbar`+`Footer` (marketing), `AppSidebar`+`AppHeader`+`AppShell` (app).
- **Auth backend** — `POST /api/auth/register`, `/login`, `/logout`, `GET /me`. bcrypt(12), JWT HttpOnly cookie (15min), rate limit 10req/15min. Migration: `users` table (id UUID, email, password_hash).
- **Auth frontend** — `authSlice`, `authApi.ts`, `ProtectedRoute`→`ProtectedLayout`. `fetchCurrentUserThunk` on app init.
- **AppShell** — `AppSidebar` (hover expand 64px→220px, no button) + `AppHeader` (page title, LIVE badge, USD/EUR switcher, theme toggle, bell). Single instance via layout route.
- **Theme** — `useTheme` hook: dark/light via `data-theme` on `<html>`, persisted in localStorage. CSS custom properties on `:root` overridden in `[data-theme="light"]`.
- **Backend migration** — `1751370001000_create-portfolio-positions.js` ready (user_id FK, ticker, company_name, shares, avg_buy_price, currency). Not yet run.
- **Backend portfolio repo** — `portfolioRepository.ts` + `types/portfolio.types.ts` created, not yet wired into routes.
- **DashboardPage** — fully implemented with mock data. 5 sub-components: `PortfolioHealthCard` (SVG gauge + sector bars), `PortfolioEquityCard` (lightweight-charts v5 area chart, period switcher), `PositionsTable` (P&L matrix), `WatchlistPanel` (alerts), `NewsFeed` (news by portfolio tickers).
- **portfolioSlice** — Redux slice with deterministic mock data (LCG), equity history Jan 2024→Jun 2026 (~650 trading days).
- **uiSlice** — Holds `currency` (USD/EUR). AppShell uses `useSelector/dispatch` for currency.
- **Dashboard layout fix** — Fixed height chain: `AppShell.content { height: 0; flex: 1; display: flex }` + `DashboardPage.page { flex: 1 }` + rows use `flex: 2` / `flex: 1.5` instead of `min-height` only.

## Key decisions
- Router: layout route `ProtectedLayout` renders `<AppShell><Outlet/></AppShell>` — shell mounts once.
- Sidebar: CSS `:hover` expands 64→220px. JS `onMouseEnter/Leave` syncs header `left` offset.
- Theme: CSS custom properties on `:root`; SCSS vars are aliases (`var(--color-*)`).
- Currencies: USD + EUR only. Stored in `uiSlice` (Redux).
- JWT in HttpOnly cookies only. No localStorage. `withCredentials: true` everywhere.
- Dashboard mock equity: LCG deterministic pseudo-random walk, Jan 2024→Jun 2026, ending ~$990K.
- Risk score gauge: SVG arc, angle = 180° - (score/100 * 180°), sweep-flag=1, large-arc=0.
- lightweight-charts v5 API: use `chart.addSeries(AreaSeries, {...})` NOT deprecated `addAreaSeries()`.
- Height chain pattern: `height: 0 + flex: 1` on scroll container → children can use `%` heights reliably.
- `#root` must NOT have `display: flex` — it breaks the height chain for `.shell`. `#root` = `height: 100dvh; overflow: hidden` only. `.shell` = `height: 100dvh; display: flex`.

## Code patterns
- SCSS Modules + `_variables.scss` (CSS custom props) + `_mixins.scss`. Glow on `box-shadow`.
- Constants in `constants.ts` (both FE and BE). No magic values.
- Backend: controller → service → repository → DB. `asyncHandler` wraps async routes.
- Named exports only. Full variable names. No `any`.
- Redux thunks in `features/auth/authSlice.ts`. API calls in `api/authApi.ts` only.
- Hooks: `useTheme`, `useAppDispatch`, `useAppSelector`.

## Next steps (priority order)
1. **Portfolio backend** — wire `portfolioRepository.ts` into service → controller → routes. Run migration. Connect DashboardPage to real API.
2. **Add Position modal** — ticker search + form (currently "Add Position" button is a stub).
3. Multi-broker CSV/XLSX import
4. Rebalancing calculator (Ray Dalio / Buffett / Custom)
5. Dividend calendar (12-month forecast)
6. Stock screener (P/E, ROE, Debt/Equity)
7. AI daily news summary per portfolio (Module 12)
