<!-- prev: ../index.md | next: problem-and-goals.md -->

# 1. Project Overview

This section is the Business Analysis package: problem, stakeholders, scope, and features. The committee packet is submitted and kept in `Docs/BA/`.

## Contents

- [Problem Statement & Goals](problem-and-goals.md)
- [Stakeholders & Users](stakeholders.md)
- [Scope](scope.md)
- [Features](features.md)

## Executive Summary

Retail investors see holdings in a broker app, but that app is built for execution, not for a calm monthly review: allocation vs a target, tax-aware “what to buy with new cash”, and an explanation of news around tickers they already own. Spreadsheets leak account numbers; generic ChatGPT has no portfolio context and happily gives buy/sell orders.

Krepton Analytics is a **proxy/hub**: the user authenticates, imports or enters positions, and the backend fetches public market data. AI is used only for structured briefing and ticker-scoped chat, with guardrails. Personal data is minimized (email + password hash; portfolio rows keyed by HMAC `owner_token`, not a name).

## Key Highlights

| Aspect | Description |
|--------|-------------|
| **Problem** | Broker UI ≠ portfolio analytics; spreadsheets and generic AI leak data or invent advice |
| **Solution** | Privacy-first analytics hub: import, allocation, rebalancing math, scoped AI |
| **Target Users** | Self-directed retail investors (no KYC, no executed orders) |
| **Key Features** | Auth, import, dashboard, rebalancing, news briefing, ticker AI chat, export/delete account |
| **Tech Stack** | React (Vite) + Express + PostgreSQL on Azure + Gemini on the backend |
