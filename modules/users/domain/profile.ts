import { DomainError } from '../../shared/domain/domain-error.ts';

export const USER_ROLES = ['customer', 'master', 'both'] as const;
export const ORDER_CATEGORIES = ['hat', 'sweater', 'scarf', 'toy', 'accessory', 'other'] as const;

export type UserRoleValue = typeof USER_ROLES[number];
export type OrderCategoryValue = typeof ORDER_CATEGORIES[number];

export interface EditableMasterProfile {
  bio: string;
  categories: OrderCategoryValue[];
  location: string;
}

export function parseUserRole(value: unknown): UserRoleValue {
  if (typeof value !== 'string' || !USER_ROLES.includes(value as UserRoleValue)) {
    throw new DomainError('VALIDATION_ERROR', 'Некорректная роль пользователя');
  }
  return value as UserRoleValue;
}

export function parseMasterProfile(value: unknown): EditableMasterProfile {
  if (!value || typeof value !== 'object') {
    throw new DomainError('VALIDATION_ERROR', 'Некорректный профиль мастера');
  }
  const input = value as Record<string, unknown>;
  const bio = typeof input.bio === 'string' ? input.bio.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  const rawCategories = Array.isArray(input.categories) ? input.categories : [];
  const categories = [...new Set(rawCategories)]
    .filter((item): item is OrderCategoryValue => (
      typeof item === 'string' && ORDER_CATEGORIES.includes(item as OrderCategoryValue)
    ));

  if (bio.length > 1_000) {
    throw new DomainError('VALIDATION_ERROR', 'Описание мастера не должно превышать 1000 символов');
  }
  if (location.length > 120) {
    throw new DomainError('VALIDATION_ERROR', 'Название города слишком длинное');
  }
  if (categories.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'Выберите хотя бы одну категорию');
  }

  return { bio, location, categories };
}

export function parseVerificationApplication(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new DomainError('VALIDATION_ERROR', 'Некорректная заявка на верификацию');
  }
  const input = value as Record<string, unknown>;
  const experience = typeof input.experience === 'string' ? input.experience.trim() : '';
  const socialLinks = stringList(input.socialLinks, 5, 500);
  const portfolioPhotos = stringList(input.portfolioPhotos, 5, 2_000);

  if (experience.length < 50 || experience.length > 5_000) {
    throw new DomainError('VALIDATION_ERROR', 'Опишите опыт: от 50 до 5000 символов');
  }
  return { experience, socialLinks, portfolioPhotos };
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}
