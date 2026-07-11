export type UserRole = 'customer' | 'master' | 'both';

export type OrderStatus =
  | 'awaiting_responses'
  | 'master_selected'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'completed';

export type OrderCategory =
  | 'hat'
  | 'sweater'
  | 'scarf'
  | 'toy'
  | 'accessory'
  | 'other';

export interface MasterProfile {
  bio: string;
  categories: OrderCategory[];
  portfolioPhotos: string[];
  rating: number;
  completedOrders: number;
  location?: string;
  telegramId?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  masterProfile?: MasterProfile;
}

export interface OrderResponse {
  masterId: string;
  masterName: string;
  masterPhoto?: string;
  masterRating: number;
  price: number;
  timeline: string;
  comment: string;
  portfolioPhotos: string[];
  createdAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  description: string;
  category: OrderCategory;
  photos: string[];
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  status: OrderStatus;
  createdAt: Date;
  selectedMasterId?: string;
  selectedMasterName?: string;
  selectedPrice?: number;
  responses: Record<string, OrderResponse>;
  location?: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  masterId: string;
  rating: number;
  text: string;
  createdAt: Date;
}

export const CATEGORY_LABELS: Record<OrderCategory, string> = {
  hat: 'Шапка',
  sweater: 'Свитер',
  scarf: 'Шарф',
  toy: 'Игрушка',
  accessory: 'Аксессуар',
  other: 'Другое',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_responses: 'Ожидает откликов',
  master_selected: 'Мастер выбран',
  in_progress: 'В работе',
  ready: 'Готов',
  delivered: 'Доставлен',
  completed: 'Завершён',
};

export const STATUS_STEPS: OrderStatus[] = [
  'master_selected',
  'in_progress',
  'ready',
  'delivered',
  'completed',
];
