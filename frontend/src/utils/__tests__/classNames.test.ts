import { joinClassNames } from '../classNames';

describe('joinClassNames', () => {
  it('drops empty conditional class names', () => {
    expect(joinClassNames('btn', false, null, undefined, 'active')).toBe('btn active');
  });
});
