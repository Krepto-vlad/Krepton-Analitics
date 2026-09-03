<!-- prev: glossary.md | next: ai-dialogs.md -->

# API Reference

**Source of truth:** [`backend/openapi.yaml`](../../../../../backend/openapi.yaml) (OpenAPI 3.0.3).

This appendix is a map for the thesis, not a second spec. If the YAML and this page disagree, fix the YAML.

## Overview

| Item | Value |
|------|--------|
| Local base URL | `http://localhost:3001` |
| Auth | HttpOnly cookie `accessToken` (not `Authorization: Bearer` in LocalStorage) |
| Success body | `{ "success": true, "data": ... }` |
| Error body | `{ "success": false, "error": "..." }` with a real HTTP status |

## Resource groups

| Tag | Examples |
|-----|----------|
| Health | `GET /health` |
| Auth | register, login, logout, Google, delete |
| Stocks | quote, search, ticker tape |
| Portfolio | holdings, rebalancing |
| Import | multipart upload (memory storage) |
| Watchlist | CRUD-style items |
| AI | news summary, ticker chat, quota |
| Docs | OpenAPI / Swagger in non-prod |

## Typical errors

| Status | When |
|--------|------|
| 400 | Validation (`AppError`) |
| 401 | Missing/invalid cookie |
| 403 | Authenticated but not allowed |
| 404 | Unknown ticker or resource |
| 429 | Rate limit or AI quota |
| 500 | Unexpected; logged with request id |

## Getting started for a developer

1. Run API locally ([deployment](../02-technical/deployment.md)).
2. `POST` login; store cookie automatically in the browser or API client.
3. Call `GET` holdings with credentials included.

Full request/response examples: OpenAPI file.
