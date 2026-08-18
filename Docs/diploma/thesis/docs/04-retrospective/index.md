<!-- prev: ../03-user-guide/faq.md | next: ../appendices/index.md -->

# 4. Retrospective

Fill this chapter honestly before pre-defense. Below are known facts as of 2026-08-18 — not a victory essay.

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
| Live Azure from day one | Deferred to D4 | Cost | Cloud/Backend deploy still open |
| Raw SQL only | Drizzle added for ORM min | Rubric names “ORM” | Two access styles |
| Sub-second quotes | ~30 s cache | Yahoo free tier | Real-time Analytics not declared |

### Challenges

1. **Unofficial market data** — Yahoo can break; UI must degrade.
2. **LLM compliance** — must keep refusing advice even when the model tries to please.
3. **Diploma vs startup docs** — mixed folders; this `thesis/` tree is the submission copy.

## Technical Debt & Known Issues

| ID | Issue | Severity | Potential fix |
|----|-------|----------|---------------|
| TD-001 | Coverage not proven ≥ 70% | High | D3 + CI artifact |
| TD-002 | DB roles / CHECKs incomplete | Medium | D0.3 migrations |
| TD-003 | OpenAPI vs TypeScript drift | Medium | Generate or lint spec |
| TD-004 | HMAC domain still raw SQL | Low | Map in Drizzle later |
| TD-005 | No public URL | High | Azure D4 |

## Future Improvements

### High priority (product, after defense)

- Deposit-based rebalancing polish
- Extra broker formats

### Not this diploma

- Microservices, Redis, own ML model, bank aggregation

## Lessons Learned

| Lesson | Application |
|--------|-------------|
| Name the criterion artifact (diagram, coverage HTML) or the expert treats it as missing | Keep checklists in `02-technical/criteria/` |
| Privacy architecture must be visible in the schema, not only in a slide | HMAC + migrations comments |
| Do not declare Real-time if delay is 30 s | Honest NFRs |

---

*Update the date when the defense draft is frozen.*
