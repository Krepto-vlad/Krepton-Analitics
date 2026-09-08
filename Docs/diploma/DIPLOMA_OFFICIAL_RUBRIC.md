# Official complexity rubric — mentor checklist

Source: institute docs in `course-diploma-projects-docs-main/04-technical-requirements/` (English, copied).  
Working notes with rationale stay in `DIPLOMA_TECHNICAL_REQUIREMENTS.md`.

**Project type:** Web application · **Level:** Standard (solo) · **Need:** ≥ 7 checkmarks, all categories.

**Declared set (8):** Business Analysis · Backend · Frontend · Database · AI Assistant / Chatbot · Cloud · CI/CD · Automated tests 70%+.

| Category | Declared | Listed below, not claimed |
|----------|----------|---------------------------|
| required | BA, Backend, Frontend | — |
| technical | AI Assistant / Chatbot | Refined UX, Adaptive UI, Cryptography |
| data | Database | Real-time Analytics, ML Model |
| infrastructure | Cloud, CI/CD | Microservices, Containerization |
| processes | Automated tests 70%+ | API Documentation (as its own criterion), Qualitative/quantitative testing |

Legend: `[x]` present in the product/repo · `[ ]` missing. **Not claimed** means we will not defend this criterion even if some bullets happen to be `[x]`.

**Max lists** copy the official website bullets in full (not a summary). Ticks stay honest.

---

# 1. Business Analysis (required)

**Status:** in progress — committee packet not finished. First criterion after topic approval. Separate committee defense.

## Minimum (grade 5)

### Vision, Problem, Project

- [ ] a. Vision Statement (like an elevator pitch)
- [ ] b. Problem Statement (Background/Context) -- describe the problem your product aims to solve.
- [ ] c. Business goals and objectives -- goals and tasks you want to achieve.
- [ ] d. Key stakeholders -- key stakeholders, including the target audience and users.

### Scope

- [ ] a. In-Scope -- what is included in the project (features, processes, systems).
- [ ] b. Out-of-Scope -- what will not be done, to avoid scope creep.

### High-Level Solution Overview

- [ ] a. Proposed Solution -- a general description of the proposed technical solution.
- [x] b. Architecture / Integration Landscape (High-Level) -- a diagram or text description of the systems involved and how they connect.

### Features & Requirements (High-Level)

- [ ] a. Core Features -- a list of key capabilities (epics, capabilities).
  - [ ] i. Functional Requirements - Work Breakdown: epics broken down into a skeleton-level list of user stories.
- [ ] b. Non-Functional Requirements -- non-functional requirements for the product (performance, security, scalability, availability).
- [x] c. Regulatory / Compliance Needs -- legal and regulatory requirements (GDPR, ISO, etc.) that apply to the project.
- [ ] d. Use Case Diagram -- a visual representation of main usage scenarios (actors and their interactions with system features).

## Maximum (grade 10)

Not targeting 10. Official max = all minimum **plus** the sections below. Repeated min items stay open until the BA packet exists.

### Introduction

- [ ] a. Purpose of the Document
- [ ] b. Audience

### Vision

- [ ] a. Vision Statement
- [ ] b. Problem Statement (business problem and current situation)
- [ ] c. Business Goals & Objectives (measurable, e.g. reduce processing time by 20%)
- [ ] d. Stakeholders Analysis (Influence/Interest matrix)
- [ ] e. Success Criteria (KPI, SLA, metrics)

### Scope

- [ ] a. In-Scope
- [ ] b. Out-of-Scope
- [ ] c. Assumptions
- [ ] d. Constraints (budget, deadlines, technology, regulations, resources)

### High-Level Solution Overview

- [ ] a. Proposed Solution
- [x] b. Architecture / Integration Landscape (same as min)
- [ ] c. Alternatives Considered

### Features & Requirements

- [ ] a. Core Features (epics)
  - [ ] i. Functional Requirements — epics → user stories
    - [ ] 1. User Stories with full descriptions:
      - [ ] a. Title
      - [ ] b. As a [role], I want [goal], so that [benefit]
      - [ ] c. Context
      - [ ] d. Scope / desired
      - [ ] e. Acceptance Criteria
      - [ ] f. Assumptions
      - [ ] g. Risks / Dependencies
      - [ ] h. Mockups / Attachments
  - [ ] ii. Priority labelling (MoSCoW at epic and story level)
- [ ] b. Non-Functional Requirements
- [x] c. Regulatory / Compliance Needs (same as min)
- [ ] d. Use Case Diagram

### Risks & Dependencies

- [ ] a. Risks
- [ ] b. Dependencies
- [ ] c. Mitigation Strategies

---

# 2. Backend (required)

**Status:** closed for defense at **7–8** (min + honest max directions). Not targeting 10.

Claimed max: CI/CD image→GHCR→Azure after green CI, correlation ID, coverage gate **80%**.  
Skip (will not build): microservices, Kafka, Redis, Grafana/Prometheus, ELK, Sonar, Alertmanager.  
Appendix only (does not reopen the criterion): Azure Log stream screenshot; optional one Portal email alert if we want extra evidence.

## Minimum (grade 5)

- [x] Use a modern framework (Node.js / Express + TypeScript)
- [x] Data state management -- relational database (PostgreSQL)
- [x] Use an ORM (Drizzle; HMAC portfolio remains explicit SQL by ADR)
- [x] Layered architecture (presentation / business / data)
- [x] Design principles (SOLID)
- [x] API description (OpenAPI/Swagger or text) -- `backend/openapi.yaml`
- [x] Global error handling
- [x] Logging -- structured logs (pino JSON + `x-request-id`)
- [x] Production deployment -- public API `https://api.kreptonanalytics.com` (Azure Container Apps)
- [x] Test coverage -- business logic unit tests, **≥ 70%** (CI gate **80%**), coverage tool (Jest / Istanbul)

