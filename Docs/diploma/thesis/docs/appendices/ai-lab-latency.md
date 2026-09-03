<!-- prev: ai-dialogs.md | next: db-schema.md -->

# Appendix: AI lab latency

**Not a production SLA.** Measured on a developer machine against Google Gemini (`gemini-3.1-flash-lite`) through `generateTickerChatReplyWithGemini` (same gateway as ticker chat). No Azure URL yet. Re-run on staging before the Cloud/AI expert slot.

Command (from `backend/`):

```bash
npm run ai:lab-latency
# 10 concurrent Gemini calls (extra quota):
# AI_LAB_CONCURRENT_GEMINI=true npm run ai:lab-latency
```

Diploma bar: standard reply **&lt; 10 000 ms**; at least **10** overlapping requests.

## Lab run — 2026-08-19

| Probe | n | p50 | p95 | max | &lt; 10 s |
|-------|---|-----|-----|-----|-----------|
| Concurrent input-gate (10× jailbreak, no Gemini) | batch | 1 ms | 1 ms | 1 ms | yes |
| Sequential Gemini ticker-chat | 20 | 744 ms | 947 ms | 1094 ms | yes |
| Concurrent Gemini (10 in parallel, wall clock) | batch | 870 ms | 870 ms | 870 ms | yes |

Timeout in code: `GEMINI_REQUEST_TIMEOUT_MS` = 30 000 ms (error path, not hang).

Session history: ticker drawer, max 12 messages, cleared on close — see [user guide](../03-user-guide/ai-assistant.md).
