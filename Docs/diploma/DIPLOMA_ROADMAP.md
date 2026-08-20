# Krepton Analytics — Diploma Roadmap

> Цель: закрыть **техчасть и артефакты** так, чтобы на защите был запас критериев, а не ровно семь «впритык».  
> Оценка: уверенная **5** и запас **7–8** по восьмёрке. Не фейковая 10 (вторая СУБД, RAG, Sentry, mutation).  
> Принцип: код, который остаётся в продукте, делаем сейчас; BA и пояснительную записку (EN) — когда тему апрувнут. Чеклисты min/max — в `Docs/diploma/DIPLOMA_TECHNICAL_REQUIREMENTS.md`.

Связанный док по продукту: `Docs/STARTUP_ROADMAP.md`. Этот файл — про **сдачу**, тот — про **запуск**. Где работа совпадает (тесты, Azure, GDPR), делаем один раз.

Ревью рубрик: **2026-08-19…20**. Код min по Backend/Frontend/Database/AI/тестам почти есть; пятёрки режет **стенд + картинки для эксперта**.

---

## Официальный набор (что берём)

Соло нужно **≥ 7** и все категории. Берём **8**, чтобы на предзащите можно было не тащить слабый пункт.


| #   | Критерий               | Категория      | Зачем берём                                                                             |
| --- | ---------------------- | -------------- | --------------------------------------------------------------------------------------- |
| 1   | Business Analysis      | required       | Обязателен, отдельная комиссия                                                          |
| 2   | Backend                | required       | Обязателен, ядро продукта                                                               |
| 3   | Frontend               | required       | Обязателен, ядро продукта                                                               |
| 4   | Database               | data           | Реальный OLTP, HMAC, миграции                                                           |
| 5   | AI Assistant / Chatbot | technical      | Уже сильнейшая «дипломная» фича                                                         |
| 6   | Cloud                  | infrastructure | **Обязателен в нашем плане:** живой URL для экспертов + Backend min (production deploy) |
| 7   | CI/CD                  | infrastructure | Cloud без пайплайна — ручной цирк; тесты и деплой должны быть зелёными на push          |
| 8   | Automated tests 70%+   | processes      | Нужен и Backend min (70%), и стартапу                                                   |


**Категории:** required 3 · technical 1 · data 1 · infrastructure **2** (запас) · processes 1. Набор валиден.

На защите заявляем все 8. Если какой-то эксперт жёсткий — остальные уже закрывают минимум 7.

Рубрики: `Docs/diploma/course-diploma-projects-docs-main/04-technical-requirements/`.  
Шаблон главы на критерий (EN): `Docs/diploma/thesis/docs/02-technical/criteria/_template.md`.

### Что уже закрыто в коде vs что ещё min


| Критерий   | Код / текст                                            | Дыра до пятёрки                                      |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------- |
| BA         | GDPR, архитектура, эпики                               | Пакет vision / stakeholders / use cases — **D1**     |
| Backend    | Слои, Drizzle (users/watchlist/AI), pino, OpenAPI, 70% | Public URL — **D4**; Spectral sync — D2              |
| Frontend   | SPA, RTK, lazy, RTL, charts/theme                      | Playwright, скрины tablet, mermaid демо-флоу — D2/D3 |
| Database   | OLTP, CHECK, роли, seed, HMAC, dictionary/ER           | `\du` + `app_write` на staging — **D4**              |
| AI         | Guardrails, quota, кэш, 14 диалогов, lab p95           | Скрин чата — D2; staging p95 — D4                    |
| Cloud      | Документ-черновик                                      | Весь стенд — **D4**                                  |
| CI/CD      | Actions: lint/build/Jest/audit/`docker build`          | CD + логические среды — **D4**                       |
| Auto tests | 70% gate, HTTP supertest, RTL                          | API+Postgres, Playwright, скрин зелёного CI — D3     |


