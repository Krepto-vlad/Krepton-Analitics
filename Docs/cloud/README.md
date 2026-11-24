# Criterion: Cloud

## Architecture Decision Record

### Status

**Status:** Accepted — deployed and live

**Date:** 2026-08-18 (proposed) → 2026-09-02 (deployed)

### Context

The site, the API, and the database run on Azure. Personal data stays in North Europe.

### Decision

The frontend is an Azure Static Web App. The API is an Azure Container App. The database is Azure Database for PostgreSQL. Secrets are in the Container App settings and in GitHub Secrets. The steps are in [deployment](./deployment.md).

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Forever localhost | The site and the API have public URLs |
| Render/Fly only | The host is Azure |
| VMs left running empty | Container Apps scale to zero when idle |

## Files in this folder

| File | Contents |
|------|----------|
| [deployment.md](./deployment.md) | Azure resources, deploy steps, cost and idle runbook |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Deploy a component to a cloud | ✅ | Both deployed: Static Web Apps (frontend) + Container Apps (backend) |
| 2 | Public URL/IP | ✅ | `https://www.kreptonanalytics.com`, `https://api.kreptonanalytics.com` |
| 3 | Repro documentation | ✅ | Steps + diagram in [deployment.md](./deployment.md) |
| 4 | ≥1 managed service | ✅ | Azure Database for PostgreSQL Flexible Server (North Europe) |
| 5 | Secrets not in Git | ✅ | `.env` gitignored; production secrets in Container App env vars + GitHub Secrets |
| 6 | Architecture of resources | ✅ | Live diagram in deployment.md |
| 7 | Reachable + firewall | ✅ | Custom domains + SSL bound; Postgres firewall allows only Azure services / the Container App |
| 8 | No idle paid waste | ✅ | Container Apps scale-to-zero; Static Web Apps free tier; smallest Postgres Burstable SKU; [cost/idle runbook](./deployment.md#cost--idle-runbook) |

## References

- [deployment.md](./deployment.md)
- [cicd.md](../ci-cd/README.md) — CD pipeline that deploys to these resources
