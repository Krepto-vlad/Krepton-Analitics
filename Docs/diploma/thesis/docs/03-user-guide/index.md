<!-- prev: ../02-technical/criteria/automated-tests.md | next: features.md -->

# 3. User Guide

## Contents

- [Features Walkthrough](features.md)
- [AI assistant](ai-assistant.md)
- [FAQ & Troubleshooting](faq.md)

## Getting Started

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Browser** | Chrome, Firefox, or Edge (current two versions) | Latest |
| **Screen** | ~375px wide (mobile layout) | 1280px+ desktop |
| **Internet** | Required (quotes + optional AI) | - |
| **Device** | Desktop or phone | Desktop for import |

### Accessing the Application

1. Open [https://www.kreptonanalytics.com](https://www.kreptonanalytics.com), or `http://localhost:5173` locally.
2. Create an account (email + password) or use Google sign-in if configured.
3. Confirm email if verification is enabled in that environment.

### First Launch

#### Step 1: Registration / Login

1. Open **Sign in** / **Register**.
2. Submit email and password (or Google).
3. You land on the dashboard (empty if you have no positions).

#### Step 2: Add holdings

Either:

- **Add position** — ticker, shares, average price, currency; or
- **Import** — upload a broker CSV/XLSX. The file is parsed in browser memory / request RAM and is **not** stored on the server disk.

#### Step 3: Dashboard

You should see weights, drift vs targets (if set), and quotes (best-effort Yahoo). Stale or missing quotes show as errors/zeros, not a white screen.

## Quick Start Guide

| Task | How To |
|------|--------|
| See allocation | Dashboard after holdings exist |
| Rebalance with new cash | Rebalancing flow — enter deposit amount |
| News briefing | News page — pick up to 5 portfolio tickers |
| Ask about one stock | Ticker page → AI chat drawer |
| Leave the product | Profile → export data and/or delete account |

## User Roles

| Role | Permissions |
|------|-------------|
| **Guest** | Landing, legal pages, register/login |
| **Authenticated investor** | Portfolio, AI, export, delete |
| **Admin** | None in the app (operators use cloud/Git) |
