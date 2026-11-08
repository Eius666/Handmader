import assert from 'node:assert/strict';
import test from 'node:test';
import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideAmendmentConfirmation, decideAmendmentProposal } from './amendment.ts';

const order = { id: 'o1', customerId: 'c1', selectedMasterId: 'm1', status: 'in_progress', paymentStatus: 'funded' };
const agreement = { status: 'confirmed', version: 2, description: 'Свитер', measurements: 'Рост 170 см', deadline: '2026-12-20', tolerances: '±2 см', finalPrice: 9_000 };

test('participant proposes a non-financial amendment after payment', () => {
  const result = decideAmendmentProposal(order, agreement, 'c1', { description: 'Свитер с высоким воротом', measurements: 'Рост 170 см', deadline: '2026-12-25', tolerances: '±2 см', reason: 'Добавили высокий ворот' });
  assert.equal(result.targetAgreementVersion, 3);
  assert.equal(result.finalPrice, 9_000);
  assert.equal(result.masterId, 'm1');
});

test('both participants confirm the same amendment independently', () => {
  const first = decideAmendmentConfirmation(order, 'm1', { customer: false, master: false });
  assert.equal(first.fullyConfirmed, false);
  const second = decideAmendmentConfirmation(order, 'c1', first.confirmations);
  assert.equal(second.fullyConfirmed, true);
});

test('amendment requires a funded order that is not ready yet', () => {
  assert.throws(() => decideAmendmentProposal({ ...order, status: 'ready' }, agreement, 'c1', { description: 'Новое описание', measurements: 'Рост 170 см', deadline: '2026-12-25', reason: 'Согласованное изменение' }), (error) => error instanceof DomainError && error.code === 'INVALID_STATE');
});

test('unchanged terms and unrelated users are rejected', () => {
  assert.throws(() => decideAmendmentProposal(order, agreement, 'c1', { ...agreement, reason: 'Ничего не меняем' }), /хотя бы одно/);
  assert.throws(() => decideAmendmentConfirmation(order, 'other', { customer: false, master: false }), (error) => error instanceof DomainError && error.code === 'FORBIDDEN');
});
