import {
  applyTickerChatOutputGuardrails,
  correctFocusTickerTypos,
  evaluateTickerChatInputScope,
  sanitizeTickerChatReply,
  stripTickerChatOutboundLinks,
} from '../../../services/tickerChatScope.js';

describe('tickerChatScope', () => {
  it('steers coding requests instead of hard-blocking market intent', () => {
    const decision = evaluateTickerChatInputScope(
      'TTWO',
      'дай код на питоне чтобы посчитать return по ttwo'
    );

    expect(decision.kind).toBe('allow');
    if (decision.kind === 'allow') {
      expect(decision.userMessage).toContain('Do not write code');
      expect(decision.userMessage).toContain('TTWO');
    }
  });

  it('soft-redirects pure general-assistant abuse', () => {
    const decision = evaluateTickerChatInputScope('TTWO', 'напиши стихотворение про космос');

    expect(decision.kind).toBe('soft_redirect');
    if (decision.kind === 'soft_redirect') {
      expect(decision.reply).toContain('TTWO');
      expect(decision.reply.toLowerCase()).not.toContain('космос');
    }
  });

  it('allows normal ticker questions unchanged', () => {
    const decision = evaluateTickerChatInputScope('TTWO', 'какие риски у компании сейчас?');

    expect(decision).toEqual({
      kind: 'allow',
      userMessage: 'какие риски у компании сейчас?',
    });
  });

  it('corrects near-miss spellings of the focus ticker', () => {
    expect(correctFocusTickerTypos('TTWO', 'what is ttwwo return?')).toBe('what is TTWO return?');
    expect(correctFocusTickerTypos('AAPL', 'aaple earnings?')).toBe('AAPL earnings?');
    expect(correctFocusTickerTypos('TTWO', 'compare with AAPL')).toBe('compare with AAPL');
  });

  it('rewrites a mistyped ticker in an allowed question', () => {
    const decision = evaluateTickerChatInputScope('TTWO', 'какие риски у ttwwo сейчас?');

    expect(decision).toEqual({
      kind: 'allow',
      userMessage: 'какие риски у TTWO сейчас?',
    });
  });

  it('blocks programming code fences in model replies', () => {
    const result = applyTickerChatOutputGuardrails(
      'TTWO',
      'python return',
      'Sure:\n```python\nprint(1)\n```\nDone'
    );

    expect(result.blockedReason).toBe('code');
    expect(result.reply).toContain('TTWO');
    expect(result.reply).not.toContain('```python');
  });

  it('blocks personalized buy/sell instructions before display', () => {
    const result = applyTickerChatOutputGuardrails(
      'TTWO',
      'стоит ли купить?',
      'Да, рекомендую купить TTWO в понедельник на открытии.'
    );

    expect(result.blockedReason).toBe('personalized_advice');
    expect(result.reply).toContain('TTWO');
    expect(result.reply.toLowerCase()).not.toContain('рекомендую купить');
  });

  it('blocks guaranteed-outcome claims before display', () => {
    const result = applyTickerChatOutputGuardrails(
      'TTWO',
      'will it rise?',
      'This is a guaranteed return trade — TTWO will definitely rise next week.'
    );

    expect(result.blockedReason).toBe('guaranteed_outcome');
    expect(result.reply).toMatch(/buy\/sell|recommendation/i);
  });

  it('allows analytical replies that discuss risks without instructing a trade', () => {
    const analyticalReply =
      'TTWO jumped after GTA VI news. Upside depends on launch execution; key risks are delay and multiple compression. Not financial advice.';

    const result = applyTickerChatOutputGuardrails('TTWO', 'что думаешь?', analyticalReply);

    expect(result.blockedReason).toBe('none');
    expect(result.reply).toBe(analyticalReply);
    expect(sanitizeTickerChatReply('TTWO', 'что думаешь?', analyticalReply)).toBe(analyticalReply);
  });

  it('strips outbound URLs and keeps markdown link labels', () => {
    expect(
      stripTickerChatOutboundLinks(
        'See [Take-Two](https://evil.example/phish) and https://evil.example/raw for context.'
      )
    ).toBe('See Take-Two and for context.');
  });
});
