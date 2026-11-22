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
| Live Azure from day one | Live since 2026-09-02 | Cost pushed it to D4 | Cloud and Backend deploy are closed |
| Raw SQL only | Drizzle added for ORM min | Rubric names “ORM” | Two access styles |
| Sub-second quotes | ~30 s cache | Yahoo free tier | Real-time Analytics not declared |

### Challenges

1. **Unofficial market data** — Yahoo can break; UI must degrade.
2. **LLM compliance** — must keep refusing advice even when the model tries to please.
3. **Diploma vs startup docs** — mixed folders; this `thesis/` tree is the submission copy.

## Technical Debt & Known Issues

| ID | Issue | Severity | Potential fix |
|----|-------|----------|---------------|
| TD-001 | Coverage not proven ≥ 70% | Closed | Backend Jest gate is 80% statements, lines, and functions. Frontend coverage is reported and is not gated |
| TD-002 | `\du` screenshot not captured | Low | Roles page points at the Azure screenshot; confirm the image is in the packet |
| TD-003 | OpenAPI vs TypeScript drift | Medium | Spectral lint is not in CI |
| TD-004 | HMAC domain still raw SQL | Low | Map in Drizzle later |
| TD-005 | No public URL | Closed | `www.kreptonanalytics.com` and `api.kreptonanalytics.com` |

## Future Improvements

### High priority (product, after defense)

- Deposit-based rebalancing polish

### Not this diploma

- More broker-file formats
- Microservices, Redis, own ML model, bank aggregation

## Lessons Learned

| Lesson | Application |
|--------|-------------|
| Name the criterion artifact (diagram, coverage HTML) or the expert treats it as missing | Keep checklists in `02-technical/criteria/` |
| Privacy architecture must be visible in the schema, not only in a slide | HMAC + migrations comments |
| Quote delay is about 30 s, so the product is not described as real-time | Yahoo cache TTL |