Max **уже в коде** (не ждать D4): Frontend lazy+RTK+charts · Database migrations+indexes+HMAC · AI guardrails+quota/cache · Tests quality gate 70%. Backend max = ops на Azure (CD, log stream, один alert).

---

## Что не берём (и почему)

Не тратить семестр на критерии, которые либо фейк под наше приложение, либо отдельный проект.


| Критерий                                | Почему нет                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Real-time Analytics                     | Котировки — polling ~30 с. Рубрика не считает delay > 10 с. Настоящий WS Yahoo упрётся в лимиты free API.                    |
| ML Model                                | Gemini — чужой LLM, не своё обучение.                                                                                        |
| Cryptography                            | bcrypt/JWT/HMAC сами по себе не критерий. Отдельная криптозадача не нужна продукту.                                          |
| Microservices                           | Монолит FE+BE+Postgres. «Три папки» не считаются.                                                                            |
| API Documentation *как критерий*        | OpenAPI всё равно сделаем **для Backend min**. Отдельный developer portal — лишний объём.                                    |
| Qualitative / quantitative testing      | Ручные тест-планы + JMeter. Для стартапа важнее автотесты в CI.                                                              |
| Refined UX / Adaptive UI *как критерий* | Код уже responsive + theme. Критерий требует Figma/UX-спеку на 3 форм-фактора. **Запас**, не основной набор.                 |
| Containerization *как критерий*         | Файлы min почти готовы, локально нет Docker. **Не обещаем.** Можно 9-м после `compose up`. Infrastructure уже Cloud + CI/CD. |


---

## Containerization — не в восьмёрке, файлы всё равно пишем

Локально Docker поставить нельзя — **критерий не защищаем**, пока не будет живого `docker compose up`.

Это не дыра в наборе: infrastructure уже закрывают Cloud + CI/CD. CI уже делает `compose config` + `docker build` (без `up`).

Зачем тогда Dockerfile + Compose:

- CD в Azure (Container Apps / App Service) проще с образом, чем «rsync dist»;
- эксперт Cloud любит «весь стек воспроизводится»;
- если позже появится машина с Docker — критерий можно **добавить девятым** без переделки архитектуры.

Как сдавать без локального Docker:

1. `Dockerfile` на frontend и backend + `docker-compose.yml` + `.dockerignore` лежат в Git (multi-stage, non-root, healthcheck, тег `:local`).
2. GitHub Actions job `docker build` + `compose config` — файлы валидны.
3. Azure поднимает те же образы. Локально ты по-прежнему `npm run dev`.
4. В записке честно: *local inner loop = Node; containers are the CI/Azure deploy contract*.

Не обещать эксперту Containerization, пока `compose up` никто не прогнал (друг, учебная VM, или Actions с Docker). Distroless / K8s / Prometheus-из-контейнера — skip даже если заявим 9-м.

---

## Пункты рубрики, которые «не про продукт»

Их нельзя выкинуть: без них не будет `min` по Backend/Database/Frontend. Делаем **тонко**, с ADR «зачем для сдачи».


