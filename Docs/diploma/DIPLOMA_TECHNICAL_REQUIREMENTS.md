# Diploma Technical Requirements — Working Checklist

Источник: официальные рубрики курса (17 критериев, min = 5, max = 10).  
Назначение: сверять покрытие при работе над дипломом. Это **не** замена исходных рубрик — если эксперт спорит, смотри исходный файл в `Docs/diploma/course-diploma-projects-docs-main/04-technical-requirements/`.

План работ (фазы, набор из 8, как закрывать «неудобные» пункты рубрики): `Docs/diploma/DIPLOMA_ROADMAP.md`.

**Как пользоваться:** в трекере отмечай статус выбранных критериев. Ниже — чеклист min/max. Ставить галку только если есть **артефакт** (код, диаграмма, отчёт, CI-лог), который можно показать эксперту и вписать в пояснительную записку.

> Галочки — это минимум сложности для допуска. Комитет на предзащите ещё смотрит **глубину**. Семь поверхностных пунктов могут не пройти.

---

## Правила набора критериев

Тип проекта: **Web application**.


| Уровень             | Минимум галочек | Ограничения                                                                                       |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| **Standard** (соло) | **7**           | Хотя бы **1 required** + по **1 из каждой категории**: technical, data, infrastructure, processes |
| **Team**            | **10**          | У каждого студента свои **5** галочек                                                             |


**Required (обязательные):** Business Analysis, Backend, Frontend.

Остальные — выбираешь сам, но категории должны закрыться.


| Категория          | Критерии                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| **required**       | Business Analysis, Backend, Frontend                                      |
| **technical**      | Refined UX, Adaptive UI, AI Assistant / Chatbot, Cryptography             |
| **data**           | Database, Real-time Analytics, ML Model                                   |
| **infrastructure** | Cloud, Microservices, CI/CD, Containerization                             |
| **processes**      | API Documentation, Automated tests 70%+, Qualitative/quantitative testing |


BA защищается **отдельной комиссией**, не у индивидуального эксперта. После успешной BA-защиты можно сменить тему (последняя точка радикальной смены) — тогда BA пересдаётся.

### Что сразу режет тему

Шаблонный магазин / CMS, повтор старой работы, клон туториала, 80%+ чужого кода без доработки, low-code без исходников, мессенджер как единственный UI без своей логики, нарушение лицензий, **нет GDPR** при обработке персональных данных, этические нарушения, низкий техуровень.

Пояснительная записка — **на английском**. Рецензенты оценивают работу **только по документу**: чего нет в тексте, того для них нет.

---

## Трекер покрытия

Статус: `—` не выбран · `plan` выбран · `min` закрыт на 5 · `max` закрыт на 10.

Ревью кода/доков: **2026-08-18**. Галочки ниже — только там, где артефакт уже есть. **Ни один критерий не закрыт на** `min`**:** кода много, но рубрика требует пакет документов, деплой, coverage-отчёт, Figma и т.д.

**Официальный набор (8, решение 2026-08-18):** BA + Backend + Frontend + Database + AI Assistant + Cloud + CI/CD + Automated tests. См. `Docs/diploma/DIPLOMA_ROADMAP.md`. Containerization — файлы для деплоя, критерий не заявляем (нет локального Docker). Adaptive UI / Refined UX — запас, не основной набор.


