# Krepton Analytics — Diploma Roadmap

> Цель: закрыть **техчасть и артефакты** так, чтобы на защите был запас критериев, а не ровно семь «впритык».  
> Принцип: код, который остаётся в продукте, делаем сейчас; BA и пояснительную записку (EN) — когда тему апрувнут. Чеклисты min/max — в `Docs/diploma/DIPLOMA_TECHNICAL_REQUIREMENTS.md`.

Связанный док по продукту: `Docs/STARTUP_ROADMAP.md`. Этот файл — про **сдачу**, тот — про **запуск**. Где работа совпадает (тесты, Azure, GDPR), делаем один раз.

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
Шаблон главы на критерий (EN): `…/thesis-template/docs/02-technical/criteria/_template.md`.

---

## Что не берём (и почему)

Не тратить семестр на критерии, которые либо фейк под наше приложение, либо отдельный проект.


| Критерий                                | Почему нет                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Real-time Analytics                     | Котировки — polling ~30 с. Рубрика не считает delay > 10 с. Настоящий WS Yahoo упрётся в лимиты free API.    |
| ML Model                                | Gemini — чужой LLM, не своё обучение.                                                                        |
| Cryptography                            | bcrypt/JWT/HMAC сами по себе не критерий. Отдельная криптозадача не нужна продукту.                          |
| Microservices                           | Монолит FE+BE+Postgres. «Три папки» не считаются.                                                            |
| API Documentation *как критерий*        | OpenAPI всё равно сделаем **для Backend min**. Отдельный developer portal — лишний объём.                    |
| Qualitative / quantitative testing      | Ручные тест-планы + JMeter. Для стартапа важнее автотесты в CI.                                              |
| Refined UX / Adaptive UI *как критерий* | Код уже responsive + theme. Критерий требует Figma/UX-спеку на 3 форм-фактора. **Запас**, не основной набор. |


---

## Containerization — не в восьмёрке, файлы всё равно пишем

Локально Docker поставить нельзя — **критерий не защищаем**, пока образы не доказаны в CI/Azure.

Это не дыра в наборе: infrastructure уже закрывают Cloud + CI/CD.

Зачем тогда Dockerfile + Compose:

- CD в Azure (Container Apps / App Service) проще с образом, чем «rsync dist»;
- эксперт Cloud любит «весь стек воспроизводится»;
- если позже появится машина с Docker — критерий можно **добавить девятым** без переделки архитектуры.

Как сдавать без локального Docker:

1. `Dockerfile` на frontend и backend + `docker-compose.yml` + `.dockerignore` лежат в Git.
2. GitHub Actions job `docker build` (и при желании `compose config`) — доказательство, что файлы валидны.
3. Azure поднимает те же образы. Локально ты по-прежнему `npm run dev`.
4. В записке честно: *local inner loop = Node; containers are the deploy/CI contract*.

Не обещать эксперту Containerization, пока `compose up` никто не прогнал (друг, учебная VM, или Actions с Docker).

---

## Пункты рубрики, которые «не про продукт»

Их нельзя выкинуть: без них не будет `min` по Backend/Database/Frontend. Делаем **тонко**, с ADR «зачем для сдачи».


