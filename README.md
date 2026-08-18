# InvestHub — Investment Assistant POC

Proof of Concept для аналитической платформы инвесторов. Демонстрирует получение реальных биржевых данных и отрисовку профессиональных candlestick-графиков.

## Tech Stack

| Слой | Технология |
|---|---|
| Frontend | React 18, Vite, TypeScript, SCSS Modules |
| State | Redux Toolkit |
| Charts | TradingView `lightweight-charts` (MIT) |
| Backend | Node.js, Express, TypeScript |
| Data | Yahoo Finance API (бесплатно, без ключа) |
| Runtime | `tsx` (ESM-совместимый запуск TS) |

## Архитектура проекта

```
POC/
├── backend/
│   ├── src/
│   │   ├── constants.ts          # Все константы
│   │   ├── index.ts              # Express entry point
│   │   ├── routes/
│   │   │   └── stockRoutes.ts    # GET /api/stocks/...
│   │   ├── services/
│   │   │   └── stockService.ts   # Логика работы с Yahoo Finance API
│   │   └── types/
│   │       └── stock.types.ts    # Интерфейсы
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── stockApi.ts       # HTTP-клиент к бэкенду
    │   ├── components/
    │   │   ├── StockChart/       # TradingView candlestick chart
    │   │   ├── StockSearch/      # Поиск с автодополнением
    │   │   ├── QuoteCard/        # Карточка текущей цены
    │   │   └── PeriodSelector/   # Переключатель периода (1W/1M/...)
    │   ├── hooks/
    │   │   ├── useAppDispatch.ts
    │   │   └── useAppSelector.ts
    │   ├── pages/
    │   │   └── Dashboard/        # Главная страница
    │   ├── store/
    │   │   ├── index.ts          # Redux store
    │   │   └── stockSlice.ts     # Async thunks + state
    │   ├── types/
    │   │   └── stock.types.ts
    │   └── constants.ts
    └── package.json
```

## Запуск

### Требования
- Node.js 18+
- npm 9+

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
# Сервер: http://localhost:3001
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Приложение: http://localhost:5173
```

## API Endpoints

| Метод | URL | Описание |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/docs/openapi.yaml` | OpenAPI 3 spec (Backend min) |
| GET | `/api/stocks/quote/:ticker` | Текущая цена акции |
| GET | `/api/stocks/history/:ticker?period=1y&interval=1d` | OHLCV история для графика |
| GET | `/api/stocks/search?q=Apple` | Поиск тикеров |

### Доступные периоды: `7d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`
### Доступные интервалы: `1d`, `1wk`, `1mo`

## Реализованный POC функционал

- [x] Поиск акций по названию/тикеру (Yahoo Finance Search API)
- [x] Получение текущей цены + изменение за день
- [x] Candlestick график (TradingView lightweight-charts)
- [x] Переключение периода графика (1W / 1M / 3M / 6M / 1Y / 2Y / 5Y)
- [x] Responsive layout + dark theme

## Планируемые модули (полный диплом)

1. **Парсер брокерских отчётов** — загрузка Excel/CSV от Т-Банк, Сбер
2. **Калькулятор ребалансировки** — показывает, что докупить для соблюдения стратегии
3. **Дивидендный календарь** — прогноз пассивного дохода на 12 месяцев
4. **Скринер акций** — сравнение мультипликаторов P/E, P/S, ROE двух компаний

## Бесплатные ресурсы для деплоя

| Сервис | Назначение | Лимит |
|---|---|---|
| [Vercel](https://vercel.com) | Frontend | Бесплатно |
| [Render.com](https://render.com) | Backend | 750 ч/мес бесплатно |
| [Neon.tech](https://neon.tech) | PostgreSQL | 0.5 GB бесплатно |
| Yahoo Finance | Stock Data | Без лимитов (неофициально) |