| Пункт                                           | Критерий        | Статус     | Как закрываем                                                                                              |
| ----------------------------------------------- | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| **ORM**                                         | Backend min     | код есть   | Drizzle на `users` / `watchlist` / AI cache+quota; HMAC-портфель — явный SQL. Не Prisma.                   |
| **Structured logs**                             | Backend min     | код есть   | `pino` JSON + `x-request-id`. На Azure — Log stream (D4), не ELK.                                          |
| **OpenAPI**                                     | Backend min     | файл есть  | `openapi.yaml` в Git. D2: Spectral + не разъезжается с роутами. Отдельный критерий API Docs **не берём**.  |
| **DB roles** `app_read` / `app_write` / `admin` | Database min    | код есть   | Роли в миграции. Staging API = `app_write` (D4). Скрин `\du`.                                              |
| **CHECK / dictionary / ER / seed / 3NF**        | Database min    | есть       | Appendix `db-schema.md` + `seed:demo`.                                                                     |
| **Error Boundary + RTL ≥ 3**                    | Frontend min    | есть       | Boundary + ErrorBanner, RequireAuth, AsyncStatePanel, Skeleton. Playwright — дыра (D2/D3, **один** smoke). |
| **User flows / FE architecture diagram**        | Frontend min    | черновик   | Mermaid роуты/Redux в D0. Демо-флоу register→…→delete — D2.                                                |
| **≥10 диалогов + user guide + lab p95**         | AI min          | есть       | Appendix + user guide + lab 2026-08-19. Скрин чата и staging p95 — ещё.                                    |
| **npm audit в пайплайне**                       | Backend + CI/CD | есть       | Job + `NPM_AUDIT_BACKEND.md` (xlsx high accepted).                                                         |
| **Public URL 24/7**                             | Cloud + Backend | D4         | Staging **до** слота Cloud / предзащиты.                                                                   |
| **IaC / второй managed service**                | Cloud max       | skip для 5 | Min: host + **Azure Database for PostgreSQL**. Key Vault / Bicep — если останется время.                   |


Правило: в пояснительной записке **не писать** «сделали, потому что надо 7 галочек». Писать продуктовую причину или честный constraint (анонимность БД, лимиты Yahoo, стоимость Azure).

---

## Фазы (обзор)

Семестр ещё не начался. Недели — **от апрува темы**, как в курсовом timeline (weeks 1–22). До этого идёт Phase D0.


| Фаза   | Фокус                                                                     | Когда                                        | Для диплома              | Для стартапа     |
| ------ | ------------------------------------------------------------------------- | -------------------------------------------- | ------------------------ | ---------------- |
| **D0** | Рубрика в коде: ORM, логи, тесты, CI, OpenAPI, Dockerfiles                | Сейчас, до семестра                          | ✅ дыры min в коде        | ✅ качество       |
| **D1** | BA-пакет + скелет thesis (EN)                                             | Сразу после апрува темы (weeks 1–3)          | ✅ комиссия BA            | 🟡 product story |
| **D2** | Картинки эксперту: OpenAPI, flows, Lighthouse/a11y, `\du` текст, скрин AI | Weeks 4–9, параллельно фичам                 | ✅ эксперты BE/FE/DB/AI   | 🟡 docs          |
| **D3** | Пирамида тонко: Postgres-сценарий + Playwright + скрин coverage           | Weeks 7–15, не в конце                       | ✅ Backend + Auto tests   | ✅ регрессия      |
| **D4** | Azure + CD + секреты + **стендовые** `\du` / latency / HTTPS Lighthouse   | Поздно и дёшево, **до** предзащиты (week 19) | ✅ Cloud + Backend deploy | ✅ friend URL     |
| **D5** | Thesis EN, видео, слоты, appendix                                         | Weeks 16–22                                  | ✅ допуск                 | —                |


```text
[D0 Rubric-in-code + CI] ──► (topic approved)
                              │
                              ├──► [D1 BA + thesis skeleton]
                              │
                              ├──► [D2 Criterion artifacts] ──┬──► [D3 Tests 70% in CI]
                              │                               │
                              └── product features ───────────┘
                                                │
                                                ▼
                                         [D4 Azure + CD]
                                                │
                                                ▼
                                      [D5 Thesis / video / defense]
```

Product-фичи (импорт, onboarding) остаются в `STARTUP_ROADMAP.md` Phase 1. Здесь — только то, без чего эксперт не поставит 5.

---

### D0.1 Backend (дыры min)

