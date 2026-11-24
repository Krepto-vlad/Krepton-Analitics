<!-- prev: ../03-user-guide/faq.md | next: ../appendices/index.md -->

# 4. Retrospective

Facts as of 2026-11-22.

## What Went Well

### Technical

- Split-zone portfolio (`owner_token` HMAC) keeps the anonymity story auditable in SQL.
- Layered Express API and React SPA match the required Frontend/Backend shape.
- AI is a gateway with quota and guardrails, not a pasted ChatGPT iframe.
- Broker files stay in memory.

### Process

- Product rules (no bank APIs, cookies not LocalStorage) were fixed early, so BA non-goals are real.

## What Did Not Go As Planned

| Planned | Actual | Cause | Impact |
|---------|--------|-------|--------|
| Live Azure from day one | Live since 2026-09-02 | Cost | The site and the API are public |
| Raw SQL only | Drizzle for users, watchlist, and the AI cache | Typed tables | Portfolio rows stay SQL because the owner key is an HMAC |
| Sub-second quotes | ~30 s cache | Yahoo free tier | Quotes refresh from the server cache |

### Challenges

1. **Unofficial market data** — Yahoo can break; UI must degrade.
2. **LLM compliance** — must keep refusing advice even when the model tries to please.
3. **Quote delay** — free Yahoo quotes are cached for about 30 seconds.

## Technical Debt & Known Issues

| ID | Issue | Severity | Potential fix |
|----|-------|----------|---------------|
| TD-001 | Coverage not proven ≥ 70% | Closed | Backend and frontend Jest gates are 80% on statements, lines, and functions; the backend also gates branches at 60%. CI adds a PostgreSQL integration job, API contract tests, and a load test |
| TD-005 | Public URL | Closed | `www.kreptonanalytics.com` and `api.kreptonanalytics.com` |

## Future Improvements

### Next product work

- Deposit-based rebalancing polish

## Lessons Learned

| Lesson | Where it shows up |
|--------|-------------------|
| Privacy is in the schema | HMAC `owner_token` and the migrations |
| Quotes are cached | Yahoo cache TTL is about 30 seconds |
