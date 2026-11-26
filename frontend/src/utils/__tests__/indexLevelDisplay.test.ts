import { formatIndexLevel, formatSignedIndexChange } from '../indexLevelDisplay';

describe('indexLevelDisplay', () => {
  it('formats levels without a currency symbol', () => {
    expect(formatIndexLevel(7182.78)).toBe('7,182.78');
  });

  it('formats a signed points move with percent', () => {
    expect(formatSignedIndexChange(-18.12, -0.25)).toBe('-18.12 (-0.25%)');
    expect(formatSignedIndexChange(12.5, 0.33)).toBe('+12.50 (+0.33%)');
  });
});
