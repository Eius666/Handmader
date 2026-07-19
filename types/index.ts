export type UserRole = 'customer' | 'master' | 'both';

export type NotificationType =
  | 'new_order'
  | 'new_response'
  | 'master_selected'
  | 'work_started'
  | 'order_ready'
  | 'order_completed'
  | 'new_message'
  | 'verification_approved'
  | 'verification_rejected';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string;
  chatId?: string;
  read: boolean;
  createdAt: Date;
}

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

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
  ratingCount?: number;
  completedOrders: number;
  location?: string;
  telegramId?: string;
}

export interface OrderRating {
  rating: number;
  comment?: string;
  createdAt: Date;
  userId?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole | null;
  createdAt: Date;
  hasSelectedRole: boolean;
  masterProfile?: MasterProfile;
  telegramId?: number;
  verificationStatus?: VerificationStatus;
  verificationSubmittedAt?: Date;
  verificationRejectionReason?: string;
  verificationExperience?: string;
  verificationSocialLinks?: string[];
  verificationPortfolioPhotos?: string[];
}

export interface OrderResponse {
  masterId: string;
  masterName: string;
  masterPhoto?: string;
  masterRating: number;
  masterCompletedOrders?: number;
  masterVerified?: boolean;
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
  ratings?: OrderRating[];
  measurements?: string;
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

export interface Chat {
  orderId: string;
  customerId: string;
  masterId: string;
  customerName?: string;
  masterName?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCustomer: number;
  unreadMaster: number;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Date;
  read: boolean;
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
