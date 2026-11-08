import { DomainError } from '../../shared/domain/domain-error.ts';
import { CLOSED_BETA_COMMISSION_BPS } from './mock-payment.ts';

export interface PriceAdjustmentOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  paymentStatus?: string;
}

export interface PriceAdjustmentPaymentSnapshot {
  status: string;
  testMode: boolean;
  currency: string;
  grossAmountMinor: number;
}

export interface PriceAdjustmentAmendmentSnapshot {
  status: string;
  finalPrice: number;
  confirmations: { customer: boolean; master: boolean };
}

export function decideTestPriceAdjustment(
  order: PriceAdjustmentOrderSnapshot,
  payment: PriceAdjustmentPaymentSnapshot,
  amendment: PriceAdjustmentAmendmentSnapshot,
  actorId: string,
  releasedMaterialAdvanceMinor = 0,
) {
  if (actorId !== order.customerId) {
    throw new DomainError('FORBIDDEN', 'Тестовую доплату или возврат подтверждает заказчик');
  }
  if (!order.selectedMasterId || order.paymentStatus !== 'funded' || !['paid', 'in_progress'].includes(order.status)) {
    throw new DomainError('INVALID_STATE', 'Изменение цены доступно после оплаты и до готовности изделия');
  }
  if (!payment.testMode || payment.status !== 'funded' || payment.currency !== 'RUB') {
    throw new DomainError('INVALID_STATE', 'Доступна только корректировка тестового платежа');
  }
  if (amendment.status !== 'financial_pending' || !amendment.confirmations.customer || !amendment.confirmations.master) {
    throw new DomainError('INVALID_STATE', 'Новую цену сначала должны подтвердить обе стороны');
  }
  if (!Number.isSafeInteger(amendment.finalPrice) || amendment.finalPrice < 100) {
    throw new DomainError('INVALID_STATE', 'В изменении нет корректной цены');
  }
  const targetGrossAmountMinor = amendment.finalPrice * 100;
  if (!Number.isSafeInteger(targetGrossAmountMinor) || targetGrossAmountMinor === payment.grossAmountMinor) {
    throw new DomainError('INVALID_STATE', 'Финансовая корректировка не требуется');
  }
  const commissionAmountMinor = Math.round((targetGrossAmountMinor * CLOSED_BETA_COMMISSION_BPS) / 10_000);
  const masterAmountMinor = targetGrossAmountMinor - commissionAmountMinor;
  if (!Number.isSafeInteger(releasedMaterialAdvanceMinor) || releasedMaterialAdvanceMinor < 0) {
    throw new DomainError('INVALID_STATE', 'Некорректная сумма аванса');
  }
  if (masterAmountMinor < releasedMaterialAdvanceMinor) {
    throw new DomainError('INVALID_STATE', 'Новая сумма мастера меньше уже подтверждённого аванса на материалы');
  }
  const type = targetGrossAmountMinor > payment.grossAmountMinor ? 'top_up' : 'refund';
  return {
    orderId: order.id,
    customerId: order.customerId,
    masterId: order.selectedMasterId,
    currency: 'RUB' as const,
    type: type as 'top_up' | 'refund',
    amountMinor: Math.abs(targetGrossAmountMinor - payment.grossAmountMinor),
    previousGrossAmountMinor: payment.grossAmountMinor,
    targetGrossAmountMinor,
    commissionBps: CLOSED_BETA_COMMISSION_BPS,
    commissionAmountMinor,
    masterAmountMinor,
  };
}