| #   | Критерий                           | Категория      | Статус | Артефакты / дыры                                                                                                                                                                                                                            |
| --- | ---------------------------------- | -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Business Analysis                  | required       | plan   | Есть: GDPR (`Docs/GDPR_ITD.md`, Privacy/Terms PDF), архитектура (`ARCHITECTURE_*.md`, mermaid в `AI_INTEGRATION.md`), эпики в `ВозможныеФичи.md`. Нет BA-пакета: vision, stakeholders, use case diagram, in/out of scope, NFR.              |
| 2   | Backend                            | required       | plan   | Express + TS + слои, JWT+bcrypt, Yahoo, `errorHandler`, **Drizzle** (users/watchlist/AI cache+quota), **OpenAPI**, **pino** + `x-request-id`, Jest **≥70%** + CI artifact. Нет: public deploy. HMAC portfolio ещё raw SQL (ADR). Max-цель **7–8**: CD+Azure logs+alert+correlation ID; skip Kafka/Redis/микросервисы/Grafana/Sonar. |
| 3   | Frontend                           | required       | plan   | React SPA, Vite, RTK, 15+ lazy routes, SCSS, forms/tables/search, Error Boundary, skeletons, RTL, **Playwright e2e**. Дыры min: скрины tablet, mermaid демо-флоу. Max-цель **7–8**: lazy+RTK+charts уже в коде; + Lighthouse walkthrough (landing+dashboard, prod build) + a11y check. Skip FSD/Next/Figma/Sentry/PWA. i18n — после восьмёрки. |
| 4   | Database                           | data           | plan   | PostgreSQL + `node-pg-migrate`, PK/FK/UNIQUE/CASCADE/**CHECK**, транзакции, bcrypt, HMAC `owner_token`, роли `app_`*, `seed:demo`, dictionary/ER. Max-цель **7–8**: migrations+indexes+HMAC уже в коде; дыры: `\du` + `app_write` на staging + `EXPLAIN` appendix. Skip Timescale/триггеры/views/шарды. |
| 5   | Real-time Analytics                | data           | —      | **Не брать.** Котировки — polling ~30 с (TTL кэша). `useStockWebSocket.ts` не подключён, WS-сервера на бэке нет. Рубрика явно не считает delay > 10 с / cron.                                                                               |
| 6   | ML Model                           | data           | —      | **Не брать.** Gemini — LLM API, не своё обучение.                                                                                                                                                                                           |
| 7   | Adaptive UI                        | technical      | —      | Запас, не в восьмёрке. Код: mixins, rem, theme. Критерий упирается в Figma на 3 форм-фактора.                                                                                                                                               |
| 8   | Refined UX                         | technical      | —      | Запас, не в восьмёрке. Код: стиль, ошибки, empty states. Нет UX spec / персон.                                                                                                                                                              |
| 9   | AI Assistant / Chatbot             | technical      | plan   | Сильнейший technical: 4 поверхности, guardrails, quota, кэш briefing, 14 диалогов, user guide, lab p95. Max-цель **7–8**: guardrails+quota/cache уже в коде. Дыры: скрин чата, staging latency. Skip RAG/MCP/2 модели/стриминг/чат в БД. Grounding — после billing, ≠ RAG. |
| 10  | Cryptography                       | technical      | —      | **Не брать.** bcrypt/JWT/HMAC сами по себе критерий не закрывают. HMAC `owner_token` — плюс к Database/GDPR, не отдельная криптозадача.                                                                                                     |
| 11  | Cloud                              | infrastructure | plan   | Берём обязательно. Нет Azure/публичного URL/managed DB. Фаза D4 в `Docs/diploma/DIPLOMA_ROADMAP.md`.                                                                                                                                        |
| 12  | CI/CD                              | infrastructure | plan   | GitHub Actions: lint, build, Jest, coverage artifact, `npm audit`, `docker build` + `compose config`. Husky pre-push с coverage. Нет CD/Azure.                                                                                              |
| 13  | Containerization                   | infrastructure | —      | **Не заявляем.** Файлы min почти готовы (Dockerfile ×2, compose, non-root, healthcheck, CI `docker build`). Дыра для заявки: живой `compose up` + размеры образов. Можно 9-м после доказательства. |
| 14  | Microservices                      | infrastructure | —      | **Не брать.** Монолит FE+BE+Postgres не считается.                                                                                                                                                                                          |
| 15  | API Documentation                  | processes      | —      | Текстовые эндпоинты AI в `AI_INTEGRATION.md` ≠ OpenAPI-портал. Для Backend min хватит текста/Swagger; как отдельный критерий — нет.                                                                                                         |
| 16  | Automated tests 70%+               | processes      | plan   | Backend Jest **≥70%** + HTTP supertest + RTL + **Playwright e2e с реальным Postgres в CI**. Max-цель **7–8**: gate 70% + критичные unit + полная пирамида уже есть. Дыра min: скрин зелёного CI. Skip mutation/Pact/k6/FE-70%/branches-70%. Qual testing не берём. |
| 17  | Qualitative / quantitative testing | processes      | —      | Нет тест-плана, ручных кейсов, JMeter/Postman-коллекции как артефакта защиты.                                                                                                                                                               |


**Проверка набора:** required 3 · technical 1 (AI) · data 1 (Database) · infrastructure 2 (Cloud + CI/CD) · processes 1 (Auto tests) · всего **8 ≥ 7**. Adaptive/UX в `plan` по коду, но в официальную восьмёрку не входят.

---

## 1. Business Analysis (required)

Отдельная защита перед комиссией. Первый критерий после утверждения темы.

### Minimum (5)

- [ ] Vision statement (elevator pitch)
- [ ] Problem statement (контекст / текущая ситуация)
- [ ] Business goals & objectives
- [ ] Key stakeholders (аудитория и пользователи)
- [ ] In-scope
- [ ] Out-of-scope
- [ ] Proposed solution (high-level)
- [x] Architecture / integration landscape (диаграмма или текст) — `Docs/ARCHITECTURE_BACKEND.md`, `ARCHITECTURE_FRONTEND.md`, mermaid в `AI_INTEGRATION.md`
- [ ] Core features (epics) + скелет user stories — эпики есть в `ВозможныеФичи.md`, user stories нет
- [ ] Non-functional requirements (performance, security, scalability, availability)
- [x] Regulatory / compliance (GDPR и т.п.) — `Docs/GDPR_ITD.md`, Privacy/Terms PDF, delete/export в профиле
- [ ] Use case diagram

### Maximum (10) — всё min плюс

- [ ] Purpose of the document + audience
- [ ] Stakeholders analysis (Influence/Interest matrix)
- [ ] Success criteria (KPI / SLA / метрики)
- [ ] Assumptions
- [ ] Constraints (бюджет, сроки, стек, регуляторика)
- [ ] Alternatives considered и почему выбран этот вариант
- [ ] Полные user stories: title, As a / I want / so that, context, scope, acceptance criteria, assumptions, risks, mockups
- [ ] Приоритизация (MoSCoW на epic и на story)
- [ ] Risks, dependencies, mitigation

---

## 2. Backend (required)

Node.js / Express подходит как «modern framework».

### Minimum (5)

- [x] Современный серверный фреймворк — Express 4 + TypeScript
- [x] БД, если есть состояние данных — PostgreSQL (`pg`)
- [x] ORM — Drizzle on `users`, `watchlist_items`, `ai_news_summaries`, `ai_usage_events`; HMAC portfolio still raw SQL (`Docs/diploma/ADR-001-drizzle-orm.md`)
- [x] **+ диплом** Drizzle на остальные не-HMAC таблицы; `owner_token` SQL не трогаем (ADR)
- [x] Слоистая архитектура (presentation / business / data) — routes → controllers → services → repositories
- [x] SOLID — слои + таблица примеров в `Docs/diploma/thesis/docs/02-technical/criteria/backend.md`
- [x] Описание API (OpenAPI/Swagger или текст) — `backend/openapi.yaml`, отдаётся как `GET /api/docs/openapi.yaml`
- [ ] **+ диплом** OpenAPI валиден (Spectral в CI) и не разъезжается с роутами
- [x] Централизованный error handling — `backend/src/middleware/errorHandler.ts` + `AppError`
- [x] Структурированные логи ключевых событий и ошибок — `pino` JSON + `x-request-id` (ELK не нужен для min)
- [ ] **+ продукт** Production deploy, доступный внешним пользователям — Azure, фаза D4 (без URL нет min)
- [x] Unit-тесты бизнес-логики, **coverage ≥ 70%**, отчёт coverage-инструментом — Jest `coverageThreshold`; HTML/lcov в CI artifact `backend-coverage`

**Обязательные ограничения:**

- [x] Нет платных библиотек, которые мешают проверке
- [x] Аудит уязвимостей зависимостей (`npm audit` и аналоги) — отчёт `Docs/diploma/NPM_AUDIT_BACKEND.md`; axios пропатчен; xlsx high принят
- [x] Git с историей
- [x] JSON как основной формат обмена
- [x] Секреты не в репозитории (env / secret store) — `.gitignore` + `backend/.env.example` / `frontend/.env.example`
- [x] Запуск из последнего коммита без ручных костылей — `README.md` (локально; cloud не требуется для этого пункта)
- [x] Не изобретать свой JWT/шифрование — `jsonwebtoken` + `bcrypt`
- [x] Не учебные/устаревшие серверы
- [x] Не заглушки вместо реального API (статический JSON вместо БД — минус) — Yahoo Finance + Postgres

### Maximum (10)

Цель — уверенная 5 и запас **7–8**, не фейковая 10. Рубрика закрывается min + **2–3 направления**, а не всем списком.

**Делаем**

- [ ] **+ продукт** CI/CD: image → registry → auto-deploy, секреты через env — фаза D4; тот же пайплайн закрывает критерии Cloud и CI/CD
- [ ] **+ диплом (текст + скрин D4, не код)** Централизованные логи: `pino` JSON уже в stdout; в главе = Azure Log stream / Log Analytics, не свой ELK
- [ ] **+ диплом (текст, не код)** Tracing: `x-request-id` уже есть (middleware + ALS + pino); в thesis назвать correlation ID. OpenTelemetry/App Insights не делаем, пока не останется час на D4
- [ ] **+ диплом** Alerting: один Azure alert на 5xx / restart
- [ ] **+ продукт** Quality gate: деплой только с зелёного CI (lint + test + build). Coverage остаётся **70%** живыми тестами

**Скип** (в записке *why not*, не обещать эксперту)

- [ ] **− skip** Несколько независимо деплоемых микросервисов — один Express API + Postgres; «три папки» не считаются
- [ ] **− skip** Async-очередь (RabbitMQ / Kafka) — импорт in-memory в запросе, котировки TTL-кэш, AI request/response; очередь была бы декорацией
- [ ] **− skip** Redis / Memcached — кэш котировок уже in-process (`quoteCacheService`); один инстанс App Service. Redis когда появится горизонталь
- [ ] **− skip** Grafana + Prometheus — свой мониторинг-стек не нужен; метрики Azure Portal
- [ ] **− skip** ELK / Loki как отдельный кластер — см. Azure Log stream выше
- [ ] **− skip** SonarQube / coverage ≥ 80% любой ценой — self-host лишний; 80% пустыми тестами рубрика штрафует (−2)

### Штрафы (−1 каждый)

Небезопасный хэш (MD5/SHA-1) · пароли/токены plaintext · нет валидации ввода · нет error handling · всегда 200 · схема БД ≠ API · нет API docs · плохой код · плохие запросы к БД · hardcoded config · нет модульности · magic strings · дублирование · coverage < 70% · не-REST (GET для create).

---

## 3. Frontend (required)

Обязательно **SPA** на современном фреймворке (React / Vue / Angular).

### Minimum (5)

Документация:

- [x] Диаграмма FE-архитектуры (модули, компоненты, роуты, state) — mermaid в `Docs/ARCHITECTURE_FRONTEND.md` и thesis `criteria/frontend.md`
- [x] Описание подхода (component-based, Redux/Flux, …) — `Docs/ARCHITECTURE_FRONTEND.md`
- [x] API, с которым работает клиент (схемы, примеры) — cookie login / `GET /api/auth/me` в `ARCHITECTURE_FRONTEND.md`; полный контракт — `backend/openapi.yaml`
- [x] User flows / navigation diagram — mermaid RequireAuth + cookie session
- [ ] **+ диплом** User flow демо-сценария: register → import/add → dashboard → rebalance → AI → export/delete (mermaid в D2)
- [x] Обоснование стека (фреймворк, state, UI kit) — ADR в thesis `criteria/frontend.md` + `tech-stack.md`

Архитектура:

- [x] Разделение: Components / Pages / Hooks-Services / (Modules)
- [x] Routing: **минимум 3–4 маршрута** — landing, auth, dashboard, portfolio, ticker, legal, …
- [x] Local state + **global state** (Redux Toolkit и т.п.) либо явное обоснование, почему global не нужен
- [x] Понятная структура папок
- [x] Реальный API или mock server
- [x] Типы/интерфейсы (TS обязателен для Angular, для React — сильно рекомендуется)
- [x] Централизованные запросы + error/loading states — `apiClient.ts`, `ErrorBanner`, `AsyncStatePanel`

Реализация:

- [x] Бандлер (Vite / Webpack / CLI)
- [x] Компонентный UI, не один all-in-one компонент
- [x] UI-библиотека **или** свои переиспользуемые компоненты — `components/ui` (Button, Input, Select, …)
- [x] Формы + валидация — auth, add/close position, import, reset password
- [x] Таблицы/списки — positions, transactions, screener, watchlist
- [x] Фильтр / поиск / сортировка (хотя бы одно) — ticker search, screener picker
- [x] Responsive: desktop + mobile — SCSS mixins `mobile` / `tablet`
- [ ] **+ диплом** Скрины desktop + tablet + mobile ключевых экранов до предзащиты (код уже responsive; эксперту нужен артефакт)
- [x] ESLint + Prettier
- [x] Базовое логирование ошибок — `logClientError` в `AppErrorBoundary` (`console.error`); Sentry не берём (YAGNI)

Ошибки:

- [x] Global error handler (interceptor / error boundary) — axios interceptor в `apiClient.ts`; `AppErrorBoundary` в `App.tsx`
- [x] Понятные сообщения пользователю (toast/dialog) — `ErrorBanner` (не toast)
- [x] Корректная обработка 401 / 403 / 404 / 500 — `frontend/src/utils/apiError.ts` + catch-all 404 route
- [x] Skeleton/loading на все async-операции — `Skeleton` / `ContentSkeleton`; `AsyncStatePanel` по умолчанию рисует skeleton; кнопки/поиск — `loading` spinner

Тесты:

- [x] Unit: минимум 3 ключевых компонента/сервиса — RTL: ErrorBanner, AppErrorBoundary, RequireAuth, AsyncStatePanel; unit: `moneyDisplay`, `rebalancingAllocations`
- [x] **+ продукт** Integration/e2e: 2 теста Playwright (route guard redirect + login → dashboard smoke, seeded holdings) — `frontend/e2e/login.spec.ts`, гоняется локально и в CI (job `e2e`)

Запрещено: inline-styles без архитектуры CSS · один компонент на весь проект · токены в коде · необработанные API-ошибки · `any` без причины · «SPA» из статичного HTML.

### Maximum (10) — min + **2–3 направления**

Цель — уверенная 5 и запас **7–8**. Три направления в коде уже есть (lazy routes, RTK, charts/theme). Adaptive UI / Refined UX как отдельные критерии **не заявляем**.

**Делаем**

- [x] **+ продукт** Advanced architecture: lazy routes (`AppRouter.tsx`)
- [x] **+ продукт** Advanced state: RTK slices + async thunks (auth, portfolio, ticker, watchlist, …)
- [x] **+ продукт** Advanced UI/UX: графики (`lightweight-charts`), dark/light, skeleton/ARIA на async
- [ ] **+ диплом** Performance: Vite bundle visualizer в appendix. Lighthouse **walkthrough закрыт** 2026-08-21 (`vite preview`): landing/auth/pricing/security + app screens; contrast/landmarks/labels/headings/`/me`. Не обещать Performance ≥ 90 на dashboard с чартами. HTTPS staging recapture — D4. Lab baseline 2026-08-19 dashboard **dev**: P 45 / A 96 / BP 58 / SEO 82
- [x] **+ диплом** Accessibility check: Lighthouse a11y walkthrough (light/dark) на landing + marketing + auth + ключевых app-экранах. Это не заявка Adaptive UI / полной WCAG-спеки. Keyboard/axe — appendix по запросу
- [ ] **+ диплом** В thesis явно: max = lazy + RTK + charts/theme; Lighthouse — разбор отчёта, не погоня за 90

**Позже (не max, не D2)**

- [ ] **+ продукт (конец)** i18n EN+RU — после восьмёрки; защита на EN UI. См. `DIPLOMA_ROADMAP.md` «После восьмёрки»

**Скип**

- [ ] **− skip** FSD / micro-frontends — один React-бандл
- [ ] **− skip** Next.js SSR — cookie-сессия к своему API проще как SPA (ADR)
- [ ] **− skip** Figma на 3 форм-фактора / UX spec / персоны — критерии Adaptive UI и Refined UX, не в восьмёрке
- [ ] **− skip** Storybook — рубрика просит живой SPA
- [ ] **− skip** Sentry / toast-библиотека / PWA — YAGNI; Error Boundary + ErrorBanner уже есть
- [ ] **− skip** Обещать Lighthouse Performance ≥ 90 на авторизованном dashboard — чарты и polling честно портят TTI; отчёт разбираем, цифру не рисуем

---

## 4. Database (data)

Хелпер-БД «только логи/настройки» **не считается**. Для Krepton — OLTP (PostgreSQL).

### Minimum OLTP (5)

- [x] Data dictionary (таблицы, колонки, типы, ключи, качество данных) — thesis `appendices/db-schema.md`
- [x] Как обеспечивается целостность и транзакции — CHECKs в миграции + `BEGIN` в `portfolioRepository.ts` + appendix
- [x] Логическая схема (читаемая диаграмма; ER опционален) — mermaid ER в `db-schema.md`
- [x] DDL / миграции в Git (не руками в проде) — `backend/src/migrations/`
- [x] Современная реляционная СУБД — PostgreSQL
- [x] Нормализация до **3NF** — таблица в `db-schema.md` (quotes не кладём в OLTP)
- [x] Достаточно таблиц и разных типов связей — users, portfolio_accounts, positions, transactions, watchlist, strategies, AI cache/quota
- [x] PK / FK, NOT NULL, UNIQUE, CHECK, осмысленные типы — `1751370012000_add-data-integrity-checks.js`
- [x] Тестовые данные + скрипты справочников — `npm run seed:demo`
- [x] Роли: минимум app_read / app_write / admin; приложение **не под superuser** — роли в миграции (`DATABASE_ROLES.md`); локально owner OK
- [ ] **+ диплом** Скрин `\du` + staging `DATABASE_URL` = `app_write` (migrate = owner). Код ролей есть; эксперту нужен артефакт на стенде
- [x] Пароли только хэш (не MD5/SHA-1) — bcrypt
- [x] Целостность через constraints + transactions — FK CASCADE, unique, CHECK, `BEGIN`/`COMMIT`/`ROLLBACK`

Запрещено: пароли plaintext · CSV/Excel как единственное хранилище · JSON-свалка в реляционной БД без модели · нет ключей/constraints/транзакций. `jsonb` у custom allocations и AI cache — снимок настроек/кэша, не склад домена.

### Maximum OLTP (10)

Цель — уверенная 5 и запас **7–8**. Три направления max уже в коде: миграции, индексы с обоснованием, HMAC-анонимизация. Не обещать 10 через вторую СУБД или «триггер ради галочки».

**Делаем**

- [x] **+ продукт** Версионирование схемы — `node-pg-migrate` в `backend/src/migrations/`
- [x] **+ продукт** Индексы с обоснованием — `users.email`, `portfolio_accounts.owner_token`, `positions.portfolio_id`, `transactions (portfolio_id, ticker)`, `ai_usage_events` quota (таблица в `db-schema.md`)
- [x] **+ продукт** Маскирование/анонимизация — HMAC-SHA256 `owner_token`, портфель **без** FK на `users`; в `users` только email + bcrypt (или Google sub)
- [ ] **+ диплом** Скрин `\du` + на staging API ходит как `app_write`, migrate как owner (`DATABASE_ROLES.md`). Это ещё и min evidence
- [ ] **+ диплом** Appendix: `EXPLAIN` (или query plan) на lookup `owner_token` / `email` — одна страница, не pgAdmin-шоу
- [ ] **+ диплом** В thesis явно: Database max = migrations + indexes + HMAC; Azure PITR / managed backups = критерий Cloud, не «своя вторая СУБД»

**Скип**

- [ ] **− skip** Несколько СУБД (Postgres + Timescale / ClickHouse / Mongo) — котировки Yahoo + in-process TTL; OLAP-склад нам не нужен, вторая БД была бы декорацией
- [ ] **− skip** Слои ODS / DWH / datamart — один OLTP; слои приложения = repositories (это Backend, не warehouse)
- [ ] **− skip** Triggers / stored procedures / functions — `updated_at` уже `NOW()` в SQL репозитория; `DELETE FROM transactions` нужен для close position и GDPR wipe, «immutable ledger» сломает продукт
- [ ] **− skip** Views / materialized views — drift / P&L считаются в сервисах с живыми ценами; view без quotes в БД устареет
- [ ] **− skip** Партиции / шарды / read replica — один инстанс API, маленький OLTP
- [ ] **− skip** Redis как «вторая база» — см. Backend skip (кэш котировок in-process)

---

## 5. Real-time Analytics (data)

Не считается: обновление по кнопке, reload, cron раз в N минут, обычный SQL без стрима, статичный JSON/CSV, фейковый «живой» график, задержка **> 10 с** без обоснования. Целевая задержка обычно 1–5 с.

### Minimum (5)

- [ ] Хотя бы **один** реальный тип событий near real-time — сейчас polling ~30 с, это **не** считается
- [ ] Документ: путь события source → backend → канал → UI + допустимая задержка
- [ ] Формат данных и источник
- [ ] Backend: WebSocket / SSE / long polling — пакет `ws` в dependencies, сервера нет; FE-хук `useStockWebSocket.ts` не используется
- [ ] Обработка по мере поступления (filter / count / aggregate)
- [ ] API текущего состояния
- [ ] Логика вынесена в отдельный модуль
- [ ] FE: обновление без reload — polling обновляет UI без reload, но критерий всё равно не закрывает
- [ ] Сообщение при обрыве соединения

### Maximum (10)

- [ ] Слои: ingestion / processing / storage-serving
- [ ] Обоснование брокера и storage (Kafka, Redis, TimescaleDB, …)
- [ ] Масштабирование процессоров
- [ ] Auth на WS, маскирование PII в стриме
- [ ] Windowed/time-based агрегаты
- [ ] Reconnect, retry, устойчивость
- [ ] Плавная визуализация с практической пользой

---

## 6. ML Model (data)

Это **своё обучение модели**, не обёртка над ChatGPT.

### Minimum (5)

- [ ] Современный метод (sklearn / TF / PyTorch): regression / classification / clustering / NN
- [ ] Датасет ≥ 1000 записей, train/val/test, обоснование источника
- [ ] Cleaning, scaling, encoding, feature selection
- [ ] Обученная модель + метрики (Accuracy/F1/ROC-AUC или RMSE/MAE) + confusion matrix / learning curves
- [ ] Интерфейс предсказания (CLI / API / web)
- [ ] Логирование in/out + обработка ошибок
- [ ] Git + инструкция запуска
- [ ] Короткий отчёт: данные, архитектура, preprocessing, usage

### Maximum (10)

- [ ] Деплой как сервис + показ метрик
- [ ] HPO, сравнение нескольких моделей
- [ ] MLflow / TensorBoard / W&B
- [ ] CI/CD синхронизации кода и модели
- [ ] Оптимизация инференса (quantize/batch/GPU) с замерами
- [ ] SHAP/LIME, bias/ethics note
- [ ] Тесты ≥ 70% + CI evidence
- [ ] Визуализации и демо

Фейковые/захардкоженные предсказания: −2.

---

## 7. Adaptive UI (technical)

### Minimum (5)

- [ ] **3 форм-фактора:** mobile, tablet, desktop — mixins есть (`_mixins.scss`), системной вёрстки tablet + Figma нет
- [ ] Нет наложений при смене разрешения/ориентации
- [x] Относительные единицы — rem / SCSS tokens
- [ ] Корректная работа при zoom / системных настройках
- [x] Шрифты/иконки/картинки без искажений — lucide SVG + системные шрифты
- [ ] Touch-цели ≥ **44px**
- [ ] WCAG 2.1 **AA**, контраст текста ≥ **4.5:1**
- [x] Единые палитра и типографика — `_variables.scss`
- [x] Responsive grid, навигация доступна везде — `Navbar` + breakpoints

Артефакт: Figma (предпочтительно) / XD / Sketch / PDF. **3 варианта** экранов + библиотека компонентов + состояния интерактива.

### Maximum (10)

- [ ] 4K / ultrawide / foldable / watch (по возможности)
- [ ] Автодетект устройства
- [ ] Design System
- [x] Light/dark — `data-theme` + `useTheme`
- [x] SVG-иконки — lucide-react
- [x] Настройки отображения пользователем — theme, display currency
- [ ] Перестройка layout, one-hand mobile, клавиатура не перекрывает поля

---

## 8. Refined UX (technical)

### Minimum (5)

- [ ] 2–3 ключевых сценария: старт → шаги → альтернативы → ошибки → успех
- [ ] Каждый шаг обоснован целью пользователя и связан с навигацией
- [x] Визуальный стиль: палитра, типографика, сетка, компоненты, состояния — SCSS tokens + `components/ui`
- [ ] Минимум **3 ключевых экрана** с мок-контентом и результатом клика — живые экраны есть, UX-артефакта (Figma/PDF) нет
- [x] Тексты ошибок и валидация — формы + `ErrorBanner` + `ERROR_MESSAGES`

Артефакт: UX spec (PDF) или Figma/Miro с комментариями и связкой scenario → navigation → screens. У каждого решения — короткое «почему». В конце — accessibility checklist.

### Maximum (10)

- [ ] User research + 1–2 персоны
- [ ] Usability testing с метриками (success rate, time, errors) и правками прототипа
- [ ] Sitemap / IA: все разделы, роли (guest/auth), empty/filled, naming
- [ ] Интерактивный прототип
- [ ] Accessibility: контраст, зоны нажатия, keyboard, empty/error/loading states — empty/error/loading в коде есть (`DashboardPanelEmptyState`, `AsyncStatePanel`); контраст/keyboard не доказаны

---

## 9. AI Assistant / Chatbot (technical)

Не простой прокси в ChatGPT. Нужны prompt engineering, обработка, ограничения.

### Minimum (5)

- [x] Описание ассистента: цель, аудитория, use cases — `Docs/AI_INTEGRATION.md` (§1, §18)
- [x] Архитектура UI → Backend → LLM API, обоснование модели — mermaid + Gemini gateway `geminiClient.ts`
- [x] System prompt с пояснением частей — `buildTickerChatSystemInstruction` + briefing/alignment prompts
- [x] ≥ 3 prompt-шаблона под сценарии — news briefing, explain alignment, ticker chat, import schema
- [x] Примеры диалогов — [ai-dialogs.md](./thesis/docs/appendices/ai-dialogs.md) (14 сценариев; jailbreak/code/buy)
- [x] API docs эндпоинтов — таблицы в `AI_INTEGRATION.md` + tag AI в `backend/openapi.yaml`
- [x] Что ассистент **не умеет** — IN/OUT OF SCOPE + layered guardrails §18.6
- [x] User guide — thesis `03-user-guide/ai-assistant.md`
- [x] Чат UI + typing/processing/error + новая беседа — `TickerChatDrawer.tsx` (история сбрасывается при close / смене ticker)
- [ ] **+ диплом** Скрин чата (quota badge + disclaimer) и news briefing до слота — путь в user guide; кода UI хватает
- [x] Валидация ввода, обработка timeout/429, логи — quota, Express rate limit, Gemini 429→503; HTTP `x-request-id` (отдельного AI cost dashboard нет)
- [x] Ключи в env, базовая защита от prompt injection, rate limit — `GEMINI_API_KEY`, input gate + output guardrails
- [x] ≥ 10 примерных диалогов + некорректные запросы — appendix + `tickerChatScope.test.ts`
- [x] Ответ < 10 с, ≥ 10 concurrent users, история в рамках сессии — lab 2026-08-19 p95 **947 ms** / 10 parallel Gemini **870 ms** wall; история ephemeral в drawer
- [ ] **+ диплом** Повторить `npm run ai:lab-latency` на staging после D4; lab ≠ prod SLA

Запрещено: сырой прокси · нет system prompt · захардкоженные ответы · ключи в коде.

### Maximum (10) — min плюс сильные пункты

Цель — уверенная 5 и запас **7–8** (это наш самый сильный technical). Рубрика закрывается min + **2–3 направления**, не всем списком. Не обещать RAG/MCP/две модели.

**Делаем**

- [x] **+ продукт** Pre/post-processing: `tickerChatScope` (intent/jailbreak/buy-sell) + output sanitizer (code fences, advice) + JSON schema briefing + holdings-only tickers
- [x] **+ продукт** Cost control без второй модели: per-user quota (`ai_usage_events`) + кэш `ai_news_summaries` (повтор briefing не жжёт Gemini)
- [x] **+ продукт** Не прокси: Yahoo headlines + portfolio context в промпт; disclaimer на каждый ответ
- [ ] **+ диплом** В thesis явно: max = guardrails + quota/cache (+ grounding opt-in ≠ RAG). `x-request-id` = correlation на AI-роутах (тот же, что Backend)
- [ ] **+ продукт (не блокер слота)** Google Search grounding после billing card (`GEMINI_GROUNDING_ENABLED`) — `sources[]` в UI; до карты держим `false`

**Скип**

- [ ] **− skip** 2+ модели / routing / fallback на Claude — один `gemini-3.1-flash-lite`; 503 при 429 Google, не мульти-LLM
- [ ] **− skip** RAG (векторная БД, ≥ 100 документов, precision/recall) — нет своего корпуса; grounding Google ≠ RAG
- [ ] **− skip** Tool use / MCP ≥ 3 инструментов — четыре поверхности (briefing / chat / alignment / import) это продукт, не Gemini tools; grounding = один vendor tool
- [ ] **− skip** История между сессиями / сжатие контекста / персонализация в БД — ephemeral drawer это privacy (анонимный OLTP, чат не пишем)
- [ ] **− skip** Мультимодальность (картинки / аудио / PDF в LLM) — брокерские PDF мы не парсим LLM-ом; CSV/XLSX эвристикой in-memory
- [ ] **− skip** Дашборд cost/Grafana по токенам — quota badge + pino + Azure Log stream (Backend max)
- [ ] **− skip** Стриминг ответа (SSE/token) — lab p95 < 1 с; отдельный канал не нужен, пока нет жалоб на «висит»

Прокси без добавленной ценности: −2. Ключи в репо: −2. Нет деплоя: −2 (общий с Cloud/Backend, D4).

---

## 10. Cryptography (technical)

Отдельной шкалы 5/10 нет: теория 20% · дизайн/обоснование 25% · реализация 25% · тесты 20% · документ 10%.

- [ ] Обзор принципов: symmetric/asymmetric, hashing, signatures, key management
- [ ] Обоснование алгоритмов (AES, RSA, ECC, …) vs threat model, performance, NIST/ISO
- [ ] Диаграмма: где криптография в системе
- [ ] Рабочая реализация на стандартных библиотеках (не свой протокол)
- [ ] Key management, security assumptions
- [ ] Тесты корректности + latency/throughput
- [ ] Оценка устойчивости (где уместно)
- [ ] Академический отчёт + код + защита с цифрами

JWT из готовой библиотеки и bcrypt для паролей **сами по себе этот критерий не закрывают** — нужна выделенная криптографическая задача.

HMAC-SHA256 `owner_token` (`portfolioOwnerToken.ts`) — рабочая криптопримитив в продукте, но **не** пакет Cryptography (нет threat model, замеров, академического отчёта). Критерий в трекере: `—`.

---

## 11. Cloud (infrastructure)

### Minimum (5)

- [ ] Деплой хотя бы одного компонента в cloud (Azure / AWS / GCP / Render / Fly.io / …)
- [ ] Публичный URL/IP для проверяющих
- [ ] Документ: шаги деплоя, воспроизводимость
- [ ] Хотя бы **один managed-сервис** (managed DB, object storage, queue, serverless)
- [ ] Секреты в cloud-native storage, не в Git
- [ ] Описание архитектуры и ресурсов
- [ ] Сервис стабильно доступен, firewall/security groups настроены
- [ ] Нет лишних платных ресурсов «на всякий случай»

### Maximum (10)

- [ ] Весь стек в контейнерах/оркестрации + CI/CD
- [ ] ≥ 2 разных managed-сервиса
- [ ] IaC (Terraform / Bicep / Ansible / …)
- [ ] Monitoring + logging + restart/autoscale + базовый fault-tolerance тест
- [ ] IAM least privilege + cost notes
- [ ] Скриншоты среды (секреты замазаны)
- [ ] Скрипты полного воспроизведения

Недоступный URL: −2. Секреты в репо: −2. Нет managed-сервиса: −1.

---

## 12. CI/CD (infrastructure)

CI (build+tests) обязателен. CD можно упростить, даже с **manual trigger**.

### Minimum (5)

- [x] Диаграмма pipeline: build → tests → artifact → deploy
- [x] Описание инструмента (GitHub Actions и т.п.)
- [x] Зачем каждый stage
- [x] Список артефактов
- [x] Среды Dev / Test / Prod (хотя бы логически)

CI ≥ 3 стадий:

- [x] Lint + format check
- [x] Build
- [x] Unit-тесты (e2e если есть)

Плюс:

- [ ] Хоть один CD: Docker / cloud / SSH / GitHub Pages / Compose
- [x] Триггер на push и/или PR
- [x] Кэш зависимостей
- [x] Артефакт (dist / image / zip)
- [x] Pipeline падает на ошибке build/test
- [x] Секреты в GitHub Secrets, не в YAML
- [x] Хотя бы один security scan (`npm audit` и аналоги)

Запрещено: ручная заливка артефактов · секреты в репо · один job с одной командой · нет тестов · полностью ручной деплой.

### Maximum (10) — min + **≥ 2 направления**

1. Advanced CD: blue/green, canary, rollback, auto migrations
2. Containers/K8s, multi-stage, Compose из нескольких сервисов
3. Observability: Grafana/Prometheus, нотификации pipeline
4. Quality gates: Sonar, coverage > 70%, required checks на PR
5. IaC: Terraform/Pulumi/Ansible

---

## 13. Containerization (infrastructure)

**Не в восьмёрке.** Infrastructure уже закрывают Cloud + CI/CD. Файлы пишем как **deploy/CI contract** (Azure проще с образом; локально по-прежнему `npm run dev`).

Критерий можно добавить **девятым**, когда будет доказанный `docker compose up` (друг / учебная VM / Actions с Docker). Пока эксперту Containerization **не обещаем**.

### Minimum (5) — состояние файлов, не заявка

- [x] Отдельный Dockerfile на каждый сервис — `backend/Dockerfile`, `frontend/Dockerfile`; Postgres = официальный `postgres:16-bookworm`
- [x] Правильный порядок слоёв, `.dockerignore` — `npm ci` до `COPY src`; `backend/.dockerignore`, `frontend/.dockerignore` (нет `.git` / `node_modules` / `.env`)
- [x] ENV, не хардкод; EXPOSE; volumes для данных — секреты из compose `.env`; `EXPOSE 3001` / `8080`; volume `postgres_data`; upload volume нет (Multer memory)
- [ ] **+ диплом (если заявляем)** Размер образов: backend < 1GB, frontend < 500MB — в CI `docker build` есть, цифр `docker images` в appendix нет
- [x] Multi-stage где уместно — builder + runtime (Node slim / nginx-unprivileged Alpine)
- [x] Non-root `USER`, секреты не в образе, теги не `latest` — `USER node` / `USER nginx`; compose tag `:local`
- [x] `docker-compose.yml`: api + web + postgres, `depends_on` + healthcheck, сеть `krepton`, `.env.example`
- [x] README: два режима, таблица сервисов, min ~2 GB RAM / 2 CPU — корневой `README.md`
- [ ] **+ диплом (блокер заявки)** Живой `compose up` + скрин трёх healthy-сервисов. CI сейчас: `compose config` + `docker build`, **без** `up`

Запрещено: secrets в Dockerfile · root без причины · `latest` в prod · fat-container · копировать `node_modules`/`.git` · логи в файл вместо stdout.

### Maximum (10) — не целимся, куски уже в файлах

Не обещать 10. Если когда-нибудь заявим min, max-запас тонкий: healthcheck / limits / JSON logs уже есть. Остальное — skip.

**Уже в файлах (не заявляем как критерий max)**

- [x] Healthcheck на api/web/postgres; `mem_limit`; `restart: unless-stopped`; pino JSON в stdout; `SIGTERM` graceful shutdown в `index.ts`
- [x] Frontend runtime Alpine (`nginx-unprivileged`); backend — `bookworm-slim` (не distroless)

**Скип**

- [ ] **− skip** Distroless backend — slim достаточно; distroless ломает удобный `node` healthcheck без отдельного scratch-binary
- [ ] **− skip** Compose override dev/test/prod + Docker secrets — один `docker-compose.yml` + Azure App Settings
- [ ] **− skip** Prometheus metrics из контейнера — Azure Log stream / Portal (Cloud/Backend max)
- [ ] **− skip** K8s / Helm — один compose-стек, не оркестрация

Если заявляем девятым: глава-ADR «local = Node, containers = CI/Azure»; скрин `compose ps`; размеры образов из Actions. Не тащить в D2–D5 слоты восьмёрки.

---

## 14. Microservices (infrastructure)

Нужно **≥ 3 бизнес-сервиса**. Frontend + backend + DB **не считается**. Shared DB без обоснования — плохо.

### Minimum (5)

- [ ] Диаграмма сервисов и протоколов
- [ ] Bounded contexts
- [ ] Контракты (OpenAPI / AsyncAPI)
- [ ] Deployment diagram + обоснование декомпозиции
- [ ] Свой код (можно monorepo), своя БД/схема, health/ready, correlation ID
- [ ] REST или gRPC, versioned contracts, timeout/retry, деградация при недоступности
- [ ] API Gateway: routing, auth, rate limiting
- [ ] Unit + integration + contract tests

Запрещено: sync-цепочка > 3 сервисов · прямой доступ в чужую БД · shared business libraries · 2PC · «монолит по папкам».

### Maximum (10) — min + **2–3 направления**

Async/broker, circuit breaker/bulkhead, tracing/ELK/Prometheus, Saga/CQRS/BFF, продвинутый API Gateway.

---

## 15. API Documentation (processes)

Backend min просит «описать API». Этот критерий — полноценный developer portal.

### Minimum (5)

- [ ] Reference: endpoints, params, request/response, auth, errors
- [ ] Спека OpenAPI 3 / GraphQL / proto в Git, прогнанная через валидатор
- [ ] Примеры request/response, status codes, ошибки, модели; happy path + edge cases
- [ ] Getting Started + хотя бы один integration tutorial (включая auth)
- [ ] High-level overview (context / request flow), если ресурсов несколько
- [ ] Публикация: Swagger UI / Redoc / Docusaurus / структурированный Markdown
- [ ] В отчёте: стратегия доки, naming, versioning, известные пробелы
- [ ] Единые naming и структура папок (`/reference`, `/guides`, `/examples`, `/schemas`)

### Maximum (10)

- [ ] Conceptual guides, best practices, release notes, versioning
- [ ] Pagination, rate limits, idempotency, error taxonomy, auth deep dive
- [ ] Sequence/component diagrams, контракты между сервисами
- [ ] Spectral/Redocly lint, contract tests (Pact), mock server / sandbox

Дыры: недокументированные эндпоинты −2 · нет примеров −2 · нет auth/security в доке −2.

---

## 16. Automated tests 70%+ (processes)

Backend min уже требует 70% unit. Этот критерий шире: unit + integration + UI/e2e + CI. Цель — уверенная **5** и запас **7–8**. Qual/JMeter — **другой** критерий, не берём.

Coverage < 70%: −2. Тесты без логики (`expect(true)`, пустые snapshot): −2.

### Minimum (5)

- [x] Coverage **≥ 70%** инструментом + отчёт — Istanbul/Jest, порог statements/lines/functions в `backend/jest.config.js`; HTML/lcov artifact `backend-coverage`. **Branches не гейтим** (~50%)
- [x] Unit FIRST + edge cases — parsers, FX, tickerChatScope, password reset, quota, errorHandler, …
- [x] HTTP integration (supertest) — `httpApi.test.ts`: `/health`, 401 portfolio (нет cookie / мусорный JWT), 400 search без `q` (DB мокаем)
- [x] **+ продукт** Один сценарий с тестовой БД: CI job `e2e` — `services: postgres` + `migrate:up` + `seed:demo`, Playwright логинится и получает `GET /api/portfolio` 200 через реальный HttpOnly cookie. Yahoo/Gemini по-прежнему мокаем/выключены
- [x] FE component tests — RTL: ErrorBanner, AppErrorBoundary, RequireAuth, AsyncStatePanel, Skeleton; unit: `moneyDisplay`, `rebalancingAllocations`
- [x] **+ продукт** Playwright e2e: login → dashboard smoke (тот же пункт, что Frontend min). Cypress не берём — `frontend/e2e/login.spec.ts`
- [x] Тесты в CI — backend `test:coverage` + frontend `npm test` в `.github/workflows/ci.yml`; Husky pre-push = локальный крючок, не evidence эксперту
- [ ] **+ диплом** Скрин зелёного Actions-прогона + таблица coverage % в appendix (artifact есть, картинки в zip нет)
- [x] Стратегия в отчёте — `criteria/automated-tests.md`: что мокаем (Yahoo/Gemini/DB unit), как гонять локально
- [x] Структура `*.test.ts` / `__tests__` — `backend/src/__tests__/unit|integration`, `frontend/src/**/__tests__`

### Maximum (10)

Рубрика закрывается min + **2–3 направления**, не mutation + Pact + k6 сразу.

**Делаем**

- [x] **+ продукт** Quality gate: CI падает, если backend coverage < 70% (statements/lines/functions)
- [x] **+ продукт** Критичные зоны в unit: auth 401, validation 400, tickerChatScope jailbreak, HMAC/privacy, import parsers
- [x] **+ продукт** Пирамида: unit (есть) + HTTP (есть) + RTL (есть) + **один** e2e Playwright + **один** API+Postgres — обе последние закрыты одной CI job `e2e`. Это закрывает «полная пирамида» тонко, не Cypress+Pact
- [ ] **+ диплом** В thesis: «как тесты ловили баги» — 3–5 реальных регрессий (scope gate, CHECK, cookie 401) + план: не гнать 80% пустышками
- [ ] **+ диплом** Required check на PR (GitHub) когда репо не personal-only — иначе скрин зелёного `main` достаточен

**Скип**

- [ ] **− skip** Гейт FE coverage ≥ 70% и backend **branches** ≥ 70% — цифра сейчас нечестная, сломает CI ради рубрики
- [ ] **− skip** Stryker / mutation testing — долго, мало продукта
- [ ] **− skip** Property-based (fast-check) и snapshot-ферма — рубрика штрафует тесты без логики
- [ ] **− skip** Pact / contract tests — один API, OpenAPI уже в Backend
- [ ] **− skip** Очереди / миграции как «сложные async-сценарии» — очереди нет (Backend skip Kafka); migrate гоняем на старте контейнера, не отдельный test suite
- [ ] **− skip** k6/JMeter load как Auto tests max — lab AI latency уже есть; нагрузочный критерий Qual testing **не заявлен**
- [ ] **− skip** Cypress + Playwright вместе — один e2e-раннер
- [ ] **− skip** Testcontainers локально (нет Docker на машине) — Postgres в GitHub Actions services, не локальный Docker Desktop

---

## 17. Qualitative / quantitative testing (processes)

Это **не** «просто Jest». Нужны план, ручные кейсы, отчёт, инструмент тестирования.

### Minimum (5)

- [ ] Явно: qualitative / quantitative / оба
- [ ] Scope, goals, entry/exit criteria, риски
- [ ] Разбор требований → что тестируем
- [ ] Ручные test cases: preconditions, steps, expected, приоритет (Smoke/Critical)
- [ ] Quantitative: метрики (pass rate, defect density, coverage, time) **или** qualitative: UX/usability findings
- [ ] Execution report: дефекты, окружение, retest, артефакты
- [ ] Проф. инструмент (Postman / JMeter / Jira / Azure DevOps / …) с описанием зачем
- [ ] Git + воспроизведение тестового прогона
- [ ] Короткий technical report: стратегия, работа, метрики, выводы

### Maximum (10)

- [ ] Стратегия: functional + NFR + usability + exploratory/regression, risk-based
- [ ] Техники дизайна: EP, BVA, decision tables, state transition
- [ ] Quantitative: визуализация трендов, автосбор метрик, сравнение циклов
- [ ] Qualitative: session charters, heuristic evaluation, скрины
- [ ] Частичная автоматизация + CI отчёты
- [ ] Дашборд, сравнение методов, рекомендации

---

## Пересечения (чтобы не недооценить объём)

Несколько критериев делят один и тот же кусок работы, но эксперт смотрит **свой** чеклист и свои артефакты.


| Если закрываешь…   | Обычно уже частично тянет…                               | Но отдельно всё равно нужно                                    |
| ------------------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| Backend min        | кусок Auto tests (70% unit), кусок API docs, кусок Cloud | отчёт coverage, OpenAPI-портал, managed-сервис + публичный URL |
| Frontend min       | кусок Adaptive UI (desktop+mobile)                       | третий форм-фактор (tablet), Figma на 3 устройства, WCAG AA    |
| CI/CD min          | запуск тестов в CI                                       | отдельный критерий Auto tests: 70% + integration + UI          |
| Containerization   | удобный локальный деплой                                 | Cloud всё равно хочет public URL и managed service             |
| AI Assistant       | «умная фича»                                             | ML Model — это **своё обучение**, не LLM API                   |
| Backend bcrypt/JWT | базовая безопасность                                     | Cryptography — отдельная криптозадача с теорией и замерами     |


---

## Официальный набор (8)

Зафиксировано в `Docs/diploma/DIPLOMA_ROADMAP.md` (2026-08-18). Не «ориентир», а что заявляем.


| Критерий             | Категория      | Комментарий                                                                     |
| -------------------- | -------------- | ------------------------------------------------------------------------------- |
| Business Analysis    | required       | комиссия; пакет после апрува темы                                               |
| Backend              | required       | Express + слои; добить ORM, OpenAPI, логи, deploy, 70%                          |
| Frontend             | required       | SPA + Redux + Vite + **Playwright**; min: скрины tablet; max evidence: Lighthouse walkthrough + a11y check; i18n после восьмёрки; не PWA/Sentry |
| Database             | data           | OLTP min почти закрыт; max = migrations + indexes + HMAC; `\du`/`EXPLAIN` на стенде; не Timescale/триггеры |
| AI Assistant         | technical      | min почти закрыт; max = guardrails + quota/cache; скрин + staging p95; не RAG/MCP/две модели |
| Cloud                | infrastructure | Azure + managed Postgres + public URL (фаза D4)                                 |
| CI/CD                | infrastructure | GitHub Actions; CD можно manual trigger                                         |
| Automated tests 70%+ | processes      | 70% gate + unit + HTTP + RTL + Playwright (реальный Postgres в CI); добить скрин зелёного Actions; не mutation/k6 |


Не берём: Real-time, ML, Cryptography, Microservices, API Docs *как критерий*, Qual testing. Containerization — файлы min почти готовы, заявка нет (нет `compose up`). Adaptive UI / Refined UX — запас.

---

## Что готовить эксперту по каждому выбранному критерию

1. Рабочий код в Git с историей.
2. Короткий ADR/раздел в пояснительной записке (EN): решение, альтернативы, как проверяли.
3. Диаграммы из рубрики.
4. Доказательства: coverage report, pipeline screenshot, public URL, OpenAPI, Figma.
5. Список ограничений/пробелов — лучше честно, чем молча.

Шаблон раздела на критерий: `Docs/diploma/course-diploma-projects-docs-main/05-deliverables/thesis-template/docs/02-technical/criteria/_template.md`.