### Specific constraints

- [x] No paid libraries that block review
- [x] Avoid vulnerable packages -- `npm audit` in CI (critical gate)
- [x] Version control (Git with history)
- [x] Use JSON as the main data format
- [x] Secrets not in the repository (env / cloud settings)
- [x] Deployable from the latest repository version
- [x] Do not invent custom encryption / custom JWT
- [x] Do not use outdated educational-only servers
- [x] Do not create stubs instead of a real API (PostgreSQL + Yahoo Finance)

Open for thesis polish (does not block min): OpenAPI Spectral lint vs routes.

## Maximum (grade 10)

Official list in full. **7–8 claimed.** Empty boxes below are skip, not a todo.

### CI/CD Practices

- [x] Automate building, testing, packaging, and deploying
- [x] Typical process: Docker image → container registry (GHCR) → auto-deploy to production (Azure) **after green CI**
- [x] Secrets and settings injected via environment variables / secret stores through the pipeline (Container App env + GitHub Secrets)

### Microservice Architecture

- [ ] Several microservices, each one task, independently deployable — **skip**

### Asynchronous Communication

- [ ] Message queues (RabbitMQ / Kafka) between parts of the system — **skip**

### Caching

- [ ] Redis / Memcached (quotes cache is in-process) — **skip**

### System Monitoring

- [ ] Grafana / Prometheus: CPU, request count, memory, dashboards — **skip**

### Log Management System

- [ ] Centralized search/filter (ELK or Loki) — **skip**; Azure Log stream is the substitute (screenshot for appendix)

### Request Tracing Between Microservices

- [x] Correlation ID (`x-request-id`) — one API process, not a microservice chain

### Alerting System

- [ ] Alerts on thresholds / errors (Alertmanager, Slack, email, …) — **skip** Alertmanager; optional later: one Azure Portal email on 5xx, not required to close Backend

### Quality Gates in CI/CD

- [ ] Automatic code quality (SonarQube or similar) — **skip**
- [x] Tests run in the pipeline (unit + integration)
- [x] Coverage check at **80%** (Jest gate on statements / lines / functions; live ~84% / 82% / 84%; branches ~62% still ungated)
- [x] Deployment only when all checks pass (`deploy.yml` runs after green `ci.yml` on `main`; red CI fails the deploy workflow)

---

# 3. Frontend (required)

**Status:** SPA minimum closed in code + live `https://www.kreptonanalytics.com`. Remaining: a few defense diagrams/screenshots.

## Minimum (grade 5)

### Documentation

- [x] Front-End application architecture diagram (modules, components, routes, state)
- [x] Architecture approach description (component-based, Redux/Flux)
- [x] API documentation that the client works with (cookie session + OpenAPI)
- [ ] User flows / navigation diagram -- demo scenario (register → import → rebalance → AI → export/delete) still to draw
- [x] Tech stack justification (React/Vite/RTK)

### Architecture

- [x] Components (UI elements)
- [x] Containers / Pages
- [x] Services / Hooks (API calls and business logic)
- [x] Modules — N/A (required for Angular)
- [x] Routing (at least 3–4 routes)
- [x] Local state + global state (Redux Toolkit)
- [x] Clear project structure (components, pages, services, models, styles)
- [x] Real API (not a mock server)
- [x] TypeScript interfaces
- [x] Centralized request handling (axios wrapper)
- [x] Error handling and loading states

### Implementation

- [x] Bundler (Vite)
- [x] Component-based UI (not one all-in-one component)
- [x] Reusable components
- [x] Layout components
- [x] UI library **or custom components** (custom kit)
- [x] Forms (controlled) + form validation
- [x] Data tables / lists
- [x] Filtering / search / sorting (at least 1)
- [x] Responsive layout (at least desktop + mobile)
- [x] ESLint + Prettier
- [x] Basic logging (Error Boundary / client error log)

Extra for the expert pack (not an official min bullet): tablet screenshots still to capture.

### Error handling

- [x] Global error handler (interceptor / error boundary)
- [x] Clear error messages to the user (ErrorBanner)
- [x] Handle 401 / 403 / 404 / 500 correctly
- [x] Skeleton / loading states for async operations

### Testing

- [x] Unit tests for at least 3 key components or services (RTL)
- [x] Integration / e2e tests (1–2) — Playwright (route guard + login → dashboard)
- [x] Tests cover forms, states, or API logic

### Restrictions (must not — we comply)

No tokens in source; no unhandled API errors; no unjustified `any`; SCSS architecture (not inline-style soup); real React SPA, not static HTML pages.

## Maximum (grade 10)

*All minimum plus completing **2–3** of the directions below.* Target 7–8 via lazy routes + RTK + charts/theme — not FSD / micro frontends / Lighthouse 90.

### Direction 1: Advanced Architecture

- [ ] Micro frontends (Module Federation, Web Components, Nx)
- [ ] BFF (Backend for Frontend)
- [x] Clear separation into feature modules (`pages/` + Redux `features/` slices; not FSD)
- [x] Lazy Loading of modules and routes (`React.lazy` in `AppRouter`)
- [ ] Clean Architecture / Feature-Sliced Design / Domain-Driven Front-End

### Direction 2: Advanced State Management

- [x] NGRX / Redux Toolkit with modules / slices
- [ ] Reactive state management (RxJS, Signals, Vue reactivity)
- [ ] Selectors, effects, memoization (`createSelector` / `React.memo` not used; `useMemo` in places is not this bullet)
- [x] Complex chains of async operations (RTK thunks + live polling / hydrate)

### Direction 3: Performance

