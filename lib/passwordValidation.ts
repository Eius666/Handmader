export interface PasswordCheck {
  key:   string;
  label: string;
  test:  (p: string) => boolean;
}

export const PASSWORD_CHECKS: PasswordCheck[] = [
  { key: 'length',    label: 'Минимум 8 символов',   test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'Заглавная буква (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'Строчная буква (a-z)',  test: (p) => /[a-z]/.test(p) },
  { key: 'digit',     label: 'Цифра (0-9)',           test: (p) => /[0-9]/.test(p) },
];

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = PASSWORD_CHECKS
    .filter((c) => !c.test(password))
    .map((c) => c.label);
  return { valid: errors.length === 0, errors };
}
