<!-- prev: index.md | next: stakeholders.md -->

# Problem Statement & Goals

## Context

Retail brokerage apps are excellent at orders and poor at answering “am I still on my allocation, and what should this month’s deposit buy without creating a tax event?”. Investors copy CSVs into spreadsheets or paste tickers into a chatbot. Both leak account numbers and invite fake “buy AAPL” advice.

Krepton Analytics sits **beside** the broker. It never places orders and never talks to a bank API. Quotes come from public market-data APIs on the server.

## Problem Statement

**Who:** Self-directed retail investors who already have a broker account.

**What:** They cannot get a private, allocation-aware view of holdings plus honest AI context without handing a third party their full identity and account numbers.

**Why:** Monthly rebalancing and news reading are high-frequency, high-regret tasks. A leak or a hallucinated trade instruction is expensive.

### Pain Points

| # | Pain Point | Severity | Current Workaround |
|---|------------|----------|-------------------|
| 1 | Broker shows positions, not target vs actual drift | High | Spreadsheet + manual prices |
| 2 | Rebalancing by selling creates tax events | High | Guess with a calculator |
| 3 | Multi-broker picture is fragmented | Medium | Several CSVs in one sheet |
| 4 | Generic LLM chat invents buy/sell advice and ignores the portfolio | High | “Just don’t ask that” |
| 5 | Analytics products want KYC / account linking | High | Refuse the product |

### Before / After

| Aspect | Before | After |
|--------|--------|-------|
| Monthly review | 30+ min in Excel, prices pasted by hand | Import or add positions; dashboard uses cached quotes |
| Rebalancing | Sell overweight names (tax) or guess deposit split | Math: how to allocate **new cash** without selling |
| AI | Unscoped ChatGPT | News briefing + ticker chat with scope/output guardrails |
| Privacy | Name, account numbers in the sheet or SaaS | Email + password hash; HMAC owner token; in-memory import |

## Business Goals

| Goal | Description | Success Indicator |
|------|-------------|-------------------|
| Trust | Investor can use the hub without KYC or account numbers | Delete account + export; Privacy Policy in the UI |
| Clarity | Allocation and drift are visible in one session | Dashboard shows weights vs target |
| Honesty | AI never presented as investment advice | Disclaimers + blocked buy/sell / jailbreak prompts |
| Defendable product | Diploma complexity without fake brokers | Eight criteria with code + this document |

## Objectives & Metrics

| Objective | Metric | Current Value | Target Value | Timeline |
|-----------|--------|---------------|--------------|----------|
| Import reliability | Broker report → positions without disk persistence | Implemented for supported formats | Stable demo path | Defense |
| Quote freshness | Cache TTL for quotes | ~30 s in-memory | Documented NFR, no fake WebSocket | Defense |
| AI safety | Jailbreak / “buy AAPL” do not produce advice | Guardrails in code | ≥10 documented dialogs | Expert AI |
| Availability | Public URL for reviewers | Localhost | Azure EU URL | Pre-defense |

## Success Criteria

### Must Have

- [ ] Authenticated user can import or enter positions and see allocation
- [ ] Rebalancing suggestion for **new money** (no forced sells)
- [ ] AI briefing and/or ticker chat with disclaimers and quota
- [ ] GDPR minimum: Privacy Policy, export, hard-delete account
- [ ] Public deploy + tests for the eight declared criteria

### Nice to Have

- [ ] Deposit-based rebalancing as a polished monthly ritual
- [ ] Extra broker formats via AI parser fallback

## Non-Goals

- Brokerage, order routing, or bank/Open Banking integrations
- Personalized investment advice or portfolio management under MiFID
- Training an in-house price-prediction ML model
- Real-time tick stream with delay under 10 s (Yahoo free tier + polling)