- [x] Code splitting and lazy loading
- [ ] Component memoization
- [ ] Using Web Workers
- [ ] Lighthouse >= 90 for desktop and mobile (not promised on the chart-heavy dashboard)
- [ ] Bundle size reduction, performance analysis (preview Lighthouse walkthrough exists; HTTPS prod recapture + bundle visualizer still open)

### Direction 4: Advanced UI/UX

- [ ] Animations (Framer Motion, Angular Animations)
- [x] Custom component design kit
- [x] Data visualization (charts, dashboards)
- [x] Dark / light theme
- [ ] Accessibility (WCAG) as a full pack — not the Adaptive UI criterion. Partial:
  - [x] ARIA attributes (labels, dialog, busy, expanded)
  - [ ] keyboard navigation (axe/keyboard appendix still “on request”)
  - [x] contrast (Lighthouse a11y walkthrough, light/dark, marketing + app screens)

---

# 4. Database (data) — OLTP

**Status:** OLTP minimum closed. `\du` captured on Azure. Remaining: `EXPLAIN` appendix.

## Minimum (grade 5)

### Documentation

- [x] Data dictionary (tables, columns, types, keys, quality)
- [x] How integrity is maintained and how transactions are handled
- [x] Logical schema / ER (mermaid in appendix)
- [x] DDL / migrations in Git

### Design

- [x] Modern relational DBMS (PostgreSQL)
- [x] Normalization up to 3NF
- [x] Enough tables and relationship types
- [x] PK / FK, NOT NULL, UNIQUE, CHECK, meaningful types

### Deployment

- [x] Structure via migrations, not manual prod DDL
- [x] Scripts/migrations in Git

### Test data

- [x] Test / seed data (`seed:demo`)

### Usage

- [x] Roles: app_read / app_write / admin (or equivalent); application not under superuser on staging (`app_write`)
- [x] Passwords hashed (bcrypt, not MD5/SHA-1)
- [x] Integrity via constraints and transactions

## Maximum (grade 10)

Official list. We claim migrations + justified indexes + HMAC anonymization -- not a second DBMS / triggers / views.

- [ ] Several DBMS types in one project (Postgres + ClickHouse, etc.)
- [ ] Data layers raw → staging → data mart
- [x] Schema versioning (migrations + Git)
- [x] Indexes with justification
- [ ] Triggers, stored procedures, user-defined functions for business logic
- [ ] Views / materialized views
- [x] Masking / anonymization of personal data (HMAC `owner_token`; users table is email + hash only)

Extra for the thesis (not an official OLTP-max bullet): `[ ]` `EXPLAIN` / query plan appendix (`owner_token` / `email`)

---

# 5. AI Assistant / Chatbot (technical)

**Status:** minimum almost closed in product. Remaining for expert: chat screenshot + latency rerun on production.

## Minimum (grade 5)

### Documentation

- [x] Assistant description: purpose, audience, use cases
- [x] Solution architecture: diagram, model choice
- [x] System prompt with explanation of parts
- [x] Prompt templates for different scenarios (≥ 3)
- [x] Examples of typical dialogs (≥ 10, including bad requests)
- [x] API documentation (endpoints)
- [x] System limitations: what the assistant CANNOT do
- [x] User guide

### Design / UX

- [x] Modern LLM via API (Google Gemini)
- [x] Multi-layer: UI → Backend → LLM API
- [x] Separate business logic from model integration
- [x] Chat UI with typing / processing / error
- [x] New conversation (history resets on close / ticker change)
- [x] Edge cases: empty input, overly long messages, inappropriate content

### Implementation

- [x] Process text queries and generate model responses
- [x] Input validation (length, format); API errors (timeouts, 429, unavailability)
- [x] Log requests (HTTP `x-request-id`; no AI cost Grafana)
- [x] API keys in environment variables
- [x] Basic prompt-injection protection
- [x] Rate limiting / quota

### Test data and usage

- [x] ≥ 10 example dialogs + incorrect requests
- [x] Response time under 10 s (lab p95 < 1 s on 2026-08-19)
- [x] Concurrent users (lab: 10 parallel)
- [x] Cyrillic handled (if applicable)
- [x] Conversation history within a session
- [ ] Repeat latency measurement against the live API
- [ ] Screenshot of chat (quota + disclaimer) and news briefing

Restrictions we comply with: not a raw ChatGPT proxy; system prompt exists; no hardcoded “AI”; keys not in source.

## Maximum (grade 10)

*All minimum PLUS the official sections below.* Not targeting RAG / second model / MCP ≥ 3. What we actually built is preprocessing + postprocessing + cache/quota.

### Advanced Architecture

**Multiple models**

- [ ] Use 2+ different models for different tasks
- [ ] Smart model selection based on the request
- [ ] Fallback when the primary model is unavailable
- [ ] Cost optimization through choosing the right model

**RAG (Retrieval-Augmented Generation)**

- [ ] Vector DB (Pinecone, Weaviate, pgvector, ChromaDB)
- [ ] Document upload and indexing (PDF, TXT, MD)
- [ ] Semantic search over the knowledge base
- [ ] At least 100 documents/pages
- [ ] Retrieval quality metrics (precision, recall)

**MCP or Tool Use**

- [ ] Integration with external tools (calculator, search, API)
- [ ] Decide when to use tools
- [ ] At least 3 different tools / functions

### Advanced Processing

**Preprocessing**

- [x] Detect intent of the request (`tickerChatScope`)
- [x] Classify the request type
- [x] Check for toxicity / inappropriate content (jailbreak / buy-sell gate)
- [ ] Auto-correct typos
- [ ] Detect language (not a dedicated step)

**Postprocessing**

- [x] Format responses (markdown / sanitizer)
- [ ] Fact-check critical information
- [ ] Add sources / references (grounding opt-in, not on)
- [x] Structured output (JSON schema briefing)

### Context Management