| Пункт                                           | Критерий                  | Почему не ложится на Krepton                                                                         | Как закрываем для сдачи                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ORM**                                         | Backend min               | Сейчас raw `pg` + HMAC `owner_token`. Полный Prisma спрячет SQL, который мы специально контролируем. | Тонкий **Drizzle** (SQL-first): типизированные таблицы, миграции остаются `node-pg-migrate` или постепенно переезжают. HMAC-запросы остаются явным SQL в одном репозитории. ADR: why Drizzle, not Prisma/TypeORM. |
| **Structured logs**                             | Backend min               | Продукту хватает `console.log`. Эксперт хочет JSON.                                                  | `pino` (JSON в stdout). В Azure — Log stream. Correlation id = `x-request-id`. Не ELK, пока не нужен max.                                                                                                         |
| **OpenAPI**                                     | Backend min               | Пользователю Swagger не нужен.                                                                       | `openapi.yaml` в Git + Swagger UI за флагом/`/api/docs` только non-prod или за basic. Текст в записке. Отдельный критерий API Docs **не берём**.                                                                  |
| **DB roles** `app_read` / `app_write` / `admin` | Database min              | Один сервис, один пользователь БД. Три роли не меняют UX.                                            | Роли в миграции; приложение коннектится как `app_write`; superuser только для migrate. Скрин `\du`. На продукт не влияет.                                                                                         |
| **CHECK constraints**                           | Database min              | Часть инвариантов сейчас в сервисах.                                                                 | `shares > 0`, `currency` length 3, и т.п. — это **и** качество продукта.                                                                                                                                          |
| **Data dictionary + ER**                        | Database min              | Не фича.                                                                                             | Markdown + mermaid ER в `Docs/` и в thesis appendix.                                                                                                                                                              |
| **Seed / demo data**                            | Database min              | Живые юзеры сами импортят брокер.                                                                    | `npm run seed:demo` на отдельном email, не в проде. Для защиты и CI.                                                                                                                                              |
| **3NF write-up**                                | Database min              | Схема уже нормализована.                                                                             | Короткая таблица «таблица → нормальная форма → почему не денормализовали quotes».                                                                                                                                 |
| **Error Boundary**                              | Frontend min              | Interceptor уже есть.                                                                                | Один React Error Boundary в `App`. Полезно и в проде.                                                                                                                                                             |
| **≥3 component tests + 1 e2e**                  | Frontend min + Auto tests | RTL min закрыт (ErrorBanner, Error Boundary, RequireAuth). Playwright ещё нет.                       | Playwright: login → dashboard smoke (против staging).                                                                                                                |
| **User flows / FE architecture diagram**        | Frontend min              | Код есть, картинки нет.                                                                              | Mermaid: routes, Redux slices, auth cookie flow.                                                                                                                                                                  |
| **≥10 example dialogs + user guide**            | AI min                    | Фича живая, артефакта нет.                                                                           | `Docs/AI_DIALOG_EXAMPLES.md` (happy + jailbreak + «купи AAPL») + короткая user guide в thesis.                                                                                                                    |
| **Latency / 10 concurrent**                     | AI min                    | Нет замера.                                                                                          | Один скрипт k6/autocannon на ticker-chat staging + таблица p50/p95 в записке. Не max-нагрузка.                                                                                                                    |
| **npm audit в пайплайне**                       | Backend + CI/CD           | Не фича.                                                                                             | Job `npm audit --audit-level=high`; high/critical — чиним или ADR «accepted». Нужно и стартапу.                                                                                                                   |
| **Public URL 24/7**                             | Cloud + Backend           | До предзащиты можно не жечь деньги.                                                                  | Staging поднимаем **до слота эксперта Cloud / предзащиты**. До этого — CI на GitHub.                                                                                                                              |
| **IaC / второй managed service**                | Cloud max                 | Не обязателен для пятёрки.                                                                           | Min: App Service/Container Apps + **Azure Database for PostgreSQL** (managed). Max потом: Key Vault как второй managed + Bicep, если останется время.                                                             |


Правило: в пояснительной записке **не писать** «сделали, потому что надо 7 галочек». Писать продуктовую причину или честный constraint (анонимность БД, лимиты Yahoo, стоимость Azure).

---

## Фазы (обзор)

Семестр ещё не начался. Недели — **от апрува темы**, как в курсовом timeline (weeks 1–22). До этого идёт Phase D0.


| Фаза   | Фокус                                                             | Когда                                        | Для диплома              | Для стартапа     |
| ------ | ----------------------------------------------------------------- | -------------------------------------------- | ------------------------ | ---------------- |
| **D0** | Рубрика в коде: ORM, логи, тесты, CI, OpenAPI-скелет, Dockerfiles | Сейчас, до семестра                          | ✅ закрывает дыры min     | ✅ качество       |
| **D1** | BA-пакет + скелет thesis (EN)                                     | Сразу после апрува темы (weeks 1–3)          | ✅ комиссия BA            | 🟡 product story |
| **D2** | Артефакты BE/FE/DB/AI (диаграммы, dictionary, dialogs)            | Weeks 4–9, параллельно фичам                 | ✅ эксперты               | 🟡 docs          |
| **D3** | Coverage ≥70%, integration, RTL, Playwright smoke                 | Weeks 7–15, не в конце                       | ✅ Backend + Auto tests   | ✅ регрессия      |
| **D4** | Azure + CD + секреты                                              | Поздно и дёшево, **до** предзащиты (week 19) | ✅ Cloud + Backend deploy | ✅ friend URL     |
| **D5** | Thesis EN, видео, слоты экспертов                                 | Weeks 16–22                                  | ✅ допуск                 | —                |


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

- [ ] 10+ диалогов: нормальные вопросы + «ignore previous instructions» + «напиши код» + «купи AAPL».
- [ ] Замер latency на staging, когда он появится; до этого — локальный p95 на 20 запросах (честно пометить как lab, не prod SLA).

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
- [ ] OpenAPI валиден (Spectral или Swagger Editor).
- [x] Coverage ≥70% (Jest threshold + CI HTML/lcov artifact, 2026-08-18).
- [ ] Production URL — из D4.

### Frontend (эксперт)

- [ ] Architecture diagram, user flows (register → import → rebalance → AI → export/delete).
- [ ] Обоснование стека (React/Vite/RTK vs Next — честно: SPA + cookie auth к своему API).
- [ ] Playwright или RTL e2e-эквивалент 1–2 сценария.

