# AI assistant — user guide

Krepton’s AI is a **domain helper** for a portfolio you already hold. It is not ChatGPT, not a broker, and not an investment advisor.

You must be signed in. The Gemini API key never leaves the server.

## What it can do

| Surface | Where | What you get |
|---------|--------|----------------|
| **AI chat** | Chat button on any screen | Questions about the **open screen** or any ticker you name: price, your position, risks, news context. A named ticker that is not on the page gets a price chart inside the reply |
| **News briefing** | **News** → generate today’s summary | Structured briefing for 1–5 **holdings** (cached for the rest of the day) |
| **Alignment explain** | Rebalancing / dashboard | Why weights drifted vs a target mix |
| **Import mapping** | Broker import | Help mapping odd CSV/XLSX headers (heuristic first) |

The chat shows a quota badge (`remaining/limit left today`) and a processing state while Gemini runs. Closing the drawer only hides it. The conversation lives in the browser tab (`sessionStorage`) — it is **not** stored in PostgreSQL. **New chat** moves the current conversation into an archive of the last 2 conversations; **Previous chat** brings the newest one back. Logout or closing the tab clears them all.

## How to use the chat

1. Add or import at least one position (optional for chat, required for briefing/P&amp;L context).
2. Open any screen, or search a ticker and open its page.
3. Open the AI drawer. Pick a suggestion or type a question (max 1000 characters). You can name a ticker in the question (`How is NVDA doing?`); Krepton looks up a fresh quote for it.
4. Leave **Share my portfolio data with this chat** ticked if you want answers about your positions, weights, dividends, watchlist, and backtest inputs. Untick it to send only public market data for that question.
5. Read the answer **and** the AI notice. The **Krepton quote** strip under the reply is the live price/position we trust.

## Privacy switch

**Profile → Send my data to AI chat** is on by default. When you turn it off, the server stops attaching your portfolio data to every chat request, the checkbox in the drawer is disabled, and the chat answers from public market data only. The switch is stored on your account and enforced by the server, so it also covers requests that did not come from the drawer. No email or account numbers are ever sent to the model.

Daily free limits (UTC): **20** chat turns, **5** briefings, **5** alignment explains. Repeating the same briefing the same day uses cache and does not spend another briefing unit. If Gemini or Krepton fails (timeout / 502 / 503 / empty reply), that attempt is **not** counted. A successful answer is counted even when we sanitize the text. Retries are still capped by the HTTP rate limit (chat: 30 / 15 min).

## What it cannot do

- Place or recommend a trade (“buy AAPL now”).
- Act as a general assistant (poems, homework, “ignore previous instructions”, “you are now ChatGPT”).
- Write or debug code/scripts.
- See tickers you do not hold in a **news briefing**.
- Promise returns or “risk-free” outcomes.
- Keep chat history on the server. Conversations stay in your browser tab and disappear on logout or when the tab closes.

Jailbreaks and poems are refused **without** calling Gemini and **without** spending chat quota. Coding questions are steered to a finance answer; code fences in the model output are stripped.

Exact example dialogs: [AI dialog appendix](./dialogs.md).

## Status, errors, Cyrillic

| You see | Meaning |
|---------|---------|
| Quota badge | Chat turns left today |
| Spinner / sending | Waiting on the API (timeouts become an error, not a hang) |
| 429 / limit reached | Wait until quota resets, or use cache briefing |
| 503 AI not configured | Server has no `GEMINI_API_KEY` |
| Russian questions | Supported; Gemini replies in the question language (or the language you ask for) |
| Ticker typos | Near-miss spellings of the **open** ticker (e.g. `ttwwo` → `TTWO`) are rewritten before Gemini |
| Krepton quote strip | Live Yahoo quote (and your position if you hold it) checked against the reply |
| Numbers aligned… | The model stated a different price/position; we appended Krepton figures |
| Web search | Google Search may run in the background; Krepton does not show outbound source links |
