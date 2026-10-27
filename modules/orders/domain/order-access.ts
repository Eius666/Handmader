export type DeliveryOption = 'local' | 'delivery' | 'both';

export interface OrderAccessSnapshot {
  customerId: string;
  selectedMasterId?: string;
  status: string;
  category: string;
  location?: string;
  deliveryOption?: DeliveryOption;
}

export interface OrderActorSnapshot {
  id: string;
  role: unknown;
  categories: string[];
  city?: string;
  verified: boolean;
}

export function canMasterDiscoverOrder(
  order: OrderAccessSnapshot,
  actor: OrderActorSnapshot,
): boolean {
  if (order.status !== 'awaiting_responses') return false;
  if (actor.role !== 'master' && actor.role !== 'both') return false;
  if (order.customerId === actor.id) return false;
  if (!actor.categories.includes(order.category)) return false;

  const orderCity = normalizeCity(order.location);
  const masterCity = normalizeCity(actor.city);
  if (!orderCity || !masterCity) return false;
  if (orderCity === masterCity) return true;

  const deliveryOption = order.deliveryOption ?? 'local';
  return actor.verified && (deliveryOption === 'delivery' || deliveryOption === 'both');
}

export function canActorReadOrder(
  order: OrderAccessSnapshot,
  actor: OrderActorSnapshot,
  hasOwnProposal = false,
): boolean {
  if (order.customerId === actor.id) return true;
  if (order.selectedMasterId === actor.id) return true;
  if (hasOwnProposal && order.status === 'awaiting_responses') return true;
  return canMasterDiscoverOrder(order, actor);
}

function normalizeCity(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('ru-RU') ?? '';
}