- [x] ADR: raw SQL → Drizzle (или эквивалент SQL-first ORM). HMAC `owner_token` остаётся явным.
- [x] Подключить ORM на 1–2 домена (users или watchlist), не большой-bang рефактор всего репо за неделю.
- [x] JSON-логи (`pino`) вместо голого `console.*` на запросах и ошибках.
- [x] Черновик OpenAPI 3: auth, portfolio, stocks, AI. Можно генерировать позже; файл в Git обязателен.
- [x] `npm audit` locally; список принятых уязвимостей — `Docs/diploma/NPM_AUDIT_BACKEND.md` (axios bumped to ^1.19.0; xlsx high accepted)

### D0.2 Frontend (дыры min)

- [x] React Error Boundary (fallback UI, не белый экран).
- [x] Удалить/заменить stub `Dashboard.test.tsx`.
- [x] 3 настоящих RTL-теста (не snapshot-пустышки).
- [x] Mermaid: роуты + Redux + cookie auth (черновик, в thesis отшлифуем).

### D0.3 Database (дыры min)

- [x] CHECK на инварианты (`shares > 0`, currency USD/EUR, ticker format, BUY/SELL, HMAC hex).
- [x] Роли `app_read` / `app_write` / `app_admin` в миграции + `Docs/diploma/DATABASE_ROLES.md`.
- [x] Черновик data dictionary (таблица → колонки → ключи) — thesis `appendices/db-schema.md`.
- [x] `seed:demo` для пустого стенда защиты.

### D0.4 Tests + CI (ещё без Azure)

- [x] GitHub Actions: lint + format check + build FE/BE + `jest` (оба пакета).
- [x] Кэш npm. Пайплайн падает на ошибке.
- [x] Coverage report как artifact; **порог 70%** на statements/lines/functions в `backend/jest.config.js` и в CI.
- [x] Job `docker build` (без push в registry, пока нет ACR) — проверка Dockerfiles без локального Docker.

### D0.5 AI артефакты

- [x] 10+ диалогов: нормальные вопросы + «ignore previous instructions» + «напиши код» + «купи AAPL».
- [x] Замер latency на staging, когда он появится; до этого — локальный p95 на 20 запросах (честно пометить как lab, не prod SLA).

### D0.6 Docker-контракт (не критерий)

- [x] `backend/Dockerfile`, `frontend/Dockerfile` (multi-stage, non-root, ENV).
- [x] `docker-compose.yml`: api + web + postgres; `.env.example`.
- [x] README: «local without Docker» vs «compose (CI/Azure)».

---

## Phase D1 — BA + скелет записки (после апрува темы)

Первый критерий курса. Комиссия, не индивидуальный эксперт.

Писать **на английском** сразу — рецензент читает только документ.

Минимум (5):

- [ ] Vision / elevator pitch
- [ ] Problem statement (контекст инвестора: брокер ≠ аналитика, налоги, drift)
- [ ] Goals & objectives
- [ ] Stakeholders (retail investor, no KYC; мы — operators)
- [ ] In-scope / out-of-scope (**не брокер, не advice, не bank API**)
- [ ] Proposed solution + architecture landscape (уже есть черновики `ARCHITECTURE_*.md`)
- [ ] Epics + скелет user stories (из `ВозможныеФичи.md` + фактический продукт)
- [ ] NFR: perf (quote cache 30s), security (cookies, HMAC), availability (best-effort Yahoo)
- [ ] Regulatory: GDPR, MiFID-safe disclaimer, EU AI Act limited risk — из `GDPR_ITD.md` / legal PDFs
- [ ] Use case diagram (guest / authenticated)

На 10, если успеем (не блокер D0):

- [ ] Influence/Interest matrix, KPIs, assumptions, constraints, alternatives, MoSCoW, risks

Артефакт: отдельный BA PDF/MkDocs + слот комиссии. После сдачи тему уже нельзя радикально менять.

---

## Phase D2 — Артефакты критериев (weeks 4–9)

Код без картинки для эксперта = «не сделано».

### Backend (эксперт)

