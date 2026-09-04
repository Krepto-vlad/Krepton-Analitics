# Criterion: Cloud

## Architecture Decision Record

### Status

**Status:** Accepted — deployed and live

**Date:** 2026-08-18 (proposed) → 2026-09-02 (deployed)

### Context

Backend min and Cloud both require a URL reviewers can open. GDPR wants EU residency. Paid Azure is deferred until late (cost), not skipped.

### Decision

Azure in an EU region: host frontend + API, **Azure Database for PostgreSQL** as the managed service, secrets in App Settings / Key Vault. Reproduce steps in this chapter with redacted screenshots.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Forever localhost | Fails Cloud + Backend deploy |
| Render/Fly only | Azure is the course/stack choice already in architecture |
| VMs left running empty | Cost penalty in the rubric |

### Consequences

**Positive:** One URL closes two criteria (Cloud + Backend production deploy); manual, guided Azure Portal setup doubled as a hands-on learning pass, not just a scripted `az` run.  
**Negative:** Static Web Apps' free-tier region list forced East US 2 for the frontend (no EU option on the free SKU); mitigated because the frontend serves no personal data — API + database (where personal data lives) are both North Europe.  
**Neutral:** IaC/Bicep is Cloud **max**, not attempted (manual Portal setup by design, for the learning value).

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Deploy a component to a cloud | ✅ | Both deployed: Static Web Apps (frontend) + Container Apps (backend) |
| 2 | Public URL/IP | ✅ | `https://www.kreptonanalytics.com`, `https://api.kreptonanalytics.com` |
| 3 | Repro documentation | ✅ | Steps + diagram in [deployment.md](../deployment.md) |
| 4 | ≥1 managed service | ✅ | Azure Database for PostgreSQL Flexible Server (North Europe) |
| 5 | Secrets not in Git | ✅ | `.env` gitignored; production secrets in Container App env vars + GitHub Secrets |
| 6 | Architecture of resources | ✅ | Live diagram in deployment.md |
| 7 | Reachable + firewall | ✅ | Custom domains + SSL bound; Postgres firewall allows only Azure services / the Container App |
| 8 | No idle paid waste | ✅ | Container Apps scale-to-zero; Static Web Apps free tier; smallest Postgres Burstable SKU; [cost/idle runbook](../deployment.md#cost--idle-runbook) |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Static Web Apps region is East US 2, not EU | Frontend static assets served outside EU | Acceptable — no personal data in the SPA bundle; documented in Privacy Policy |
| No IaC (Bicep/Terraform) | Redeploy from scratch is manual Portal steps, not a script | Cloud **max** item, not claimed; steps are documented instead |
| Azure Log stream / alert not yet captured for the thesis appendix | Evidence gap, not a functionality gap | Capture screenshot before the defense (D4 evidence pass) |

## References

- [deployment.md](../deployment.md)
- [cicd.md](cicd.md) — CD pipeline that deploys to these resources
