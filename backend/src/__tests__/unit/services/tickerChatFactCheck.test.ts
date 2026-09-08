import { AI_CHAT_FACT_CHECK_MARKER_EN, AI_CHAT_FACT_CHECK_MARKER_RU } from '../../../constants.js';
import { applyTickerChatFactCheck } from '../../../services/tickerChatFactCheck.js';
import type { TickerChatHoldingContext } from '../../../types/ai.types.js';

jest.mock('../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const holding: TickerChatHoldingContext = {
  shares: 5,
  avgBuyPrice: 100,
  currency: 'USD',
  unrealizedPnlPercent: 60,
};

describe('tickerChatFactCheck', () => {
  it('leaves a reply unchanged when numbers match the Krepton quote', () => {
    const result = applyTickerChatFactCheck({
      ticker: 'TTWO',
      userMessage: 'What is the price?',
      reply: 'TTWO is trading at $160.00 today. You hold 5 shares.',
      price: 160,
      currency: 'USD',
      changePercent: 1.5,
      holding,
    });

    expect(result.factCheck.corrected).toBe(false);
    expect(result.factCheck.quoteVerified).toBe(true);
    expect(result.factCheck.holdingVerified).toBe(true);
    expect(result.reply).not.toContain(AI_CHAT_FACT_CHECK_MARKER_EN);
  });

  it('appends a correction when the stated live price contradicts the quote', () => {
    const result = applyTickerChatFactCheck({
      ticker: 'AAPL',
      userMessage: 'What moved the price?',
      reply: 'AAPL is trading at $900 right now on a rumor spike.',
      price: 190,
      currency: 'USD',
      changePercent: -1.2,
      holding: null,
    });

    expect(result.factCheck.quoteVerified).toBe(false);
    expect(result.factCheck.corrected).toBe(true);
    expect(result.reply).toContain(AI_CHAT_FACT_CHECK_MARKER_EN);
    expect(result.reply).toContain('USD 190.00');
  });

  it('flags an invented position when Krepton has no holding', () => {
    const result = applyTickerChatFactCheck({
      ticker: 'TTWO',
      userMessage: 'How is my position?',
      reply: 'You hold 12 shares of TTWO from last year.',
      price: 160,
      currency: 'USD',
      changePercent: 1.5,
      holding: null,
    });

    expect(result.factCheck.holdingVerified).toBe(false);
    expect(result.factCheck.corrected).toBe(true);
    expect(result.reply).toContain('no open TTWO position');
  });

  it('uses a Russian appendix when the thread is in Russian', () => {
    const result = applyTickerChatFactCheck({
      ticker: 'TTWO',
      userMessage: 'какая сейчас цена?',
      reply: 'Сейчас цена составляет 900.',
      price: 160,
      currency: 'USD',
      changePercent: 1.5,
      holding,
    });

    expect(result.factCheck.corrected).toBe(true);
    expect(result.reply).toContain(AI_CHAT_FACT_CHECK_MARKER_RU);
    expect(result.reply).toContain('5 акций');
  });
});
