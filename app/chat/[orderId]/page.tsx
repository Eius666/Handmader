'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTelegram } from '@/hooks/useTelegram';
import {
  getOrder,
  sendMessage,
  subscribeToChatMessages,
  markMessagesAsRead,
} from '@/lib/firestore';
import { ChatMessage, Order } from '@/types';

function formatMsgTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (date.toDateString() === yesterday.toDateString()) return `вчера, ${time}`;
  return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + ', ' + time;
}

export default function ChatPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { webApp } = useTelegram();
  const router = useRouter();

  const [order, setOrder]     = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef        = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const atBottomRef      = useRef(true);
  const initialDoneRef   = useRef(false);

  // Telegram back button
  useEffect(() => {
    if (!webApp) return;
    webApp.BackButton.show();
    const handler = () => router.back();
    webApp.BackButton.onClick(handler);
    return () => {
      webApp.BackButton.offClick(handler);
      webApp.BackButton.hide();
    };
  }, [webApp, router]);

  // Load order metadata
  useEffect(() => {
    if (!orderId) return;
    getOrder(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  // Real-time messages subscription
  useEffect(() => {
    if (!orderId || !user) return;
    const unsub = subscribeToChatMessages(orderId, (msgs) => {
      setMessages(msgs);
      markMessagesAsRead(orderId, user.uid).catch(console.error);
    });
    return unsub;
  }, [orderId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;
    if (!initialDoneRef.current) {
      container.scrollTop = container.scrollHeight;
      initialDoneRef.current = true;
      return;
    }
    if (atBottomRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  function handleScroll() {
    const c = scrollRef.current;
    if (!c) return;
    atBottomRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend() {
    if (!text.trim() || !order || !user || sending) return;
    const trimmed = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    atBottomRef.current = true;
    setSending(true);
    try {
      await sendMessage(
        orderId,
        user.uid,
        user.displayName,
        trimmed,
        order.customerId,
        order.selectedMasterId ?? '',
        order.customerName,
        order.selectedMasterName ?? '',
      );
    } catch (err) {
      console.error('[Chat] sendMessage error:', err);
    } finally {
      setSending(false);
    }
  }

  const isCustomer = user?.uid === order?.customerId;
  const otherName  = isCustomer
    ? (order?.selectedMasterName ?? 'Мастер')
    : (order?.customerName ?? 'Клиент');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <span className="size-9 animate-spin rounded-full border-2 border-secondary border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── Header ── */}
      <header
        className="shrink-0 flex items-center gap-3 px-4 pb-3 pt-5"
        style={{ borderBottom: '1px solid rgba(180,100,70,0.08)' }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95"
          style={{ background: 'rgba(217,108,82,0.08)' }}
        >
          <ArrowLeft className="size-4 text-primary" aria-hidden="true" />
        </button>

        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #d96c52, #f2a47e)' }}
          aria-hidden="true"
        >
          {otherName[0]?.toUpperCase() ?? '?'}
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-bold leading-tight text-foreground">
            {otherName}
          </span>
          {order?.description && (
            <span className="truncate text-[11px] text-muted-foreground">
              {order.description.slice(0, 42)}{order.description.length > 42 ? '…' : ''}
            </span>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-8 py-28 text-center">
            <span className="text-5xl">💬</span>
            <p className="text-[14px] font-semibold text-muted-foreground">
              Начните обсуждение заказа
            </p>
            <p className="text-[12px] text-muted-foreground">
              Уточните детали, материалы, сроки
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 px-4 py-4">
            {messages.map((msg, idx) => {
              const isMe   = msg.senderId === user?.uid;
              const prev   = messages[idx - 1];
              const showName = !isMe && (!prev || prev.senderId !== msg.senderId);
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <span className="mb-0.5 px-1 text-[11px] font-semibold text-muted-foreground">
                      {msg.senderName}
                    </span>
                  )}
                  <div
                    className="max-w-[80%] px-4 py-2.5"
                    style={{
                      background:            isMe ? '#C2703E' : '#f3f4f6',
                      color:                 isMe ? '#ffffff' : '#1c1917',
                      borderRadius:          18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius:  isMe ? 18 : 4,
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">
                      {msg.text}
                    </p>
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-gray-400">
                    {formatMsgTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Input form ── */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2.5"
          style={{
            background: '#ffffff',
            border: '1.5px solid rgba(180,100,70,0.15)',
            boxShadow: '0 2px 8px rgba(140,80,50,0.06)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[14px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
            style={{ maxHeight: 96, paddingTop: 3, paddingBottom: 3 }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!text.trim() || sending}
            aria-label="Отправить"
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{ background: '#C2703E', boxShadow: '0 2px 8px rgba(194,112,62,0.35)' }}
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
