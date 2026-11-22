# Criterion: AI Assistant / Chatbot

## Architecture Decision Record

### Status

**Status:** Accepted (domain assistant, not a ChatGPT proxy)

**Date:** 2026-08-18

### Context

The assistant explains news and the open ticker from the server. It does not tell the user to buy or sell.

### Decision

Gemini only from the backend (`geminiClient.ts`). Two product surfaces:

1. **News daily briefing** — cached, quota-counted, tickers must belong to the portfolio.
2. **Ticker AI chat** — one ticker, ephemeral browser history, input scope + output sanitization + quote/holding fact-check, optional Google Search grounding, no buy/sell instructions.

System prompts, templates, and “what we cannot do” are part of the product, not hidden in the UI.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Frontend Gemini key | Key theft; no quota |
| Unscoped general chat | The assistant answers about the open screen and the portfolio |
| Own trained ML model | Answers come from Gemini with the server-side portfolio context |

## Implementation Details

```
UI (NewsPage / TickerChatDrawer)
  → POST portfolio news/summary or ticker-chat
  → newsSummaryService / tickerChatService
  → tickerChatScope + tickerChatFactCheck + output guardrails
  → aiQuotaService + PostgreSQL cache/usage
  → geminiClient (prompts, optional grounding)
```

The flow above is the diploma description of the assistant.

### Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| Quota table `ai_usage_events` | Abuse and cost control |
| Cache `ai_news_summaries` | Repeat briefing does not burn quota |
| Soft-redirect on jailbreak | No model call, no charge |
| Disclaimer on every answer | Not investment advice |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Purpose, audience, use cases | ✅ | This ADR + BA features |
| 2 | Architecture + model choice | ✅ | Gemini via backend gateway |
| 3 | Prompt engineering (system + ≥3 templates) | ✅ | `buildTickerChatSystemInstruction` + briefing/alignment/import prompts |
| 4 | API docs for AI endpoints | ✅ | `backend/openapi.yaml` tag AI; [api-reference.md](../../appendices/api-reference.md) |
| 5 | Limitations (“cannot do”) | ✅ | [AI user guide](../../03-user-guide/ai-assistant.md) |
| 6 | Chat UI + status + new conversation | ✅ | Ticker drawer; close clears history |
| 7 | Validation, timeouts, logging | ✅ | 400/429/503 handled; pino + `x-request-id` |
| 8 | Keys in env, injection filter, rate limit | ✅ | `GEMINI_API_KEY`, tickerChatScope, express-rate-limit |
| 9 | ≥10 example dialogs | ✅ | [ai-dialogs.md](../../appendices/ai-dialogs.md) (14 scenarios) |
| 10 | <10 s, ≥10 concurrent, session history | ✅ | [ai-lab-latency.md](../../appendices/ai-lab-latency.md) |
| 11 | Not a dumb proxy | ✅ | Scope + sanitizer + quota + cache |
| 13 | Max: pre/post + quota/cache | ✅ | `tickerChatScope` + `tickerChatFactCheck`, `aiQuotaService`, `ai_news_summaries` |

## References

- `backend/src/services/geminiClient.ts`, `tickerChatScope`, `newsSummaryService`
- Dialogs: [ai-dialogs.md](../../appendices/ai-dialogs.md)
- Lab latency: [ai-lab-latency.md](../../appendices/ai-lab-latency.md)
- User guide: [ai-assistant.md](../../03-user-guide/ai-assistant.md)