- [x] Схема слоёв + SOLID одним абзацем на принцип (SRP репозиториев, DIP через интерфейсы сервисов — без религии).
- [ ] **+ диплом** OpenAPI валиден (Spectral или Swagger Editor) + не разъезжается с роутами.
- [x] Coverage ≥70% (Jest threshold + CI HTML/lcov artifact, 2026-08-18).
- [ ] **+ продукт** Production URL — из D4.
- [x] **+ диплом** Drizzle на остальные не-HMAC таблицы (портфель с `owner_token` не трогаем).
- [ ] **+ диплом (текст, не код)** В главе Backend: `x-request-id` = tracing / correlation ID (middleware + ALS + pino **уже в коде**). Azure Log stream = centralized logs, не ELK — абзац now; **скрин стрима** только в D4, когда URL живой. OpenTelemetry не пишем.
- [x] **− skip** Микросервисы, Kafka, Redis, Grafana, ELK-кластер, Sonar, coverage 80% пустышками.

### Frontend (эксперт)

- [x] Architecture diagram + обоснование стека (React/Vite/RTK vs Next) — thesis `criteria/frontend.md`.
- [ ] **+ диплом** User flow демо-сценария (register → import → rebalance → AI → export/delete).
- [ ] **+ продукт** Playwright: 1–2 сценария (login → dashboard smoke). **Тот же smoke, что D3 Auto tests**, не второй набор e2e.
- [ ] **+ диплом** Скрины desktop / tablet / mobile до предзащиты.
- [ ] **+ диплом** Vite bundle visualizer; отчёт в appendix.
- [ ] **+ диплом** Lighthouse walkthrough (не «набрать 90 любой ценой»):
  - гонять **production build** (`vite preview` / staging), не `npm run dev` (HMR ломает Performance);
  - два URL: public landing + authenticated dashboard;
  - таблица scores + top opportunities; что починили / что accepted (чарты, polling);
  - Performance и Best Practices пройти по пунктам отчёта (cheap wins: unused JS, console errors, HTTPS на staging); localhost HTTP не считать провалом продакшена;
  - lab baseline 2026-08-19, `localhost:5173/dashboard` (dev): Performance 45 · Accessibility 96 · Best Practices 58 · SEO 82.
- [ ] **+ диплом** Accessibility check (не критерий Adaptive UI / WCAG-спека):
  - Lighthouse Accessibility ≥ 90 на landing и dashboard;
  - keyboard pass: sidebar, ticker search, theme/currency, primary CTA;
  - axe (DevTools/CLI) на 2–3 экранах; список remaining в appendix.
- [x] **− skip** Sentry / toast-библиотека / PWA.

### Database (эксперт)

- [x] ER + data dictionary + 3NF note + «integrity = constraints + transactions» со ссылкой на код.
- [x] Max в коде: миграции + индексы с обоснованием + HMAC `owner_token` (без FK portfolio → users).
- [ ] **+ диплом** Скрин `\du`; staging API = `app_write`, migrate = owner.
- [ ] **+ диплом** Appendix: `EXPLAIN` на lookup `owner_token` / `email`.
- [ ] **+ диплом** В главе: max = эти три направления; Azure PITR = Cloud; почему нет второй СУБД / триггеров / views.
- [x] **− skip** Timescale/ClickHouse, ODS/DWH, triggers, materialized views, шарды, Redis-as-DB.

### AI Assistant (эксперт)

- [x] `AI_INTEGRATION.md` = основной evidence (уже сильный).
- [x] User guide (EN, 1–2 страницы).
- [x] Что **не** умеет: не советник, не общий ChatGPT, не код.
- [x] Max в коде: guardrails (input/output) + quota + кэш briefing; не сырой прокси.
- [ ] **+ диплом** Скрин чата (quota + disclaimer) и news briefing.
- [ ] **+ диплом** Повтор `ai:lab-latency` на staging после D4 (lab 2026-08-19 не SLA).
- [ ] **+ диплом** В главе: max = guardrails + quota/cache; grounding ≠ RAG; `x-request-id` на AI-роутах.
- [ ] **+ продукт (не блокер)** Grounding после billing card.
- [x] **− skip** 2 модели, RAG/векторная БД, MCP ≥ 3, чат в Postgres, multimodal LLM, SSE streaming, Grafana по токенам.

