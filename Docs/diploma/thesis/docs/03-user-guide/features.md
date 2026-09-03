<!-- prev: index.md | next: ai-assistant.md -->

# Feature Walkthrough

Add screenshots in `docs/assets/screenshots/` when recording the diploma video.

## Authentication

Register or log in. The session cookie is HttpOnly; you cannot copy a JWT from DevTools Application → Local Storage. Logout clears the cookie.

## Portfolio import and manual positions

**Import:** choose broker format, select file, confirm parsed trades. Rejected rows should be visible rather than silently dropped.

**Manual:** add ticker + size. Validation errors stay on the form.

## Dashboard and rebalancing

Dashboard shows current mix vs target. Rebalancing computes how to allocate **new cash**. It does not place an order at a broker. Treat numbers as a plan you execute yourself.

## Market data and ticker page

Search and open a ticker. Charts and quotes come from the API (Yahoo on the server). If Yahoo is down, the UI must show a failure, not hang forever.

## News briefing

On News, select tickers you already hold (limit applies). Generate today’s summary. Repeating the same request the same day should hit cache and not spend extra quota. Every briefing includes a not-advice disclaimer.

## Ticker AI chat

Open the drawer on a ticker page. Ask about **this** ticker (price, position, risks). Closing the drawer starts a new conversation. Jailbreaks and poems never reach Gemini.

How-to: [AI user guide](ai-assistant.md). Full examples: [dialog appendix](../appendices/ai-dialogs.md).

## Privacy controls

Footer/profile links to Privacy Policy and Terms. **Export my data** downloads a machine-readable copy. **Delete account** hard-deletes the user and cascaded rows after password/Google confirmation.