- [ ] Full conversation context management beyond the drawer session
- [ ] Save history between sessions
- [ ] Smart context compression
- [x] Allow references to previous messages **within** the open chat
- [ ] User profiles / personalization in DB
- [ ] Adapt style; remember user facts; formality / length / technical level settings

### Multimodality (at least one extra I/O type)

- [ ] Images
- [ ] Audio (STT / TTS)
- [ ] Documents in the LLM (PDF/DOCX)
- [ ] Structured data as LLM I/O (tables, CSV) — broker CSV is parsed without the LLM

### Monitoring and Analytics

- [ ] Dashboard with usage metrics
- [ ] Average response time, request count
- [ ] Popular topics / questions
- [ ] User satisfaction metrics
- [x] Structured logs (JSON pino)
- [x] Request tracing (correlation ID)
- [ ] API cost monitoring dashboard
- [ ] Alerts on critical errors

### Optimization

- [x] Cache frequent requests (news briefing cache)
- [ ] Stream responses (SSE / token)
- [ ] Async processing for heavy requests (beyond normal HTTP)
- [ ] Load balancing under high load
- [ ] Automatic model selection by cost/quality
- [ ] Batch requests
- [ ] Embeddings cache for RAG

### Developer Documentation

- [x] OpenAPI tag for AI endpoints (in `openapi.yaml`)
- [ ] Guide on how to add new prompts **as a standalone AI-max doc**
- [ ] Documentation on extending functionality
- [x] Performance benchmarks (lab latency; prod rerun still open)

---

# 6. Cloud (infrastructure)

**Status:** minimum closed on Azure. Remaining: portal screenshots + optional alert.

Live: `https://www.kreptonanalytics.com` · `https://api.kreptonanalytics.com`

## Minimum (grade 5)

- [x] 1. Deploy, configure, and operate in a cloud (Azure)
- [x] 2. At least one component publicly reachable (frontend + API)
- [x] 3. Documentation of deployment steps / reproduce the environment
- [x] 4. At least one managed cloud service (Azure Database for PostgreSQL Flexible Server)
- [x] 5. Secrets in cloud-native storage, not Git
- [x] 6. Git history + description of architecture and deployed resources
- [x] 7. Reachable during evaluation; firewall / network settings
- [x] 8. No unnecessary paid resources left running (Container Apps scale-to-zero, SWA free tier, smallest Postgres SKU)

## Maximum (grade 10)

Official numbered list in full. Screenshots are **max item 6**, not min.

- [x] 1. Full stack with containers **or** orchestration **and** CI/CD (API image + GitHub Actions; frontend is Static Web Apps, not a container; K8s not claimed)
- [ ] 2. At least **two** different managed cloud services (object storage, extra DB, queue, serverless, …). We have one: Azure Database for PostgreSQL Flexible Server
- [ ] 3. Infrastructure as Code (Terraform, CloudFormation, Ansible, or equivalent)
- [x] 4. Cloud-native monitoring and logging; automated restarts / auto-scaling where appropriate (pino → Azure Log stream; Container Apps scale-to-zero / restart)
- [ ] 4b. Basic fault-tolerance testing write-up
- [ ] 5. IAM roles and least-privilege documented; cost notes; security measures write-up (env vars not in Git is not a full IAM pack)
- [ ] 6. Evidence screenshots of the cloud environment, secrets redacted
- [ ] 7. Scripts or configurations enabling **full** reproducibility of the deployed environment (Portal steps documented instead)

---

# 7. CI/CD (infrastructure)

**Status:** minimum closed (CI + auto CD on `main`).

## Minimum (grade 5)

### Documentation

- [x] CI/CD pipeline diagram (build → tests → artifact → deploy)
- [x] Tool: GitHub Actions
- [x] What is automated and why
- [x] List of artifacts (`dist`, coverage, GHCR image)
- [x] Environments: local / CI / production (honest: no separate staging)

### Pipeline

**CI (at least 3 stages)**

- [x] 1. Code checks -- lint + Prettier
- [x] 2. Build
- [x] 3. Testing -- unit + e2e job

**CD**

- [x] Deploy to Azure (Container Apps + Static Web Apps). Auto after green CI on `main`; `workflow_dispatch` also available.

### Implementation

- [x] Starts on push and pull request
- [x] Dependency caching (npm)
- [x] Produces artifacts (build output + Docker image)
- [x] Pipeline fails on build/test errors
- [x] Secrets in GitHub Secrets, not YAML
- [x] At least one security scan (`npm audit`)
- [x] Stage logs readable; CI shows tests + linter results
- [x] Cancel deployment on a failed **CI** build (`workflow_run` + refuse job when CI is not success)
- [x] Check that the container or server started successfully after deploy (`/health` on the live API; SPA URL after SWA upload)

### Restrictions (must not — we comply)

No manual artifact upload as the release path; no secrets in YAML; pipeline is not one command in one job; tests exist; pipeline is documented; deploy is automated on `main`.

## Maximum (grade 10)

*All minimum **plus** at least **two** directions below.* Not targeting 10.

### Direction 1: Advanced CD

- [ ] Blue/Green deployment
- [ ] Canary releases
- [ ] Zero downtime deploy
- [ ] Rollback mechanisms
- [ ] Automatic database migration in CD

### Direction 2: Containerization and Orchestration

- [x] Docker multi-stage build
- [x] Docker Compose with multiple services (in repo; local `up` not proven)
- [ ] Kubernetes: Deployments, Services, Ingress
- [ ] Automatic deployment to Kubernetes through CI

### Direction 3: Observability

- [ ] Grafana
- [ ] Prometheus
- [ ] Elastic Stack
- [ ] CI/CD logs in a separate storage
- [x] Auto-tagging containers with versions (GHCR image tags)
- [ ] Slack / Teams / Discord notifications about pipeline status

### Direction 4: Quality Gates

