<!-- prev: features.md | next: faq.md -->

# AI assistant — user guide

Krepton’s AI is a **domain helper** for a portfolio you already hold. It is not ChatGPT, not a broker, and not an investment advisor.

You must be signed in. The Gemini API key never leaves the server.

## What it can do

| Surface | Where | What you get |
|---------|--------|----------------|
| **Ticker chat** | Open a ticker → AI drawer | Questions about **this** symbol: price, your position, risks, news context |
| **News briefing** | **News** → generate today’s summary | Structured briefing for 1–5 **holdings** (cached for the rest of the day) |
| **Alignment explain** | Rebalancing / dashboard | Why weights drifted vs a target mix |
| **Import mapping** | Broker import | Help mapping odd CSV/XLSX headers (heuristic first) |

Ticker chat shows a quota badge (`remaining/limit left today`) and a processing state while Gemini runs. Closing the drawer clears the thread (new conversation). History is **session-only** in the browser — not stored in PostgreSQL.

## How to use ticker chat

1. Add or import at least one position (optional for chat, required for briefing/P&amp;L context).
2. Search a ticker and open its page.
3. Open the AI drawer. Pick a suggestion or type a question (max 1000 characters).
4. Read the answer **and** the disclaimer. Verify prices with the quote on the same page.

Daily free limits (UTC): **20** chat turns, **5** briefings, **5** alignment explains. Repeating the same briefing the same day uses cache and does not spend another briefing unit.

## What it cannot do

- Place or recommend a trade (“buy AAPL now”).
- Act as a general assistant (poems, homework, “ignore previous instructions”, “you are now ChatGPT”).
- Write or debug code/scripts.
- See tickers you do not hold in a **news briefing**.
- Promise returns or “risk-free” outcomes.
- Keep chat history after you close the drawer or change ticker.

Jailbreaks and poems are refused **without** calling Gemini and **without** spending chat quota. Coding questions are steered to a finance answer; code fences in the model output are stripped.

Exact example dialogs: [AI dialog appendix](../appendices/ai-dialogs.md).

## Status, errors, Cyrillic

| You see | Meaning |
|---------|---------|
| Quota badge | Chat turns left today |
| Spinner / sending | Waiting on the API (timeouts become an error, not a hang) |
| 429 / limit reached | Wait until quota resets, or use cache briefing |
| 503 AI not configured | Server has no `GEMINI_API_KEY` |
| Russian questions | Supported; the assistant matches the user language |

Screenshots (`ticker-chat.png`, `news-briefing.png`) go in `docs/assets/screenshots/` before the expert slot.
