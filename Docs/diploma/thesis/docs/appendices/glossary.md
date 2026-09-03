<!-- prev: index.md | next: api-reference.md -->

# Glossary

| Term | Definition |
|------|------------|
| Hub / proxy | App that never talks to banks; market data is fetched server-side from public APIs |
| Owner token | `HMAC-SHA256(userId, PORTFOLIO_SECRET)` stored on `portfolio_accounts` |
| Envelope | JSON `{ success: true, data }` or `{ success: false, error }` |
| Briefing | Cached Gemini news summary for selected holdings |
| Guardrail | Input/output filter so ticker chat cannot become general ChatGPT or advice |
| Drift | Difference between current weights and target allocation |

## Acronyms

| Acronym | Full form |
|---------|-----------|
| BA | Business Analysis (committee criterion) |
| NFR | Non-functional requirement |
| ORM | Object-relational mapping (Drizzle in this project) |
| SPA | Single-page application |
| GDPR | General Data Protection Regulation |
| JWT | JSON Web Token (HttpOnly cookie) |