- [ ] SonarQube or SonarCloud analysis
- [x] Test coverage > 70% (backend Jest gate **80%**; official says “> 70%”)
- [ ] Code smells, bugs, vulnerabilities (Sonar)
- [ ] PR Quality rules: successful pipeline required
- [ ] PR Quality rules: code review required

### Direction 5: Infrastructure as Code

- [ ] Terraform
- [ ] Pulumi
- [ ] Ansible
- [ ] Automated environment creation
- [ ] Versioned environments

---

# 8. Automated tests 70%+ (processes)

**Status:** pyramid and 70% gate exist. Remaining: screenshot of green Actions in appendix.

## Minimum (grade 5)

- [x] 1. Structured automated testing setup; core business logic covered
- [x] 2. ≥ 70% coverage with a tool (Istanbul/Jest) — **backend business logic** (live ~84% statements / 82% functions / 84% lines; CI gate **80%**; HTML/lcov artifact). Frontend unit coverage is **~7%** and is **not** this number: the official FE bullet is #5 (RTL and/or Playwright), not a second 70% gate. Combined FE+BE statements would still be well below 70% — do not show that as the diploma figure. Appendix screenshot of the backend report still to paste.
- [x] 3. Unit tests, FIRST, edge cases
- [x] 4. Integration tests (HTTP API; Playwright against real Postgres in CI)
- [x] 5. Frontend: RTL component tests + Playwright e2e
- [x] 6. Tests run in CI; results in CI logs
- [x] 7. Testing strategy documented (`criteria/automated-tests.md`)
- [x] 8. Clear naming / folders (`*.test.ts`, `__tests__`, `e2e/*.spec.ts`)

## Maximum (grade 10)

Official numbered list in full. Target 7–8, not mutation / Pact / k6.

- [x] 1. Multi-layer strategy: unit + integration + component + e2e
- [x] 2. Business-critical areas: validation, error handling, permission checks, data processing; mocks / doubles / fixtures (Yahoo / Gemini mocked)
- [ ] 3. Complex integration: multi-service, migrations-as-tests, queues (one DB-backed Playwright flow exists; not this full bullet)
- [ ] 4. Extra methodologies: property-based, mutation, snapshot farm, contract tests (Pact)
- [x] 5. CI/CD quality gates (coverage threshold **80%** fails the job; lint in CI)
- [ ] 5b. Evidence of stable execution (screenshot / badge of green `main`)
- [ ] 6. Rationale in the report: how tests improved quality / found defects; future enhancements
- [ ] 7. Performance or load testing

---

# Undeclared criteria (visibility only)

The eight criteria above are what we defend. Sections 9–17 are the rest of the official list so a mentor can see what exists in the repo versus what the rubric still requires. **We claim: no** for all of them.

---

# 9. Adaptive UI (technical) — not claimed

**Status:** not in the declared set. Product has rem / tokens / mixins / theme / desktop+mobile. Rubric also wants Figma (or PDF) with **3 form-factors**, 44px touch targets, WCAG 2.1 AA pack.

## Minimum (grade 5)

### General

- [ ] Support 3 device types (mobile, tablet, desktop). Mobile apps: common aspect ratios and portrait/landscape
- [ ] Interface displays correctly when resolution/orientation change (no overlapping)
- [x] Relative units
- [ ] Works correctly when browser zoom / system settings change

### Visual

- [x] Scale fonts, icons, and images without distortion (lucide SVG + system fonts)
- [ ] Minimum size of interactive elements for small touch screens (**at least 44px**)
- [ ] Contrast and readability; WCAG 2.1 **AA** (at least 4.5:1 for text)
- [x] Consistent color palette and typography across devices (`_variables.scss`)

### Structural

- [x] Responsive grid; blocks scale when width changes
- [x] Main navigation available on all devices (`Navbar` + breakpoints)

### Document (required by the rubric)

- [ ] Figma (preferred) / Adobe XD / Sketch / PDF mockups
- [ ] 3 variants for different devices + reusable component library + interactive states

## Maximum (grade 10)

### Addition to General Criteria

- [ ] Any screen type (including 4K, ultrawide, foldable, smartwatch)
- [ ] Automatic device detection (pixel density, orientation, aspect ratio)
- [ ] Design System

### Addition to Visual Criteria

- [x] Light / dark theme support
- [x] SVG images for icons
- [x] User display settings (theme, display currency — not a full scale/color-scheme control panel)

### Addition to Structural Criteria

- [ ] Rebuild the application layout when the screen size changes
- [ ] Adapt mobile for one-hand use and platform patterns (Android bottom navigation / iOS tab bar)
- [ ] UI elements must not be covered by the keyboard

---

# 10. Refined UX (technical) — not claimed

**Status:** not in the declared set. Live UI has tokens, ErrorBanner, empty/error/loading. Missing: UX spec, 2–3 scenario documents, personas, Figma/PDF mockup pack.

## Minimum (grade 5)

### Interaction design / scenarios / prototyping

- [ ] 2–3 key scenarios from start to result (steps, alternatives, errors, success)
- [ ] Transition logic without jumps; each step justified by the user goal
- [ ] Link to navigation: every screen/action appears on a navigation diagram

### Visual style and component library

- [x] Palette, typography, grid, components, states (`components/ui` + SCSS tokens)
- [x] No obvious duplicated/redundant visual language in the implemented kit
- [x] Visual hierarchy in the live product (not a separate UX spec)

### Screen prototypes

- [ ] At least 3 key screens as mockups with mock content and interaction outcomes (live screens exist; Figma/PDF artifact does not)
- [x] Error messages present and clear (`ErrorBanner`, `ERROR_MESSAGES`)
- [x] Validation warnings/restrictions on forms

### Document (required by the rubric)

