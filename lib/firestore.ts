import { auth } from './firebase';
import { Order, User, OrderCategory, Chat, ChatMessage, VerificationStatus } from '@/types';
import { deleteServerCommand, getServerQuery, postServerCommand } from './serverCommand';

interface ServerUserDto extends Omit<User, 'createdAt' | 'verificationSubmittedAt'> {
  createdAt: string;
  verificationSubmittedAt?: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<User | null> {
  if (auth.currentUser?.uid !== uid) throw new Error('Можно загрузить только собственный профиль');
  const data = await getServerQuery<ServerUserDto | null>('/api/profile');
  if (!data) return null;
  return {
    uid,
    email:           data.email          ?? '',
    displayName:     data.displayName    ?? '',
    role:            data.role           ?? null,
    hasSelectedRole: data.hasSelectedRole ?? true,
    createdAt:       new Date(data.createdAt),
    masterProfile:   data.masterProfile,
    telegramId:      data.telegramId as number | undefined,
    verificationStatus:         data.verificationStatus        as VerificationStatus | undefined,
    verificationSubmittedAt:    data.verificationSubmittedAt
      ? new Date(data.verificationSubmittedAt)
      : undefined,
    verificationRejectionReason: data.verificationRejectionReason as string | undefined,
    verificationExperience:     data.verificationExperience    as string | undefined,
    verificationSocialLinks:    data.verificationSocialLinks   as string[] | undefined,
    verificationPortfolioPhotos: data.verificationPortfolioPhotos as string[] | undefined,
  };
}

export async function setUser(uid: string, data: Partial<User>): Promise<void> {
  if (auth.currentUser?.uid !== uid) throw new Error('Можно изменить только собственный профиль');

  let action: 'initialize' | 'set_role' | 'update_master_profile' | 'link_telegram';
  let payload: Record<string, unknown>;
  if (data.masterProfile) {
    action = 'update_master_profile';
    payload = data.masterProfile as unknown as Record<string, unknown>;
  } else if (typeof data.telegramId === 'number') {
    action = 'link_telegram';
    payload = { telegramId: data.telegramId };
  } else if (data.role) {
    action = 'set_role';
    payload = { role: data.role };
  } else {
    action = 'initialize';
    payload = {};
  }

  await postServerCommand('/api/profile', {
    action,
    payload,
    commandId: crypto.randomUUID(),
  });
}

export async function submitVerification(
  uid: string,
  _displayName: string,
  data: { experience: string; socialLinks: string[]; portfolioPhotos: string[] },
): Promise<void> {
  if (auth.currentUser?.uid !== uid) throw new Error('Можно изменить только собственный профиль');
  await postServerCommand('/api/profile', {
    action: 'submit_verification',
    payload: data,
    commandId: crypto.randomUUID(),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  order: Omit<Order, 'id' | 'createdAt' | 'responses' | 'status' | 'customerId' | 'customerName'>
): Promise<string> {
  const result = await postServerCommand<{ orderId: string }>('/api/orders', {
    ...order,
    commandId: crypto.randomUUID(),
  });
  return result.orderId;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const data = await getServerQuery<ServerOrderDto>(`/api/orders/${encodeURIComponent(orderId)}`);
  return mapServerOrder(data);
}

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  if (auth.currentUser?.uid !== customerId) throw new Error('Можно загрузить только собственные заказы');
  const data = await getServerQuery<ServerOrderDto[]>('/api/orders?scope=mine');
  return data.map(mapServerOrder);
}

export async function getAvailableOrders(category?: OrderCategory): Promise<Order[]> {
  const data = await getServerQuery<ServerOrderDto[]>('/api/orders?scope=feed');
  const orders = data.map(mapServerOrder);
  return category ? orders.filter((order) => order.category === category) : orders;
}

export async function startWork(orderId: string): Promise<void> {
  await transitionOrder(orderId, 'start_work');
}

export async function markReady(orderId: string): Promise<void> {
  await transitionOrder(orderId, 'mark_ready');
}

export async function confirmDelivery(orderId: string): Promise<void> {
  await transitionOrder(orderId, 'confirm_delivery');
}

async function transitionOrder(
  orderId: string,
  action: 'start_work' | 'mark_ready' | 'confirm_delivery',
): Promise<void> {
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/transition`, {
    action,
    commandId: crypto.randomUUID(),
  });
}

export async function submitRating(
  orderId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/reviews`, {
    rating,
    comment,
    commandId: crypto.randomUUID(),
  });
}

export interface PublishedReviewSummaryDto {
  rating: number;
  ratingCount: number;
  reviews: Array<{
    id: string;
    orderId: string;
    authorAlias: string;
    authorRole: 'customer' | 'master';
    rating: number;
    comment?: string;
    publishedAt: string;
  }>;
}

export async function getPublishedReviews(subjectId: string): Promise<PublishedReviewSummaryDto> {
  return getServerQuery<PublishedReviewSummaryDto>(
    `/api/reviews?subjectId=${encodeURIComponent(subjectId)}`,
  );
}

export interface AgreementDto {
  orderId: string;
  version: number;
  status: 'pending' | 'confirmed';
  description: string;
  measurements: string;
  referencePhotos: string[];
  finalPrice: number;
  deadline: string;
  deliveryMethod: 'local' | 'delivery';
  deliveryIncluded: boolean;
  tolerances?: string;
  cancellationPolicyVersion: string;
  confirmations: { customer: boolean; master: boolean };
  proposedBy: string;
  updatedAt: string;
  confirmedAt?: string;
}

export async function getAgreement(orderId: string): Promise<AgreementDto | null> {
  return getServerQuery<AgreementDto | null>(
    `/api/orders/${encodeURIComponent(orderId)}/agreement`,
  );
}

export async function proposeAgreement(
  orderId: string,
  input: {
    finalPrice: number;
    deadline: string;
    deliveryMethod: 'local' | 'delivery';
    deliveryIncluded: boolean;
    tolerances?: string;
  },
): Promise<AgreementDto> {
  return postServerCommand<AgreementDto>(
    `/api/orders/${encodeURIComponent(orderId)}/agreement`,
    { action: 'propose', ...input, commandId: crypto.randomUUID() },
  );
}

export async function confirmAgreement(orderId: string): Promise<AgreementDto> {
  return postServerCommand<AgreementDto>(
    `/api/orders/${encodeURIComponent(orderId)}/agreement`,
    { action: 'confirm', commandId: crypto.randomUUID() },
  );
}

export interface MockPaymentResultDto {
  paymentId: string;
  orderId: string;
  status: 'funded';
  provider: 'mock';
  currency: 'RUB';
  grossAmountMinor: number;
  commissionAmountMinor: number;
  masterAmountMinor: number;
}

export async function simulateMockPayment(orderId: string): Promise<MockPaymentResultDto> {
  return postServerCommand<MockPaymentResultDto>(
    `/api/orders/${encodeURIComponent(orderId)}/payments/mock`,
    { commandId: crypto.randomUUID() },
  );
}

export interface MaterialAdvanceDto {
  orderId: string;
  status: 'requested' | 'authorized' | 'evidence_submitted';
  currency: 'RUB';
  requestedAmountMinor: number;
  maximumAmountMinor: number;
  requestedAt: string;
  authorizedAt?: string;
  evidence?: {
    spentAmountMinor: number;
    unusedAmountMinor: number;
    note: string;
    submittedAt: string;
  };
}

export async function getMaterialAdvance(orderId: string): Promise<MaterialAdvanceDto | null> {
  return getServerQuery<MaterialAdvanceDto | null>(
    `/api/orders/${encodeURIComponent(orderId)}/material-advance`,
  );
}

export async function requestMaterialAdvance(
  orderId: string,
  requestedAmountMinor: number,
): Promise<MaterialAdvanceDto> {
  return postServerCommand<MaterialAdvanceDto>(
    `/api/orders/${encodeURIComponent(orderId)}/material-advance`,
    { action: 'request', requestedAmountMinor, commandId: crypto.randomUUID() },
  );
}

export async function authorizeMaterialAdvance(orderId: string): Promise<MaterialAdvanceDto> {
  return postServerCommand<MaterialAdvanceDto>(
    `/api/orders/${encodeURIComponent(orderId)}/material-advance`,
    { action: 'authorize', commandId: crypto.randomUUID() },
  );
}

export async function submitMaterialExpenseEvidence(
  orderId: string,
  spentAmountMinor: number,
  note: string,
): Promise<MaterialAdvanceDto> {
  return postServerCommand<MaterialAdvanceDto>(
    `/api/orders/${encodeURIComponent(orderId)}/material-advance`,
    { action: 'submit_evidence', spentAmountMinor, note, commandId: crypto.randomUUID() },
  );
}

export async function cancelOrder(orderId: string): Promise<void> {
  await deleteServerCommand(`/api/orders/${encodeURIComponent(orderId)}`, {
    commandId: crypto.randomUUID(),
  });
}

export async function requestMasterReselection(orderId: string, reason: string): Promise<void> {
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/reselection-requests`, {
    reason,
    commandId: crypto.randomUUID(),
  });
}

export async function selectMaster(
  orderId: string,
  masterId: string,
): Promise<void> {
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/select-master`, {
    masterId,
    commandId: crypto.randomUUID(),
  });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendMessage(
  orderId: string,
  text: string,
): Promise<void> {
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/messages`, {
    text,
    commandId: crypto.randomUUID(),
  });
}

/**
 * Subscribe to chat messages in real time. Returns the unsubscribe function.
 */
export function subscribeToChatMessages(
  orderId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
  limitCount = 50,
): () => void {
  interface MessageWire extends Omit<ChatMessage, 'createdAt'> { createdAt: string }
  let stopped = false;
  let running = false;
  const execute = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const items = await getServerQuery<MessageWire[]>(
        `/api/orders/${encodeURIComponent(orderId)}/messages?limit=${limitCount}`,
      );
      callback(items.map((item) => ({ ...item, createdAt: new Date(item.createdAt) })));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Не удалось загрузить сообщения'));
    } finally {
      running = false;
    }
  };
  void execute();
  const interval = window.setInterval(() => void execute(), 5_000);
  return () => {
    stopped = true;
    window.clearInterval(interval);
  };
}

/**
 * Mark all messages from the other party as read and reset the reader's unread counter.
 */
export async function markMessagesAsRead(orderId: string, readerId: string): Promise<void> {
  void readerId;
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/messages`, {
    action: 'mark_read',
  });
}

