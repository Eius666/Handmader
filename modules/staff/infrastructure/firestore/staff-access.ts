import 'server-only';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import {
  parseStaffRole,
  requireStaffPermission,
  type StaffRole,
} from '../../domain/staff-role';

export interface StaffActor {
  uid: string;
  email?: string;
  role: StaffRole;
}

export async function requireStaffActor(
  authorizationHeader: string | null,
  allowed: readonly StaffRole[] = ['support', 'admin'],
): Promise<StaffActor> {
  const actor = await requireFirebaseActor(authorizationHeader);
  const snapshot = await adminDb.collection('staffMembers').doc(actor.uid).get();

  let role: StaffRole;
  if (snapshot.exists) {
    if (snapshot.data()?.active !== true) {
      throw new DomainError('FORBIDDEN', 'Учётная запись сотрудника отключена');
    }
    role = parseStaffRole(snapshot.data()?.role);
  } else if (bootstrapAdminIds().has(actor.uid)) {
    role = 'admin';
  } else {
    throw new DomainError('FORBIDDEN', 'Нет доступа к административной системе');
  }

  requireStaffPermission(role, allowed);
  return { uid: actor.uid, email: actor.email, role };
}

function bootstrapAdminIds(): Set<string> {
  return new Set(
    (process.env.HANDMADER_BOOTSTRAP_ADMIN_UIDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}