Каждый выбранный критерий → файл `docs/02-technical/criteria/<name>.md` по `_template.md` (можно копить в `Docs/thesis/` до переезда в MkDocs).

---

## Phase D3 — Automated tests 70%+ (weeks 7–15)

Один coverage-отчёт закрывает **и** Backend min, **и** критерий Auto tests. Экспертам — разные главы. Qual/JMeter не мешаем сюда.

- [x] Unit FIRST: auth, rebalancing math, FX, parsers, tickerChatScope, quote cache.
- [x] HTTP integration без БД: health / 401 / 400 (`httpApi.test.ts`).
- [ ] **+ продукт** Один API + Postgres в CI (`services: postgres`) или staging smoke с cookie.
- [x] FE RTL (ErrorBanner, boundary, RequireAuth, AsyncStatePanel, Skeleton).
- [ ] **+ продукт** Playwright: login → dashboard (staging или локальный API). **Тот же smoke, что D2 Frontend.**
- [x] Coverage **≥ 70%** Istanbul/Jest, HTML/lcov в CI artifact.
- [ ] **+ диплом** Скрин зелёного Actions + % coverage в appendix.
- [ ] **+ диплом** Абзац «как тесты находили баги» + план не гнать 80% пустышками.
- [x] Глава: стратегия, как гонять локально, пробелы (Yahoo/Gemini мокаем в unit).
- [ ] **− skip** Mutation, Pact, k6, Cypress, FE coverage gate 70%, branches 70%.

Не гнать 70% «пустыми» тестами: рубрика штрафует тесты без логики (−2).

---

## Phase D4 — Cloud + CI/CD (поздно, до предзащиты)

Согласовано со `STARTUP_ROADMAP` Phase 4: не жечь ~€10/мес с августа. **Дедлайн курса:** live URL до предзащиты (week 19). Эксперта Cloud лучше звать, когда URL уже живой.

### Cloud min

- [ ] Публичный URL (FE + API).
- [ ] Managed PostgreSQL (EU region — то же, что пишем в Privacy).
- [ ] Секреты: Azure App Settings / Key Vault, не Git.
- [ ] Документ деплоя: шаги, ресурсы, firewall, как воспроизвести.
- [ ] Скрины портала (секреты замазаны). Сервис не падает после restart.
- [ ] Нет лишних VM «на всякий случай».
- [ ] **+ диплом (текст + скрин D4, не код)** Log stream / Log Analytics: pino JSON уже в stdout; в Portal снять Log stream. Не ставить ELK.
- [ ] **+ диплом (Backend max)** Один alert на 5xx / restart.

### CI/CD min

Пайплайн из D0 + **CD**:

- [x] Диаграмма: lint → test → build → artifact → deploy.
- [ ] Среды: `ci` (Actions) / `staging` (= prod для POC, честно написать).
- [x] Trigger: push + PR. CD можно **workflow_dispatch** (рубрика это разрешает). — CD ещё нет.
- [x] Артефакт: `dist` и/или image в ACR. — `frontend-dist`, `backend-dist`, coverage в Actions.
- [x] Секреты только в GitHub Secrets / OIDC в Azure.
- [x] `npm audit` job.
- [ ] **+ продукт (Backend max)** CD не деплоит, если lint/test/build красные.
- [ ] **− skip** Blue/green, canary, K8s, Sonar, Grafana в пайплайне — min = Actions + manual CD.

Husky остаётся локальным крючком. Для эксперта CI/CD = GitHub Actions, не Husky.

### На живом стенде закрываем и другие критерии

Не отдельная фаза: пока URL живой, снимаем то, чему нужен Azure, не localhost.

