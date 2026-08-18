<!-- prev: features.md | next: ../04-retrospective/index.md -->

# FAQ & Troubleshooting

## Frequently Asked Questions

**Q: Is this a broker or investment advisor?**

A: No. Krepton Analytics does not execute orders and does not give personalized investment advice. AI text is generated assistance with disclaimers.

**Q: Why don’t you connect to my bank?**

A: The project is a hub/proxy. Bank APIs are out of scope legally and for the course. You import a report or type positions.

**Q: Where is my password / token stored in the browser?**

A: Password is never stored. The access token is an HttpOnly cookie, not LocalStorage.

**Q: What personal data do you keep?**

A: Email and a password hash on `users`. Portfolio rows use an HMAC token, not your name or account number. See Privacy Policy.

**Q: Why did AI refuse my question?**

A: Ticker chat is scoped. Jailbreaks, unrelated coding, and buy/sell instructions are blocked by design.

**Q: Quotes look stale.**

A: Quotes are cached for a short TTL (on the order of tens of seconds). This is not a sub-second market data feed.

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Cannot log in | Cookie blocked? `withCredentials`? HTTPS mismatch on deploy |
| Empty dashboard | Import/add positions; check API errors in Network tab |
| Import fails | Format supported? File parsed in memory — retry a smaller sample |
| AI quota exceeded | Wait for the quota window; briefing cache may still return today’s summary |
| 401 loops | Cookie expired — log in again |
| CORS errors locally | Frontend origin must be allowed on the API |

### Local run

See [deployment.md](../02-technical/deployment.md). Typical cause of empty API: PostgreSQL down or `.env` missing `DATABASE_URL`.
