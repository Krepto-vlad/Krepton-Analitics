<!-- prev: stakeholders.md | next: features.md -->

# Project Scope

## In Scope

| Feature | Description | Priority |
|---------|-------------|----------|
| Auth (email + optional Google) | JWT in HttpOnly cookie | Must |
| Portfolio ingest | Manual positions + in-memory broker file parse | Must |
| Dashboard | Holdings, weights, health/drift | Must |
| Rebalancing math | Target weights; deposit-based split | Must |
| Market data proxy | Yahoo Finance on the backend only | Must |
| AI news briefing | Gemini, quota, cache, disclaimer | Must |
| Ticker AI chat | Scoped to one ticker, output guardrails | Must |
| GDPR controls | Privacy Policy, export, hard-delete account | Must |
| Diploma evidence | OpenAPI, migrations, tests, Azure URL | Must |

## Out of Scope

| Feature | Reason | When Possible |
|---------|--------|---------------|
| Bank / broker API trading | Legal + architecture: hub, not a broker | Never for this product |
| Investment advice | MiFID; product is analytical | Never |
| Custom crypto protocols | Use bcrypt / JWT libraries | Never |
| Microservices split | One API process is enough | After diploma if scale needs it |
| Own ML price model | Gemini is an API, not training | Not this diploma |
| Sub-10s market stream | Free Yahoo limits; polling ~30 s | If a paid data feed exists |

## Assumptions

| # | Assumption | Impact if Wrong | Probability |
|---|------------|-----------------|-------------|
| 1 | Yahoo Finance remains usable as a public quote source | Need another free/paid provider | Medium |
| 2 | Users can export a CSV/XLSX from their broker | Import epic shrinks to manual entry | Medium |
| 3 | Email is enough identity (no legal name) | GDPR still applies to email | Low |
| 4 | Azure EU region is affordable for pre-defense weeks | Delay Cloud criterion | Medium |

## Constraints

| Constraint Type | Description | Mitigation |
|-----------------|-------------|------------|
| **Time** | Diploma calendar (BA → experts → pre-defense) | Eight criteria, not seventeen |
| **Budget** | Avoid paid Azure until near pre-defense | Local + CI first; live URL in D4 |
| **Technology** | No real bank integrations (course + product rule) | Public APIs only |
| **Privacy** | Anonymous DB: no names, no account numbers | HMAC `owner_token`; in-memory uploads |
| **External** | Gemini key, Yahoo rate limits | Quotas, cache, graceful errors |

## Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| Yahoo Finance (yahoo-finance2) | External | Yahoo | ⚠️ unofficial, cached |
| Google Gemini API | External | Google | ⚠️ key in env, quota in DB |
| PostgreSQL | Technical | Azure managed (planned) | ✅ local |
| Google OAuth (optional login) | External | Google | ✅ |
