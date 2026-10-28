import { DomainError } from '../../shared/domain/domain-error.ts';

export type StaffRole = 'support' | 'admin';

export function parseStaffRole(value: unknown): StaffRole {
  if (value === 'support' || value === 'admin') return value;
  throw new DomainError('FORBIDDEN', 'Нет доступа к административной системе');
}

export function requireStaffPermission(
  role: StaffRole,
  allowed: readonly StaffRole[],
): void {
  if (!allowed.includes(role)) {
    throw new DomainError('FORBIDDEN', 'Недостаточно прав для этого действия');
  }
}
