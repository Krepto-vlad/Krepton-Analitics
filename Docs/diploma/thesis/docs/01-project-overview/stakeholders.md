<!-- prev: problem-and-goals.md | next: scope.md -->

# Stakeholders & Users

## Target Audience

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| Retail investor | Holds ETFs/stocks at a broker; reviews monthly | Allocation, drift, deposit plan, no KYC |
| Privacy-conscious user | Will not upload account numbers to a random SaaS | Minimized PII, delete/export |
| Diploma reviewers | Experts and committee | Runnable app, diagrams, honest limitations |

The product has **no admin console** and no KYC operator role. Operators (the author) only run infrastructure.

## User Personas

### Persona 1: Alex — monthly indexer

| Attribute | Details |
|-----------|---------|
| **Role** | Employee, DCA into a few ETFs |
| **Age** | 25–40 |
| **Tech Savviness** | Medium |
| **Goals** | Stay near 70/20/10 without selling winners |
| **Frustrations** | Broker app has no target weights; Excel is fragile |
| **Scenario** | Downloads CSV, imports, types this month’s cash, follows the split |

### Persona 2: Sam — multi-broker hobbyist

| Attribute | Details |
|-----------|---------|
| **Role** | Active retail trader with two brokers |
| **Age** | 30–50 |
| **Tech Savviness** | High |
| **Goals** | One picture of holdings; news context per ticker |
| **Frustrations** | ChatGPT ignores the actual position; fears data leaks |
| **Scenario** | Opens ticker page, asks “what moved today?”, expects sources and a disclaimer |

## Stakeholder Map

### High Influence / High Interest

- **Student / operator:** delivers the system and thesis
- **Supervisor:** topic and complexity sign-off
- **BA committee:** first mandatory defense

### High Influence / Low Interest

- **Criterion experts (BE, FE, DB, AI, Cloud, CI, tests):** grade a slice, not the product vision
- **Cloud vendor (Azure):** availability and EU region, no product input

### Low Influence / High Interest

- **End users (friends / beta):** UX feedback; not a diploma stakeholder

### Low Influence / Low Interest

- **Yahoo Finance / Gemini:** external APIs; rate limits constrain NFRs