- [ ] UX Design Specification (PDF) or Figma/Miro with comments
- [ ] Scenarios → navigation → screens linked; short “why” for each UX decision
- [ ] Accessibility checklist at the end of that document

## Maximum (grade 10)

### Target audience analysis and personas

- [ ] Research goals, tasks, methods; sample and context
- [ ] Insights, needs, problems
- [ ] 1–2 realistic personas (goals, behavior, motivation)

### Usability testing

- [ ] Goals, hypotheses, tasks, participant profiles
- [ ] Testing with users; metrics (success rate, time, errors); priorities; prototype changes

### Navigation scheme (IA / sitemap)

- [ ] All application sections and connections
- [ ] Primary and secondary transitions (menu, submenus, modals)
- [ ] Screen states (authorized / not, empty / filled)
- [ ] Navigation patterns named
- [ ] Depth, predictability, naming consistency
- [ ] Visibility correct for guest / authorized / error / loading

### Additional (official)

- [ ] Interactive prototypes (e.g. Figma)
- [ ] Accessibility: contrast, readable fonts, not color-only, min interactive zone size, keyboard
- [x] Exception handling in the product: empty states, network errors, loading (`DashboardPanelEmptyState`, `AsyncStatePanel`)

---

# 11. Cryptography (technical) — not claimed

**Status:** not in the declared set. bcrypt / JWT / HMAC exist as **product security** (Backend / Database / GDPR). This criterion is a separate academic crypto thesis (theory, threat model, measurements). Official split: theory 20% · design 25% · implementation 25% · tests 20% · document 10%. JWT from a library and bcrypt for passwords **do not close this criterion by themselves**.

## Project components (official; no 5/10 split)

### Theoretical foundation

- [ ] Review of symmetric/asymmetric encryption, hashing, signatures, key management
- [ ] Justify algorithms (AES, RSA, ECC, …) vs requirements
- [ ] Mathematical primitives of the chosen algorithms

### Design and implementation

- [ ] Architecture diagram of where cryptography is applied
- [x] Working use of standard libraries (not a custom protocol): `bcrypt`, `jsonwebtoken`, HMAC-SHA256 `owner_token`
- [ ] Documented security assumptions, key management, dependencies **as this criterion**

### Justification

- [ ] CIA + authentication / non-repudiation vs **threat model** and adversary
- [ ] Performance / resource trade-offs
- [ ] NIST / ISO (or equivalent) compliance write-up

### Testing and evaluation

- [ ] Correctness tests of the cryptographic mechanism as a dedicated suite
- [ ] Latency / throughput / complexity measurements
- [ ] Resilience notes (brute force / side-channel / chosen plaintext where applicable)

### Documentation

- [ ] Academic report (abstract … conclusion + citations)
- [ ] Oral defense with empirical numbers for **this** criterion

---

# 12. Real-time Analytics (data) — not claimed

**Status:** not in the declared set. Quotes use polling ~30 s (cache TTL). Rubric rejects delay **> 10 s** without justification, cron, button refresh, and “no continuous stream”. `useStockWebSocket.ts` is unused; no WS/SSE server.

## Minimum (grade 5)

- [ ] At least **one** real event type arriving in near real-time

### Documentation

- [ ] Full event path: source + trigger → backend → delivery channel → UI
- [ ] What is “real-time” and **acceptable delay** (typically 1–5 s) with reasoning
- [ ] Event source and data format

### Implementation — backend

- [ ] Real-time reception (WebSocket, SSE, long polling, etc.)
- [ ] Process events as they arrive (filter / count / aggregates)
- [ ] API for current data state **as a stream component**
- [ ] Processing isolated in a dedicated module/service

### Implementation — frontend

- [ ] Dynamic visualization that updates without page reload **from a continuous stream** (polling UI updates exist; they do not close this criterion)
- [ ] Message when the connection is lost

## Maximum (grade 10)

*In addition to the minimum:*

### Documentation

- [ ] Architecture layers: ingestion / processing / storage-serving
- [ ] Justify technology: message broker (Kafka, RabbitMQ, NATS, …)
- [ ] Justify storage: in-memory / TSDB (Redis, TimescaleDB, …)
- [ ] Scaling: horizontal processors, strategy for increased load
- [ ] Stream security: auth (e.g. WS token), access restrictions, PII masked/anonymized

### Implementation

- [ ] Low latency for many clients
- [ ] Stream-processing tech (queues, in-memory DBs, etc.)
- [ ] Windowed or time-based aggregates, complex / combined metrics
- [ ] Fault tolerance: reconnection, error handling, retries
- [ ] Masking / anonymization of personal data in the stream
- [ ] Smooth, reliable live visualization with practical value

Official restrictions we currently hit: scheduled / polling delay **> 10 s**; no continuous event stream.

---

# 13. ML Model (data) — not claimed

**Status:** not in the declared set. Gemini is an LLM **API**, not a trained model. This criterion requires own training (sklearn / TF / PyTorch), dataset, metrics.

## Minimum (grade 5)

- [ ] Modern ML method (Scikit-learn, TensorFlow, PyTorch, or similar): regression / classification / clustering / NN
- [ ] Dataset ≥ 1,000 records (or equivalent); train / validation / test split; justify source
- [ ] Cleaning, normalization/scaling, encoding, feature extraction/selection
- [ ] Train at least one model; hyperparameters; metrics (accuracy, F1, ROC-AUC, RMSE, MAE, …); confusion matrix or learning curves
- [ ] Interface to the trained model (CLI / web / API) with real predictions
- [ ] Structured logging of input/output; runtime exception handling
- [ ] Git history + reproducible install/run for **the ML project**
- [ ] Short report: dataset, architecture, preprocessing, usage

## Maximum (grade 10)

