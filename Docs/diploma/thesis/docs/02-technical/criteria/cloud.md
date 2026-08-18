# Criterion: Cloud

## Architecture Decision Record

### Status

**Status:** Proposed (deploy before pre-defense)

**Date:** 2026-08-18

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

**Positive:** One URL closes two criteria.  
**Negative:** Nothing to show until D4.  
**Neutral:** IaC/Bicep is Cloud **max**.

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Deploy a component to a cloud | ❌ | |
| 2 | Public URL/IP | ❌ | |
| 3 | Repro documentation | ⚠️ | Local steps in [deployment.md](../deployment.md) |
| 4 | ≥1 managed service | ❌ | Planned: Azure PostgreSQL |
| 5 | Secrets not in Git | ✅ | `.env` gitignored |
| 6 | Architecture of resources | ⚠️ | Target diagram in deployment.md |
| 7 | Reachable + firewall | ❌ | |
| 8 | No idle paid waste | ✅ | Not running yet |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| No live environment | Cannot book Cloud expert | D4 before week 19 |

## References

- [deployment.md](../deployment.md)
