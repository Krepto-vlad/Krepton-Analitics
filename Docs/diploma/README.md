# Diploma docs

Две разные вещи:

| Путь | Роль | Финальный репозиторий |
|------|------|------------------------|
| **[thesis/](./thesis/)** | Официальная пояснительная записка (MkDocs → PDF). Структура курса: overview, technical, criteria × 8, user guide, retrospective, appendices | **Оставить** |
| `DIPLOMA_ROADMAP.md`, `DIPLOMA_TECHNICAL_REQUIREMENTS.md`, `DIPLOMA_OFFICIAL_RUBRIC.md`, `ADR-*.md`, `NPM_AUDIT_BACKEND.md` | План семестра, внутренний трекер, **чеклист всех 17 рубрик для ментора** (8 заявленных + 9 незаявленных) | Удалить при зачистке (кроме rubric — можно положить ментору отдельно) |
| `course-diploma-projects-docs-main/` | Рубрики института | Не коммитить (gitignore) |

Продуктовые файлы (`Docs/ARCHITECTURE_*.md`, `STARTUP_ROADMAP.md`, `AI_INTEGRATION.md`, …) — черновики. Нужный смысл уже перенесён в `thesis/` (EN). Перед сдачей репозитория их не класть в zip.

## Как дописать thesis

1. Править markdown в `thesis/docs/`.
2. Статусы критериев — в `thesis/docs/index.md` и в `thesis/docs/02-technical/criteria/*.md`.
3. Скриншоты — `thesis/docs/assets/screenshots/`.
4. Диаграммы-исходники — `thesis/docs/assets/diagrams/`.
5. OpenAPI не дублировать: ссылка на `backend/openapi.yaml`.

Сборка PDF — по гайду курса (MkDocs в `thesis/mkdocs.yml`).
