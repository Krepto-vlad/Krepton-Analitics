import { calculatePasswordStrength, isPasswordStrong, PASSWORD_RULES } from '../passwordValidation';

describe('passwordValidation', () => {
  it('scores an empty password as zero', () => {
    expect(calculatePasswordStrength('')).toBe(0);
    expect(isPasswordStrong('')).toBe(false);
  });

  it('requires all four rules for a strong password', () => {
    expect(calculatePasswordStrength('short')).toBeLessThan(PASSWORD_RULES.length);
    expect(isPasswordStrong('Abcdefgh1!')).toBe(true);
  });
});