### Database (эксперт)

- [x] ER + data dictionary + 3NF note + «integrity = constraints + transactions» со ссылкой на код.
- [ ] Скрин ролей. Индексы: зачем `owner_token`, `portfolio_id`, `email` — текст готов; `\du` на стенде.

### AI Assistant (эксперт)

- [ ] `AI_INTEGRATION.md` = основной evidence (уже сильный).
- [ ] User guide (EN, 1–2 страницы).
- [ ] Что **не** умеет: не советник, не общий ChatGPT, не код.
- [ ] Скрин чата + quota + disclaimer.

Каждый выбранный критерий → файл `docs/02-technical/criteria/<name>.md` по `_template.md` (можно копить в `Docs/thesis/` до переезда в MkDocs).

---

## Phase D3 — Automated tests 70%+ (weeks 7–15)

Один coverage-отчёт закрывает **и** Backend min, **и** критерий Auto tests. Экспертам — разные главы.

- [x] Unit FIRST: auth, rebalancing math, FX, parsers, tickerChatScope, quote cache (уже частично есть).
- [ ] Integration: API + auth cookie + хотя бы один сценарий с тестовой БД.
- [ ] FE: component tests + один e2e happy path.
- [x] Coverage **≥ 70%** Istanbul/Jest, число + HTML/lcov в CI artifact / скрин в appendix.
- [x] Глава: стратегия, как гонять локально, пробелы (Yahoo не мокаем в e2e — мокаем в unit).
- [ ] Все тесты **зелёные в GitHub Actions** (без этого Auto tests min не закрыт). — workflow есть; первый зелёный прогон после push.

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

### CI/CD min

Пайплайн из D0 + **CD**:

- [x] Диаграмма: lint → test → build → artifact → deploy.
- [ ] Среды: `ci` (Actions) / `staging` (= prod для POC, честно написать).
- [x] Trigger: push + PR. CD можно **workflow_dispatch** (рубрика это разрешает). — CD ещё нет.
- [x] Артефакт: `dist` и/или image в ACR. — `frontend-dist`, `backend-dist`, coverage в Actions.
- [x] Секреты только в GitHub Secrets / OIDC в Azure.
- [x] `npm audit` job.

Husky остаётся локальным крючком. Для эксперта CI/CD = GitHub Actions, не Husky.

---

## Phase D5 — Сдача (weeks 16–22)

- [ ] Пояснительная записка **EN**: чего нет в тексте, того нет для рецензента.
- [ ] Глава на каждый из 8 критериев + known limitations.
- [ ] Demo video до предзащиты.
- [ ] Сценарий демо: register → verify → import/add → dashboard → rebalancing → AI → export → delete.
- [ ] Слоты экспертов: материалы за **неделю**. Приоритет: BA (уже сдан) → Backend/Frontend → Database → AI → Cloud/CI/CD (когда URL живой) → Tests.
- [ ] Репозиторий: без `.env`, с `.env.example`, история коммитов читаемая.

---

## Definition of Done

### Diploma-min (пятёрки по восьмёрке)

- BA сдан комиссии.
- Backend/Frontend/Database/AI: код + диаграммы + пункты min в `Docs/diploma/DIPLOMA_TECHNICAL_REQUIREMENTS.md`.
- Jest coverage ≥70% + зелёный Actions.
- Публичный Azure URL + managed DB + пайплайн с CD (хотя бы manual).
- Thesis EN содержит все 8.

### Diploma-comfortable (запас)

- Восьмёрка уверенно на 5, часть на 7–8 (AI, Database HMAC, CI).
- Dockerfiles собираются в Actions (критерий Containerization всё ещё не заявлен).
- Adaptive UI **не** заявлен, но tablet не ломается на демо.

### Не смешивать с дипломом

Stripe, свой SMTP/домен, deposit-based rebalancing как killer-loop — `STARTUP_ROADMAP` Phase 5.

---

## Как пользоваться двумя роадмапами


| Вопрос                                         | Документ                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Какой критерий берём / какие галочки в рубрике | `Docs/diploma/DIPLOMA_TECHNICAL_REQUIREMENTS.md`                            |
| Когда что делать для сдачи                     | этот файл (`Docs/diploma/DIPLOMA_ROADMAP.md`)                               |
| Фичи, GDPR deep, friend beta, деньги           | `Docs/STARTUP_ROADMAP.md`                                                   |
| Исходная рубрика эксперта                      | `Docs/diploma/course-diploma-projects-docs-main/04-technical-requirements/` |


После каждой фазы: проставить чекбоксы здесь и галочки в техническом чеклисте. Не отмечать `min` в трекере, пока нет артефакта, который можно положить эксперту на стол.

*Документ живой. Набор из 8 — решение на 2026-08-18; Containerization остаётся опцией, не обязательством.*