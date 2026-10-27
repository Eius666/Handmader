import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function resolveAdminConfig() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return {
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
  }

  try {
    const serviceAccount = JSON.parse(raw) as {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    };
    return {
      credential: cert(serviceAccount),
      // The private server credential is authoritative. A stale public web
      // variable must never make Admin verify tokens against another project.
      projectId: serviceAccount.projectId,
    };
  } catch {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON содержит некорректный JSON');
  }
}

const adminApp = getApps()[0] ?? initializeApp(resolveAdminConfig());

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