/**
 * Get all chats for a user (as customer or master), sorted by lastMessageAt desc.
 */
export async function getChatList(uid: string): Promise<Chat[]> {
  if (auth.currentUser?.uid !== uid) throw new Error('Можно загрузить только собственные чаты');
  interface ChatWire extends Omit<Chat, 'lastMessageAt' | 'createdAt'> {
    lastMessageAt: string;
    createdAt: string;
  }
  const items = await getServerQuery<ChatWire[]>('/api/chats');
  return items.map((item) => ({
    ...item,
    lastMessageAt: new Date(item.lastMessageAt),
    createdAt: new Date(item.createdAt),
  }));
}

interface ServerOrderDto extends Omit<Order, 'createdAt' | 'responses' | 'ratings' | 'reconfirmationDeadline'> {
  createdAt: string;
  reconfirmationDeadline?: string;
  ratings?: Array<Omit<NonNullable<Order['ratings']>[number], 'createdAt'> & { createdAt: string }>;
}

function mapServerOrder(data: ServerOrderDto): Order {
  return {
    ...data,
    responses: {},
    createdAt: new Date(data.createdAt),
    reconfirmationDeadline: data.reconfirmationDeadline
      ? new Date(data.reconfirmationDeadline)
      : undefined,
    ratings: data.ratings?.map((rating) => ({
      ...rating,
      createdAt: new Date(rating.createdAt),
    })),
  };
}
