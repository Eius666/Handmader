import type { NotificationType } from '../../../types/index.ts';

export interface RoutableNotification {
  type: NotificationType;
  orderId?: string;
  chatId?: string;
}

export function notificationRoute(notification: RoutableNotification): string | null {
  switch (notification.type) {
    case 'new_message':
      return notification.chatId || notification.orderId
        ? `/chat/${encodeURIComponent(notification.chatId ?? notification.orderId!)}`
        : null;
    case 'new_order':
    case 'new_response':
    case 'order_reopened':
    case 'master_reselection_closed':
    case 'proposal_reconfirmation_required':
    case 'proposal_reconfirmed':
      return notification.orderId
        ? `/orders/${encodeURIComponent(notification.orderId)}`
        : null;
    case 'agreement_pending':
    case 'agreement_confirmed':
      return notification.orderId
        ? `/orders/${encodeURIComponent(notification.orderId)}/agreement`
        : null;
    case 'material_advance_requested':
    case 'material_advance_authorized':
    case 'material_expense_evidence_submitted':
      return notification.orderId
        ? `/orders/${encodeURIComponent(notification.orderId)}/materials`
        : null;
    case 'master_selected':
    case 'payment_confirmed':
    case 'work_started':
    case 'order_ready':
    case 'order_completed':
      return notification.orderId
        ? `/track/${encodeURIComponent(notification.orderId)}`
        : null;
    case 'verification_approved':
    case 'verification_rejected':
      return '/profile';
    default:
      return null;
  }
}
