import { createSlice } from '@reduxjs/toolkit';
import type {
  PortfolioState,
  PortfolioPosition,
  EquityDataPoint,
} from '../../types/portfolio.types';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_POSITIONS: PortfolioPosition[] = [
  {
    id: '1',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    shares: 120,
    avgBuyPrice: 182.56,
    entryDate: '2024-01-12',
    currentPrice: 213.4,
    currency: 'USD',
  },
  {
    id: '2',
    ticker: 'MSFT',
    companyName: 'Microsoft Corp.',
    shares: 55,
    avgBuyPrice: 488.08,
    entryDate: '2024-01-28',
    currentPrice: 447.98,
    currency: 'USD',
  },
  {
    id: '3',
    ticker: 'SBER',
    companyName: 'Sberbank PJSC',
    shares: 400,
    avgBuyPrice: 3.32,
    entryDate: '2024-01-25',
    currentPrice: 3.15,
    currency: 'USD',
  },
  {
    id: '4',
    ticker: 'NVDA',
    companyName: 'Nvidia Corp.',
    shares: 30,
    avgBuyPrice: 614.08,
    entryDate: '2024-01-29',
    currentPrice: 875.48,
    currency: 'USD',
  },
  {
    id: '5',
    ticker: 'AMZN',
    companyName: 'Amazon.com Inc.',
    shares: 86,
    avgBuyPrice: 178.7,
    entryDate: '2024-01-13',
    currentPrice: 194.28,
    currency: 'USD',
  },
  {
    id: '6',
    ticker: 'GAZP',
    companyName: 'Gazprom PAO',
    shares: 600,
    avgBuyPrice: 1.63,
    entryDate: '2024-01-19',
    currentPrice: 1.48,
    currency: 'USD',
  },
  {
    id: '7',
    ticker: 'GOOGL',
    companyName: 'Alphabet Inc.',
    shares: 50,
    avgBuyPrice: 148.3,
    entryDate: '2024-01-01',
    currentPrice: 168.78,
    currency: 'USD',
  },
];

// Deterministic LCG pseudo-random: same sequence every render, no Math.random()
function lcgRandom(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 4294967295;
}

function generateEquityHistory(): EquityDataPoint[] {
  const result: EquityDataPoint[] = [];
  const startDate = new Date('2024-01-02');
  const endDate = new Date('2026-06-30');
  const totalMs = endDate.getTime() - startDate.getTime();

  let value = 820000;
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const progress = (cursor.getTime() - startDate.getTime()) / totalMs;
      const target = 820000 + 170000 * Math.pow(progress, 0.7);

      const rand = lcgRandom(result.length);
      const drift = (target - value) * 0.035;
      const noise = (rand - 0.5) * 16000;

      value = Math.max(value + drift + noise, 750000);

      result.push({
        time: cursor.toISOString().slice(0, 10),
        value: Math.round(value),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: PortfolioState = {
  positions: MOCK_POSITIONS,
  stats: {
    totalValue: 990100,
    totalPnl: 127430,
    unrealizedPnl: 89218,
    realizedPnl: 38212,
    dayPnl: -2440,
    totalPnlPercent: 19.1,
    dayPnlPercent: -0.25,
  },
  sectorAllocations: [
    { sector: 'Information Technology', percentage: 70, color: '#ef4444' },
    { sector: 'Financials', percentage: 14, color: '#f59e0b' },
    { sector: 'Healthcare', percentage: 8, color: '#10b981' },
    { sector: 'Industrials', percentage: 4, color: '#3b82f6' },
    { sector: 'Energy', percentage: 4, color: '#8b5cf6' },
  ],
  watchlist: [
    {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      price: 213.4,
      changePercent: 2.15,
      alertType: 'BUY',
    },
    {
      ticker: 'SBER',
      companyName: 'Sberbank PJSC',
      price: 3.15,
      changePercent: -0.32,
      alertType: 'SELL',
    },
    {
      ticker: 'MSFT',
      companyName: 'Microsoft Corp.',
      price: 447.98,
      changePercent: -0.09,
      alertType: null,
    },
    {
      ticker: 'NVDA',
      companyName: 'Nvidia Corp.',
      price: 875.48,
      changePercent: 1.9,
      alertType: 'BUY',
    },
    {
      ticker: 'GAZP',
      companyName: 'Gazprom PAO',
      price: 1.48,
      changePercent: -8.72,
      alertType: 'SELL',
    },
    {
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      price: 168.78,
      changePercent: 3.47,
      alertType: null,
    },
  ],
  news: [
    {
      id: '1',
      tickers: ['AAPL'],
      source: 'Bloomberg',
      timeAgo: '24 min ago',
      headline:
        'Apple exceeds Q2 earnings expectations with record services revenue of $73.8B, beating analyst forecasts by 4.7%',
    },
    {
      id: '2',
      tickers: ['SBER'],
      source: 'BBC',
      timeAgo: '38 min ago',
      headline:
        'Sberbank reports decline in net profit amid geopolitical headwinds; shares react to revised guidance',
    },
    {
      id: '3',
      tickers: ['MSFT'],
      source: 'Reuters',
      timeAgo: '1 hr ago',
      headline:
        'Microsoft Azure cloud growth accelerates to 33% YoY — CIO Satya Nadella cites AI adoption as primary driver',
    },
    {
      id: '4',
      tickers: ['NVDA'],
      source: 'The Verge',
      timeAgo: '2 hr ago',
      headline:
        'NVIDIA announces next-gen Blackwell Ultra GPU architecture; H100 supply chain constraints ease heading into H2',
    },
    {
      id: '5',
      tickers: ['GOOGL'],
      source: 'FT',
      timeAgo: '3 hr ago',
      headline:
        'Alphabet antitrust ruling could reshape global advertising market — GOOGL sees modest pre-market reaction',
    },
    {
      id: '6',
      tickers: ['GAZP'],
      source: 'Reuters',
      timeAgo: '4 hr ago',
      headline:
        'Gazprom LNG export volumes fall for third consecutive quarter; European demand substitute accelerates',
    },
  ],
  equityHistory: generateEquityHistory(),
  isLoading: false,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {},
});

export const portfolioReducer = portfolioSlice.reducer;