- [ ] Deploy trained model as a service / interactive app; show evaluation metrics
- [ ] HPO (GridSearch / Random / Bayesian); compare multiple models
- [ ] MLflow / TensorBoard / W&B
- [ ] CI/CD keeping model and code versions in sync
- [ ] Inference optimization (quantize / batch / GPU) with before/after timings
- [ ] Feature importance, SHAP or LIME; bias / ethics note
- [ ] Unit + integration tests ≥ 70% with CI evidence **for the ML code**
- [ ] Meaningful visualizations (feature importance, learning curves, confusion matrices) and a working demo app
- [ ] Compare multiple ML approaches, analyze performance differences, suggest future work

Hardcoded / static “predictions”: official −2. Chatbot wrappers do not count.

---

# 14. Microservices (infrastructure) — not claimed

**Status:** not in the declared set. Frontend + backend + database **does not count**. Need ≥ 3 **business** services. One Express API is a monolith.

## Minimum (grade 5)

### Documentation

- [ ] Architecture diagram: all services, protocols
- [ ] Domain model / bounded contexts
- [ ] Contracts between services (OpenAPI / AsyncAPI)
- [ ] Deployment diagram
- [ ] Decomposition rationale

### Architecture

- [ ] At least 3 business services (not infrastructure)
- [ ] Separate business domains; loose coupling
- [ ] No shared database (or a written reason to share)
- [ ] Sync REST or gRPC; versioned contracts; timeouts and retries
- [ ] Handling unavailable dependents
- [ ] Rate limiting on API Gateway or service entry points **of that architecture** (Express rate limit on one API exists; not this criterion)

### Implementation

- [ ] Own codebase per service (monorepo allowed)
- [ ] Own DB or isolated schema per service
- [ ] Health / ready per service
- [ ] Correlation ID across services
- [ ] API Gateway: single external entry, routing, auth, rate limiting

### Error handling / testing

- [ ] Graceful degradation; partial results; correct HTTP codes; centralized logs **across services**
- [ ] Unit + integration + **contract** tests between services

Must not: sync chains > 3 services · reach into another service’s DB · shared business libraries · 2PC · “monolith in folders”.

## Maximum (grade 10)

*All minimum PLUS at least **2–3 directions**.* None started as a microservice design.

### Direction 1: Asynchronous Communication

- [ ] Message broker (RabbitMQ, Kafka, NATS)
- [ ] Event-driven architecture with domain events
- [ ] Pub/Sub
- [ ] Dead letter queues
- [ ] Handler idempotency
- [ ] Event sourcing (optional)

### Direction 2: Resilience Patterns

- [ ] Circuit breakers
- [ ] Bulkheads
- [ ] Rate limiting between services
- [ ] Retry with exponential backoff
- [ ] Timeout management
- [ ] Fallback mechanisms

### Direction 3: Observability

- [ ] Distributed tracing (Jaeger / Zipkin)
- [ ] Correlation IDs across all services
- [ ] Centralized logging (ELK / Loki)
- [ ] Metrics (Prometheus)
- [ ] Custom business metrics
- [ ] Service dependency mapping

### Direction 4: Advanced Patterns

- [ ] Saga
- [ ] CQRS
- [ ] API composition
- [ ] Backend for Frontend (BFF)
- [ ] Service registry and discovery
- [ ] Database per service with synchronization

### Direction 5: API Management

- [ ] Advanced API Gateway (Kong, Zuul)
- [ ] Rate limiting per client
- [ ] API versioning strategy
- [ ] Request / response transformation
- [ ] Caching at the gateway
- [ ] OAuth2 / JWT authentication **as gateway of several services**

---

# 15. Containerization (infrastructure) — not claimed

**Status:** not in the declared set. Dockerfiles + compose exist for CI/Azure. Blocker to **claim** the criterion: proven `docker compose up` (screenshot of healthy stack) + image sizes in the appendix. Local day-to-day remains `npm run dev`.

## Minimum (grade 5)

### Docker images

- [x] Separate Dockerfile per service (`backend/Dockerfile`, `frontend/Dockerfile`; Postgres = official image)
- [x] Layer order + `.dockerignore`
- [x] ENV, not hardcoded settings; `EXPOSE`; volumes for data
- [ ] Image sizes documented: backend < 1GB, frontend < 500MB (`docker images` / CI numbers not in appendix)
- [x] Multi-stage where applicable
- [x] No secrets in the image; non-root `USER`; tags not `latest` in compose (`:local`)

### Docker Compose

- [x] `docker-compose.yml` for local deployment (api + web + postgres, `depends_on`, network, `.env.example`)
- [ ] All services start with `docker compose up` — **not proven** (CI: `compose config` + `docker build`, no `up`)
- [x] Isolated network; DB volume (upload volume N/A — Multer memory)
- [x] Environment via `.env` / `.env.example`

### Documentation

- [x] README launch instructions + service table + min RAM/CPU
- [ ] Container architecture diagram **as this criterion’s appendix** (Cloud/deploy diagrams are a different criterion)
- [ ] List of all ENV variables with descriptions **as a container pack**

## Maximum (grade 10)

*All minimum PLUS:*

### Advanced Optimization

- [ ] Custom base image with pre-configured dependencies
- [ ] Conditional caching without rebuild when code is unchanged
- [ ] Build pipeline that can clean up old images
- [x] Distroless or Alpine where possible (frontend Alpine; backend is bookworm-slim, not distroless)
- [ ] Layer caching strategy documented

### Production-ready Features

- [x] Healthcheck for each container (api / web / postgres)
- [x] Resource limits (memory, CPU)
- [x] Graceful shutdown with signal handling
- [x] Automatic restart on failure (`restart: unless-stopped`)
- [x] Logging in structured format (JSON) to stdout

### Extended Configuration

