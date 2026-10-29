import assert from 'node:assert/strict';
import test from 'node:test';
import { decideDisputeOpening, decideDisputeResolution, decideEvidenceAddition } from './dispute.ts';

const order = { id: 'o1', customerId: 'c1', selectedMasterId: 'm1', status: 'delivered', paymentStatus: 'funded' };

test('order participant opens a dispute after funded payment', () => {
  assert.deepEqual(decideDisputeOpening(order, 'c1', 'Изделие не соответствует согласованным меркам'), { reason: 'Изделие не соответствует согласованным меркам' });
});
test('unrelated user and unpaid order cannot open a dispute', () => {
  assert.throws(() => decideDisputeOpening(order, 'x1', 'Достаточно подробное описание проблемы'), /участникам/);
  assert.throws(() => decideDisputeOpening({ ...order, paymentStatus: undefined }, 'c1', 'Достаточно подробное описание проблемы'), /после/);
});
test('both participants can add immutable evidence while dispute is open', () => {
  const dispute = { id: 'd1', orderId: 'o1', customerId: 'c1', masterId: 'm1', status: 'open' as const };
  assert.deepEqual(decideEvidenceAddition(dispute, 'm1', 'Фотографии готового изделия', 'https://example.test/evidence'), { description: 'Фотографии готового изделия', sourceUrl: 'https://example.test/evidence' });
  assert.throws(() => decideEvidenceAddition({ ...dispute, status: 'resolved' }, 'c1', 'Описание', ''), /закрыт/);
});
test('admin calculation must distribute the whole test payment', () => {
  assert.deepEqual(decideDisputeResolution({ disputeStatus: 'open', resolution: 'partial_refund', decisionSummary: 'Учтены подтверждённые расходы и несоответствие мерок', grossAmountMinor: 1_000_000, customerRefundAmountMinor: 400_000, masterPayoutAmountMinor: 500_000, platformFeeAmountMinor: 100_000 }), { resolution: 'partial_refund', decisionSummary: 'Учтены подтверждённые расходы и несоответствие мерок', customerRefundAmountMinor: 400_000, masterPayoutAmountMinor: 500_000, platformFeeAmountMinor: 100_000 });
  assert.throws(() => decideDisputeResolution({ disputeStatus: 'open', resolution: 'partial_refund', decisionSummary: 'Достаточное обоснование', grossAmountMinor: 1_000_000, customerRefundAmountMinor: 400_000, masterPayoutAmountMinor: 500_000, platformFeeAmountMinor: 50_000 }), /всю тестовую сумму/);
});
