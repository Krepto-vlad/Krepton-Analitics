<!-- prev: index.md | next: faq.md -->

# Feature Walkthrough

## Authentication

Register or log in. The session cookie is HttpOnly; you cannot copy a JWT from DevTools Application → Local Storage. Logout clears the cookie.

## Portfolio import and manual positions

**Import:** choose broker format, select file, confirm parsed trades. Rejected rows should be visible rather than silently dropped.

**Manual:** add ticker + size. Validation errors stay on the form.

## Dashboard and rebalancing

Dashboard and the rebalancing page show current weights against a published or saved target. They do not calculate how to spend a new deposit, and they do not place an order at a broker. Treat the score as a description of the gap, not as a trade.

## Market data and ticker page

Search and open a ticker. Charts and quotes come from the API (Yahoo on the server). If Yahoo is down, the UI must show a failure, not hang forever.

## News briefing

On News, select tickers you already hold (limit applies). Generate today’s summary. Repeating the same request the same day should hit cache and not spend extra quota. Every briefing includes a not-advice disclaimer.

## AI chat

Open the drawer on a ticker page, or the same chat button on another page. Ask about the open screen, or name any ticker in the question and the chat uses a fresh quote for it, with a price chart in the reply when that ticker is not on the page. Closing the drawer only hides it. **New chat** archives the current conversation (the last 2 are kept in the tab and **Previous chat** restores the newest). Logout or closing the tab clears them. Jailbreaks and poems never reach Gemini.

The **Share my portfolio data with this chat** checkbox decides per question whether positions, weights, dividends, watchlist, and backtest inputs are sent. **Profile → Send my data to AI chat** turns the sharing off for the whole account.

How-to: [AI user guide](../../../ai-assistant/user-guide.md). Full examples: [dialog appendix](../../../ai-assistant/dialogs.md).

## Privacy controls

Footer/profile links to Privacy Policy and Terms. **Send my data to AI chat** (Profile) blocks portfolio data from reaching the AI chat. **Export my data** downloads a machine-readable copy. **Delete account** hard-deletes the user and cascaded rows after password/Google confirmation.