- [ ] Separate compose files for dev / test / prod
- [ ] Override files for different configurations
- [ ] Secrets management (Docker secrets or external vault)
- [ ] Network policies for additional isolation

### Monitoring and Debugging

- [ ] Prometheus metrics from containers
- [ ] Centralized logging **as this criterion**
- [ ] Debug mode with debugger connection
- [ ] Performance metrics for containers

---

# 16. API Documentation (processes) — not claimed as its own criterion

**Status:** not in the declared set. `backend/openapi.yaml` is enough for **Backend minimum**. This criterion is a developer portal (Swagger UI / Redoc / Getting Started / Spectral).

## Minimum (grade 5)

- [x] OpenAPI 3 file in Git (`backend/openapi.yaml`; also served as `GET /api/docs/openapi.yaml`) — **Backend min**, not a full portal
- [ ] Structured reference covering endpoints, params, request/response, auth, errors **as a documentation set**
- [ ] Spec validated (Swagger Editor / Spectral / Redocly) in a way we can show
- [ ] Meaningful examples: requests, responses, status codes, errors, models; happy path + edge cases
- [ ] Getting Started + at least one integration tutorial (including auth)
- [ ] High-level overview (context / request flow) **as API docs**
- [ ] Published format: Swagger UI / Redoc / Docusaurus / structured Markdown site
- [ ] Report: documentation strategy, naming, versioning, known gaps
- [ ] Consistent folders (e.g. `/reference`, `/guides`, `/examples`, `/schemas`)

## Maximum (grade 10)

- [ ] 1. Conceptual guides, best practices, tutorials, onboarding, release notes, versioning (DX)
- [ ] 2. Advanced topics: complex request flows, pagination, rate limits, auth deep dive, error taxonomy, idempotency, versioning strategy
- [ ] 3. Diagrams: sequence, component, dependency maps, request–response lifecycles; cross-service contracts if multi-service
- [ ] 4. Advanced tools: Spectral / Redocly lint, Pact contracts, auto-generated examples, mock servers, developer sandbox

Official penalties if claimed: undocumented endpoints −2 · no examples −2 · no auth/security in the docs −2.

---

# 17. Qualitative / quantitative testing (processes) — not claimed

**Status:** not in the declared set. Jest / Playwright / coverage belong to **Automated tests 70%+** (claimed). This criterion needs a test plan, manual cases, execution report, and a professional tool used as a **testing workflow** (Postman / JMeter / Jira / …).

## Minimum (grade 5)

- [ ] State whether qualitative, quantitative, or both
- [ ] Scope, goals, entry/exit criteria, risks
- [ ] Requirements / feature breakdown of what is tested
- [ ] Manual test cases: preconditions, steps, expected, priority (Smoke / Critical / …)
- [ ] Quantitative metrics (pass rate, defect density, coverage, time) **or** qualitative UX findings
- [ ] Execution report: defects, environment, retest, artifacts
- [ ] At least one professional testing tool with configuration and purpose documented
- [ ] Git + reproduce the test run
- [ ] Short technical report: strategy, work done, metrics, conclusions

## Maximum (grade 10)

- [ ] 1. Strategy combining functional, non-functional, usability, exploratory, or regression; risk-based justification
- [ ] 2. Advanced design techniques (EP, BVA, decision tables, state transition, cause-effect)
- [ ] 3. Test prioritization / risk-based testing with measurable impact
- [ ] 4. Quantitative: visualize metrics, automate collection, compare test cycles
- [ ] 5. Qualitative: session charters, heuristic evaluation / cognitive walkthrough, annotated screenshots
- [ ] 6. Partial automation (UI / API / load / static analysis) with architecture (e.g. page-object)
- [ ] 7. CI/CD executing tests and producing logs/reports **as this criterion** (already true for Automated tests #8)
- [ ] 8. Advanced visualizations / dashboard
- [ ] 9. Compare methods/tools and recommend future work

---

# Summary for the mentor

| # | Criterion | We claim | Min (5) | Honest snapshot |
|---|-----------|----------|---------|-----------------|
| 1 | Business Analysis | **yes** | open | Packet after topic approval |
| 2 | Backend | **yes** | **closed (7–8)** | Live API, CD after CI, coverage 80%. Skip Kafka/Redis/microservices/Grafana/Sonar/Alertmanager |
| 3 | Frontend | **yes** | closed | Missing: demo-flow diagram, device screenshots |
| 4 | Database | **yes** | closed | OLTP Postgres; skip second DBMS |
| 5 | AI Assistant / Chatbot | **yes** | nearly closed | Need chat screenshot + prod latency |
| 6 | Cloud | **yes** | closed | Azure EU DB+API; skip IaC |
| 7 | CI/CD | **yes** | closed | Actions CI + deploy.yml after green CI |
| 8 | Automated tests 70%+ | **yes** | closed | 70% + Playwright; need CI screenshot |
| 9 | Adaptive UI | no | not targeting | rem/theme/responsive yes; no Figma ×3 / 44px / WCAG AA pack |
| 10 | Refined UX | no | not targeting | Tokens + errors in code; no UX spec / personas / scenario docs |
| 11 | Cryptography | no | not targeting | bcrypt/JWT/HMAC = product security, not this thesis |
| 12 | Real-time Analytics | no | not targeting | ~30 s polling; no WS stream; rubric delay > 10 s |
| 13 | ML Model | no | not targeting | Gemini ≠ trained model |
| 14 | Microservices | no | not targeting | FE+BE+DB ≠ ≥ 3 business services |
| 15 | Containerization | no | files only | Dockerfiles + compose exist; no proven `compose up` |
| 16 | API Documentation *(as criterion)* | no | not targeting | OpenAPI = Backend min; no Swagger UI portal / Spectral |
| 17 | Qualitative/quantitative testing | no | not targeting | No manual plan / JMeter; auto tests are criterion #8 |
