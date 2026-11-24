<!-- prev: stakeholders.md | next: features.md -->

# Project Scope

## In Scope

| Feature | Description | Priority |
|---------|-------------|----------|
| Auth (email + optional Google) | JWT in HttpOnly cookie | Must |
| Portfolio ingest | Manual positions + in-memory broker file parse | Must |
| Dashboard | Holdings, weights, health/drift | Must |
| Rebalancing math | Drift against a published or saved target. No broker order. A deposit split is not in this release | Must |
| Market data proxy | Yahoo Finance on the backend only | Must |
| AI news briefing | Gemini, quota, cache, disclaimer | Must |
| AI chat | Scoped to the open screen and named tickers, output guardrails, profile switch for portfolio data | Must |
| GDPR controls | Privacy Policy, export, hard-delete account | Must |
| Diploma evidence | OpenAPI, migrations, tests, Azure URL | Must |

## Out of Scope

| Feature | Reason | When Possible |
|---------|--------|---------------|
| Bank / broker API trading | Legal + architecture: hub, not a broker | Never for this product |
| Investment advice | MiFID; product is analytical | Never |
| Custom crypto protocols | Use bcrypt / JWT libraries | Never |
| Microservices split | One API process is enough | After diploma if scale needs it |
| More broker-file formats | The current parsers are enough for this release | Not planned |
| Own ML price model | Gemini is an API, not training | Not this diploma |
| Sub-10s market stream | Free Yahoo limits; polling ~30 s | If a paid data feed exists |

## Assumptions

| # | Assumption | Impact if Wrong | Probability |
|---|------------|-----------------|-------------|
| 1 | Yahoo Finance remains usable as a public quote source | Need another free/paid provider | Medium |
| 2 | Users can export a CSV/XLSX from their broker | Import epic shrinks to manual entry | Medium |
| 3 | Email is enough identity (no legal name) | GDPR still applies to email | Low |
| 4 | The live Azure bill stays on the smallest SKUs | A larger bill, or a region move | Low |

## Constraints

| Constraint Type | Description | Mitigation |
|-----------------|-------------|------------|
| **Time** | The product scope is the live app described in this thesis | Import, dashboard, rebalancing, and the assistant |
| **Budget** | Keep the live Azure bill small | Container Apps scale-to-zero; Static Web Apps free tier; smallest Postgres SKU |
| **Technology** | No real bank integrations (course + product rule) | Public APIs only |
| **Privacy** | Anonymous DB: no names, no account numbers | HMAC `owner_token`; in-memory uploads |
| **External** | Gemini key, Yahoo rate limits | Quotas, cache, graceful errors |

## Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| Yahoo Finance (yahoo-finance2) | External | Yahoo | Cached quotes |
| Google Gemini API | External | Google | Key in env, quota in the database |
| PostgreSQL | Technical | Azure Flexible Server, North Europe | ✅ production and local |
| Google OAuth (optional login) | External | Google | ✅ |
