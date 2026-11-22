<!-- prev: scope.md | next: ../02-technical/index.md -->

# Features & Requirements

## Epics Overview

| Epic | Description | Status |
|------|-------------|--------|
| E1: Identity | Register, verify, login, Google, logout, delete | ✅ |
| E2: Portfolio ingest | Manual add + broker file import (memory only) | ✅ |
| E3: Analytics | Dashboard, weights, drift, rebalancing math | ✅ |
| E4: Market data | Server-side quotes, search, ticker page | ✅ |
| E5: AI assistant | News briefing + ticker chat + quota | ✅ |
| E6: Trust / GDPR | Privacy, export, disclaimers, cookies note | ✅ / polish |

## User Stories

### Epic 1: Identity

| ID | User Story | Acceptance Criteria | Priority | Status |
|----|------------|---------------------|----------|--------|
| US-001 | As a visitor, I want to register with email and password, so that my portfolio is private | Email stored; password bcrypt; JWT cookie HttpOnly | Must | ✅ |
| US-002 | As a user, I want to log in and stay in the session, so that I do not re-enter data every click | Cookie sent with `withCredentials`; 401 handled in UI | Must | ✅ |
| US-003 | As a user, I want to delete my account, so that I can exercise erasure | Hard delete user + related rows after step-up auth | Must | ✅ |

### Epic 2: Portfolio ingest

| ID | User Story | Acceptance Criteria | Priority | Status |
|----|------------|---------------------|----------|--------|
| US-010 | As an investor, I want to add a position, so that I can start without a file | Ticker, shares, price validated; stored under HMAC owner | Must | ✅ |
| US-011 | As an investor, I want to import a broker report, so that I do not type hundreds of rows | File parsed in RAM; never written to disk | Must | ✅ |

### Epic 3: Analytics

| ID | User Story | Acceptance Criteria | Priority | Status |
|----|------------|---------------------|----------|--------|
| US-020 | As an investor, I want current weights vs a saved target, so that I see drift | Dashboard and rebalancing use the same server analysis. No broker order | Must | ✅ |
| US-021 | As an investor, I want a deposit split, so that I rebalance without selling | Input cash → suggested buys; not a broker order | Nice | Open |

### Epic 4–5: Market data and AI

| ID | User Story | Acceptance Criteria | Priority | Status |
|----|------------|---------------------|----------|--------|
| US-030 | As an investor, I want quotes without calling Yahoo from the browser, so that keys stay on the server | All Yahoo calls in backend services | Must | ✅ |
| US-040 | As an investor, I want a daily news briefing on my tickers, so that I do not paste holdings into ChatGPT | Max tickers, quota, cache, disclaimer | Must | ✅ |
| US-041 | As an investor, I want to ask about **this** ticker, so that answers stay in scope | Jailbreak / buy-sell blocked or steered | Must | ✅ |

## Use Case Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │           Krepton Analytics                 │
                    │                                             │
    ┌──────────┐    │  Register / Login / Delete account          │
    │  Guest   │────┤  View public landing / legal pages          │
    └──────────┘    │                                             │
                    │  Import report / add position               │
    ┌──────────┐    │  View dashboard & rebalancing               │
    │ Investor │────┤  Open ticker, watchlist                     │
    └──────────┘    │  Generate news briefing                     │
                    │  Ticker AI chat                             │
                    │  Export my data                             │
                    │                                             │
                    │  (no Admin actor — operators use Azure/Git) │
                    └─────────────────────────────────────────────┘
```

## Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Quote path | In-memory cache ~30 s | Backend cache service |
| AI reply | < 10 s typical | Lab numbers; production SLA is not measured |
| Concurrent AI | Design for ≥ 10 users (quota + rate limit) | Rate limiter + Gemini errors |

### Security

- Authentication: JWT in `HttpOnly; Secure; SameSite` cookie — never LocalStorage
- Passwords: bcrypt (cost ≥ 12)
- Portfolio anonymity: `owner_token = HMAC-SHA256(userId, secret)` without FK to `users`
- Uploads: Multer memory storage
- Secrets: environment variables only
- AI: API key server-side; prompt-injection filters; output sanitization

### Accessibility

- Theme tokens aimed at WCAG 2.1 AA contrast (4.5:1 text)
- Full Adaptive UI / Refined UX **criteria are not declared**; tablet should not break the demo

### Reliability

| Metric | Target |
|--------|--------|
| Quotes | Best-effort Yahoo; zeros/errors instead of crash |
| AI | Timeout / 429 handled; quota recorded |
| Deploy | Public URL is live: `www.kreptonanalytics.com` |

### Compatibility

| Platform | Minimum |
|----------|---------|
| Chrome / Firefox / Edge | Last two stable |
| Desktop + mobile layout | Required for Frontend min |