- [ ] **Database:** API `DATABASE_URL` = `app_write`; migrate = owner; скрин `\du`; по желанию `EXPLAIN` на `owner_token` / `email`.
- [ ] **AI:** `npm run ai:lab-latency` на staging (lab 2026-08-19 не SLA).
- [ ] **Frontend:** Lighthouse на HTTPS staging (landing + dashboard), не `npm run dev`.
- [ ] **Auto tests / Frontend:** Playwright против staging, если локальный API неудобен.
- [ ] **Backend max (не код):** скрин Log stream для pino + один alert 5xx (пункты Cloud min выше).

---

---

## Definition of Done

### Diploma-min (пятёрки по восьмёрке)

- BA сдан комиссии (D1).
- Backend/Frontend/Database/AI: пункты min в `DIPLOMA_TECHNICAL_REQUIREMENTS.md` **с артефактом** (не только код).
- Playwright smoke + один API+Postgres (или staging cookie-smoke).
- Jest coverage ≥70% + скрин зелёного Actions.
- Публичный Azure URL + managed DB (EU) + CD хотя бы `workflow_dispatch`.
- Staging: `\du` / `app_write`, AI p95, Lighthouse не с Vite HMR.
- Thesis EN содержит все 8 + known limitations (что skip и почему).

### Diploma-comfortable (запас 7–8, не 10)

- Backend: CD только с зелёного CI + скрин Log stream + один alert; в главе `x-request-id` назван tracing (код уже есть).
- Frontend: Lighthouse walkthrough + a11y check; Performance 90 на dashboard **не** обещаем.
- Database: migrations + indexes + HMAC в главе; без Timescale/триггеров.
- AI: guardrails + quota/cache в главе; grounding ≠ RAG; без MCP/второй модели.
- Tests: тонкая пирамида (unit + HTTP + RTL + 1 e2e + 1 DB); без mutation/k6.
- Containerization **не** заявлен, пока нет `compose up`.
- Adaptive UI **не** заявлен, но tablet не ломается на демо.

### Не смешивать с дипломом

Stripe, свой SMTP/домен, deposit-based rebalancing как killer-loop — `STARTUP_ROADMAP` Phase 5. i18n — блок «После восьмёрки» ниже, не D2.

---

## После восьмёрки (не блокер, в самый конец)

Защита идёт на **EN UI**. i18n не закрывает Frontend min/max и не лезет перед Playwright / Lighthouse / a11y.

- [ ] **+ продукт (позже)** i18n: оценить `react-i18next` vs ручные словари; EN + RU на ключевых экранах (landing, auth, dashboard, legal). Не тащить в D2–D5. Если не успеем до слотов — UI остаётся EN, в thesis одна строка «locale later».
- [ ] **Опционально 9-й критерий:** Containerization после скрина `docker compose up` (healthy api/web/postgres) + размеры образов. Не блокер восьмёрки.

---

## Как пользоваться двумя роадмапами


| Вопрос                                         | Документ                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Какой критерий берём / какие галочки в рубрике | `Docs/diploma/DIPLOMA_TECHNICAL_REQUIREMENTS.md`                            |
| Когда что делать для сдачи                     | этот файл (`Docs/diploma/DIPLOMA_ROADMAP.md`)                               |
| Фичи, GDPR deep, friend beta, деньги           | `Docs/STARTUP_ROADMAP.md`                                                   |
| Исходная рубрика эксперта                      | `Docs/diploma/course-diploma-projects-docs-main/04-technical-requirements/` |


После каждой фазы: проставить чекбоксы здесь и галочки в техническом чеклисте. Не отмечать `min` в трекере, пока нет артефакта, который можно положить эксперту на стол.

*Документ живой. Набор из 8 — решение на 2026-08-18; цель оценки 7–8 по ревью 2026-08-20. Containerization остаётся опцией, не обязательством.*