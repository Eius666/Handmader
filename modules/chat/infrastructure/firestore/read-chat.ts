import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { requireChatParticipant } from '../../domain/chat-access';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';

export interface ChatDto {
  orderId: string;
  customerId: string;
  masterId: string;
  customerName?: string;
  masterName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCustomer: number;
  unreadMaster: number;
  createdAt: string;
}

export interface ChatMessageDto {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export async function listChatsForActorFromFirestore(actorId: string): Promise<ChatDto[]> {
  const chats = adminDb.collection('chats');
  const [customerSnapshot, masterSnapshot] = await Promise.all([
    chats.where('customerId', '==', actorId).get(),
    chats.where('masterId', '==', actorId).get(),
  ]);
  const unique = new Map<string, ChatDto>();
  for (const item of [...customerSnapshot.docs, ...masterSnapshot.docs]) {
    unique.set(item.id, chatDto(item.id, item.data()));
  }
  return [...unique.values()].sort((left, right) =>
    right.lastMessageAt.localeCompare(left.lastMessageAt));
}

export async function listMessagesForActorFromFirestore(
  orderId: string,
  actorId: string,
  limitCount = 50,
): Promise<ChatMessageDto[]> {
  const chatRef = adminDb.collection('chats').doc(orderId);
  const chatSnapshot = await chatRef.get();
  if (!chatSnapshot.exists) throw new DomainError('NOT_FOUND', 'Чат не найден');
  const chat = chatSnapshot.data() ?? {};
  requireChatParticipant({
    customerId: String(chat.customerId ?? ''),
    masterId: String(chat.masterId ?? ''),
  }, actorId);

  const snapshot = await chatRef.collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(Math.min(Math.max(limitCount, 1), 100))
    .get();
  return snapshot.docs.map((item) => messageDto(item.id, item.data())).reverse();
}

export async function markMessagesReadForActorInFirestore(
  orderId: string,
  actorId: string,
): Promise<void> {
  const chatRef = adminDb.collection('chats').doc(orderId);
  const chatSnapshot = await chatRef.get();
  if (!chatSnapshot.exists) throw new DomainError('NOT_FOUND', 'Чат не найден');
  const chat = chatSnapshot.data() ?? {};
  const role = requireChatParticipant({
    customerId: String(chat.customerId ?? ''),
    masterId: String(chat.masterId ?? ''),
  }, actorId);
  const unreadSnapshot = await chatRef.collection('messages').where('read', '==', false).get();
  const writer = adminDb.bulkWriter();
  for (const item of unreadSnapshot.docs) {
    if (item.data().senderId !== actorId) writer.update(item.ref, { read: true });
  }
  writer.update(chatRef, { [role === 'customer' ? 'unreadCustomer' : 'unreadMaster']: 0 });
  await writer.close();
}

function chatDto(id: string, data: Record<string, unknown>): ChatDto {
  return {
    orderId: id,
    customerId: String(data.customerId ?? ''),
    masterId: String(data.masterId ?? ''),
    ...(typeof data.customerName === 'string' ? { customerName: data.customerName } : {}),
    ...(typeof data.masterName === 'string' ? { masterName: data.masterName } : {}),
    lastMessage: String(data.lastMessage ?? ''),
    lastMessageAt: timestampIso(data.lastMessageAt),
    unreadCustomer: finiteNumber(data.unreadCustomer),
    unreadMaster: finiteNumber(data.unreadMaster),
    createdAt: timestampIso(data.createdAt),
  };
}

function messageDto(id: string, data: Record<string, unknown>): ChatMessageDto {
  return {
    id,
    senderId: String(data.senderId ?? ''),
    senderName: String(data.senderName ?? ''),
    text: String(data.text ?? ''),
    createdAt: timestampIso(data.createdAt),
    read: data.read === true,
  };
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
