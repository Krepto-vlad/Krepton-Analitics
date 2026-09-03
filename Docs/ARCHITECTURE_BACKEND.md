# Backend Architecture

_Stack: Node.js + Express + TypeScript_

---

## Folder structure

```
backend/src/
├── index.ts                # Entry point — listen, ticker tape, graceful shutdown
├── app.ts                  # Express app factory (used by HTTP tests without listen)
├── constants.ts            # All BE constants (no magic values)
├── config/                 # Environment config, DB connection
│   └── db.ts
├── routes/                 # Express route registrations
│   └── stockRoutes.ts
├── controllers/            # Request parsing + response sending
│   └── stockController.ts
├── services/               # Business logic + external API calls
│   └── stockService.ts
├── repositories/           # DB queries (SQL only, no business logic)
│   └── userRepository.ts   # (planned)
├── middleware/             # Express middlewares
│   ├── errorHandler.ts
│   ├── authMiddleware.ts   # (planned) JWT cookie validation
│   └── asyncHandler.ts
├── types/                  # TypeScript interfaces for API and DB models
│   └── stock.types.ts
└── utils/                  # Pure helper functions
    └── logger.ts
```

---

## Layer rules

```
Request
  → Route         (url + method mapping)
  → Middleware     (auth, validation)
  → Controller     (parse req, call service, send res)
  → Service        (business logic, calls repository or external API)
  → Repository     (SQL queries)
  → Database
```

### routes/
- Register URL paths and HTTP methods.
- Wrap async controllers with `asyncHandler` to avoid try/catch repetition.
- No logic here.

```ts
router.get('/quote/:ticker', asyncHandler(getQuote));
router.get('/ticker-tape', getTickerTape); // sync — no wrapper needed
```

### controllers/
- Parse `req.params`, `req.query`, `req.body`.
- Call one service function.
- Send the response with correct status code.
- **No business logic** — if you write an `if` about data, it belongs in the service.
- Validate input here (throw `AppError` on bad input).

```ts
export async function getQuote(req: Request, res: Response): Promise<void> {
  const ticker = (req.params as { ticker: string }).ticker;
  const quote = await getStockQuote(ticker.toUpperCase());
  res.json({ success: true, data: quote });
}
```

### services/
- All business logic lives here.
- Calls repositories for DB access and external APIs (Yahoo Finance, etc.).
- **No Express types** (`Request`, `Response`) in services — they must be framework-agnostic.
- Each service function has one responsibility.

```ts
// Good
export async function getStockQuote(ticker: string): Promise<StockQuote> { ... }

// Bad — mixes HTTP concern into service
export async function getStockQuote(req: Request): Promise<void> { ... }
```

### repositories/
- Data access only. Return typed rows — no business transformation.
- **Users / watchlist:** Drizzle ORM (`src/db/schema.ts`, `db` from `config/db.ts`). See `Docs/diploma/ADR-001-drizzle-orm.md`.
- **Portfolio (HMAC `owner_token`):** raw SQL in `portfolioRepository.ts` until that domain is mapped — the token math must stay explicit.
- **No business logic** — no conditions about what to do with data.
- Accept primitive arguments (ids, strings) — not full objects.

```ts
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}
```

### middleware/
- `asyncHandler`: wraps async route handlers to forward errors to Express error handler.
- `errorHandler`: global error handler, catches `AppError` and unknown errors; logs JSON via `pino`.
- `requestIdMiddleware`: accepts or generates `x-request-id`, stores it in AsyncLocalStorage so service logs correlate.
- `requestLogger`: structured HTTP log (`method`, `path`, `status`, `durationMs`, `requestId`).
- `authMiddleware`: validates JWT from HttpOnly cookie, attaches `userId` to `req`.

---

## Error handling

All errors flow through `AppError` → global `errorHandler` middleware.

```ts
// Throw known errors anywhere in controller/service:
throw new AppError(400, 'Invalid ticker symbol');
throw new AppError(401, 'Unauthorized');
throw new AppError(404, 'Resource not found');

// Global handler returns:
// { success: false, error: 'message' }
```

Never swallow errors after logging — always re-throw or pass to `next(err)`. HTTP and domain events go through `pino` (`backend/src/utils/logger.ts`), not `console.*`.

---

## API response shape

All endpoints return a consistent envelope:

```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

---

## Security rules

- **Passwords**: bcrypt with cost factor ≥ 12. Never store plain text.
- **JWT**: short expiry (15 min access token). Transmitted only via `HttpOnly; Secure; SameSite=Strict` cookie.
- **Broker files**: parsed in-memory (Multer `memoryStorage`). Never written to disk.
- **Database**: users table stores only email hash + password hash. Portfolio table stores only `userId` (no names, no account numbers).
- **Input validation**: validate all query params and body fields in controllers before calling services.
- **Rate limiting**: apply `express-rate-limit` on auth endpoints.

---

## External data (Yahoo Finance)

- All Yahoo Finance calls happen **server-side only** — never expose API calls to the frontend.
- Ticker tape: fetched once on startup, cached in memory, refreshed every 24h via `setInterval`.
- On-demand quotes: fetched per request in real-time.
- If Yahoo Finance returns null fields, fall back to zero — never crash the request.

```ts
// Pattern for all Yahoo calls
const { data } = await yahooClient.get('/v8/finance/chart/' + ticker, { params });
const meta = data?.chart?.result?.[0]?.meta;
if (!meta) throw new AppError(404, `No data for ticker: ${ticker}`);
```

---

## Graceful shutdown

`index.ts` stores the ticker tape `setInterval` timer and clears it on `SIGTERM`/`SIGINT` before closing the HTTP server. This ensures no dangling timers on Render.com deploys.

---

## constants.ts template

```ts
// All durations in ms (BE) or s (for HTTP headers)
export const TICKER_TAPE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const TICKER_TAPE_BROWSER_CACHE_TTL_S = 60 * 60;

// Limits
export const SEARCH_RESULTS_LIMIT = 10;
export const WS_MAX_SUBSCRIPTIONS_PER_CLIENT = 5;
```

---

## TypeScript rules

- Explicit return types on all exported functions.
- DB row types suffixed with `Row`: `UserRow`, `TradeRow`.
- API response types live in `types/`.
- No `any`. Use `unknown` + type guards when type is truly unknown.
- Use `as const` on object literals used as enums.
