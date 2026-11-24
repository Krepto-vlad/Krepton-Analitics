<!-- prev: ../01-project-overview/features.md | next: tech-stack.md -->

# 2. Technical Implementation

## Contents

- [Tech Stack](tech-stack.md)
- Criterion folders: [BA](../../../BA/README.md), [Backend](../../../backend/README.md), [Frontend](../../../frontend/README.md), [Database](../../../database/README.md), [AI assistant](../../../ai-assistant/README.md), [Cloud](../../../cloud/README.md), [CI/CD](../../../ci-cd/README.md), [Automated tests](../../../automated-tests/README.md)

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Krepton Analytics                          │
│                                                                 │
│   ┌──────────────┐     HTTPS + cookie      ┌────────────────┐   │
│   │ React SPA    │────────────────────────▶│ Express API    │   │
│   │ Vite, RTK    │◀────────────────────────│ layered        │   │
│   └──────────────┘                         └───────┬────────┘   │
│          │                                         │            │
│          │ WebSocket (quotes, optional)            │            │
│          │                                         ▼            │
│          │                                  ┌─────────────┐     │
│          │                                  │ PostgreSQL  │     │
│          │                                  │ users /     │     │
│          │                                  │ portfolio*  │     │
│          │                                  └─────────────┘     │
│          │                                         │            │
│          │                     ┌───────────────────┼───────┐    │
│          │                     ▼                   ▼       ▼    │
│          │              Yahoo Finance         Gemini API        │
│          │              (server only)         (server only)     │
└─────────────────────────────────────────────────────────────────┘
* portfolio_accounts.owner_token is HMAC(userId), not a users FK
```

### System Components

| Component | Description | Technology |
|-----------|-------------|------------|
| **Frontend** | SPA: auth, dashboard, import, news, ticker chat | React 19, Vite, Redux Toolkit, SCSS modules |
| **Backend** | REST + WS, business logic, AI gateway | Node.js, Express, TypeScript |
| **Database** | Users, portfolio, AI cache/quota | PostgreSQL + node-pg-migrate + Drizzle (users/watchlist/AI); HMAC SQL |
| **Cache** | Quotes / ticker tape in process memory | Application memory (not Redis) |
| **External** | Quotes and headlines; LLM | Yahoo Finance; Google Gemini |

### Data Flow

```
User action → React page/hook → api/* (axios, credentials)
    → Express route → middleware (auth, validation)
    → controller → service → repository or Yahoo/Gemini
    → JSON { success, data | error } → UI (loading / toast / Error Boundary)
```

## Key Technical Decisions

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| SPA + own API, not Next.js | Cookie auth to a dedicated API; diploma Frontend wants a real SPA | Next.js SSR |
| Drizzle + keep HMAC SQL | ORM required for Backend min; anonymity SQL must stay visible | Prisma (hides SQL) |
| Gemini on backend only | Keys and guardrails cannot live in the browser | Direct frontend Gemini |
| No bank APIs | Course + product: hub, not a broker | Plaid-style linking |

## Security Overview

| Aspect | Implementation |
|--------|----------------|
| **Authentication** | JWT in HttpOnly cookie |
| **Authorization** | `userId` from cookie; portfolio via HMAC token |
| **Data Protection** | TLS in production; bcrypt hashes; minimized PII |
| **Input Validation** | Controllers throw `AppError`; AI length/scope checks |
| **Secrets Management** | `.env` locally; Azure App Settings / GitHub Secrets in D4 |
