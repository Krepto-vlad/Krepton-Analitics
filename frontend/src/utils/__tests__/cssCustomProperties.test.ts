import { toCssCustomProperties } from '../cssCustomProperties';

describe('toCssCustomProperties', () => {
  it('passes CSS variables through as a style object', () => {
    expect(toCssCustomProperties({ '--chat-width': '320px', '--rows': 2 })).toEqual({
      '--chat-width': '320px',
      '--rows': 2,
    });
  });
});
