export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 10 characters', test: (value) => value.length >= 10 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (value) => /[A-Z]/.test(value) },
  { id: 'number', label: 'One number (0–9)', test: (value) => /[0-9]/.test(value) },
  {
    id: 'symbol',
    label: 'One special character (!@#$…)',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export const PASSWORD_STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;
export const PASSWORD_STRENGTH_COLORS = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'] as const;

export function calculatePasswordStrength(password: string): number {
  if (!password) {
    return 0;
  }
  return PASSWORD_RULES.filter((rule) => rule.test(password)).length;
}

export function isPasswordStrong(password: string): boolean {
  return calculatePasswordStrength(password) === PASSWORD_RULES.length;
}
