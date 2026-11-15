# E2E (Playwright)

Thin smoke layer on top of the Jest/RTL unit + component tests — not a replacement for them.
Keep it to a handful of critical user journeys (login → dashboard), not a second full test suite.

## Prerequisites

The backend + a migrated, seeded Postgres must already be running — Playwright only
starts/reuses the frontend preview server (`npm run preview:build`), it does not manage the
backend or the database.

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # first time only
npm run migrate:up
npm run seed:demo      # creates demo@krepton.local when missing; password is SEED_DEMO_PASSWORD
npm run dev

# Terminal 2 — e2e
cd frontend
npm run test:e2e
```

`test:e2e` builds the frontend and starts `vite preview` on port 5173 automatically
(reusing it if one is already running locally). Point it at a different backend or demo
account with `E2E_BASE_URL`, `E2E_DEMO_EMAIL`, `E2E_DEMO_PASSWORD`.

## Debugging

```bash
npm run test:e2e:ui      # interactive UI mode
npx playwright show-report
```
