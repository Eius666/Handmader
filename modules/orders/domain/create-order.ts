import { DomainError } from '../../shared/domain/domain-error.ts';

const CATEGORIES = ['hat', 'sweater', 'scarf', 'toy', 'accessory', 'other'] as const;

export interface CreateOrderInput {
  title: unknown;
  description: unknown;
  category: unknown;
  photos: unknown;
  budgetMin: unknown;
  budgetMax: unknown;
  deadline: unknown;
  measurements?: unknown;
  location?: unknown;
  deliveryOption?: unknown;
}

export interface NewOrderData {
  title: string;
  description: string;
  category: typeof CATEGORIES[number];
  photos: string[];
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  measurements?: string;
  location?: string;
  deliveryOption: 'local' | 'delivery' | 'both';
}

export function decideOrderCreation(
  actor: { id: string; role: unknown },
  input: CreateOrderInput,
): NewOrderData {
  if (actor.role !== 'customer' && actor.role !== 'both') {
    throw new DomainError('FORBIDDEN', 'Публиковать заказы может заказчик');
  }

  const title = requiredText(input.title, 'Добавьте название заказа', 120);
  const description = requiredText(input.description, 'Добавьте описание заказа', 5_000);
  const deadline = requiredText(input.deadline, 'Укажите желаемый срок', 100);
  const category = typeof input.category === 'string' && CATEGORIES.includes(input.category as typeof CATEGORIES[number])
    ? input.category as typeof CATEGORIES[number]
    : null;
  if (!category) throw new DomainError('VALIDATION_ERROR', 'Выберите категорию изделия');

  const budgetMin = money(input.budgetMin);
  const budgetMax = money(input.budgetMax);
  if (budgetMin < 1 || budgetMax < budgetMin) {
    throw new DomainError('VALIDATION_ERROR', 'Проверьте диапазон бюджета');
  }

  const photos = Array.isArray(input.photos)
    ? input.photos.filter((item): item is string => typeof item === 'string').slice(0, 5)
    : [];
  if (photos.some((photo) => photo.length > 750_000)) {
    throw new DomainError('VALIDATION_ERROR', 'Одна из фотографий слишком большая');
  }

  const measurements = requiredText(
    input.measurements,
    'Укажите мерки или размеры готового изделия',
    5_000,
  );
  const location = optionalText(input.location, 120);
  const deliveryOption = input.deliveryOption === 'local'
    || input.deliveryOption === 'delivery'
    || input.deliveryOption === 'both'
    ? input.deliveryOption
    : null;
  if (!location) throw new DomainError('VALIDATION_ERROR', 'Укажите город');
  if (!deliveryOption) throw new DomainError('VALIDATION_ERROR', 'Выберите допустимый способ получения');
  return {
    description,
    title,
    category,
    photos,
    budgetMin,
    budgetMax,
    deadline,
    location,
    deliveryOption,
    measurements,
  };
}

function requiredText(value: unknown, message: string, maxLength: number): string {
  const normalized = optionalText(value, maxLength);
  if (!normalized) throw new DomainError('VALIDATION_ERROR', message);
  return normalized;
}

function optionalText(value: unknown, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new DomainError('VALIDATION_ERROR', 'Некорректное текстовое поле');
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new DomainError('VALIDATION_ERROR', 'Текстовое поле слишком длинное');
  return normalized;
}

function money(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new DomainError('VALIDATION_ERROR', 'Сумма должна быть целым числом');
  }
  return value;
}
