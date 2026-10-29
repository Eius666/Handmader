import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import {
  authorizeMaterialAdvanceInFirestore,
  getMaterialAdvanceFromFirestore,
  requestMaterialAdvanceInFirestore,
  submitMaterialExpenseEvidenceInFirestore,
} from '@/modules/material-advances/infrastructure/firestore/material-advances';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const result = await getMaterialAdvanceFromFirestore(orderId, actor.uid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }
    const command = { orderId, actorId: actor.uid, commandId: body.commandId };
    const result = body.action === 'request'
      ? await requestMaterialAdvanceInFirestore({ ...command, requestedAmountMinor: body.requestedAmountMinor })
      : body.action === 'authorize'
        ? await authorizeMaterialAdvanceInFirestore(command)
        : body.action === 'submit_evidence'
          ? await submitMaterialExpenseEvidenceInFirestore({
            ...command,
            spentAmountMinor: body.spentAmountMinor,
            note: body.note,
          })
          : (() => { throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие с авансом'); })();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
