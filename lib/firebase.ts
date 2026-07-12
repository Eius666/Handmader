import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Env vars used in production; hardcoded fallback guarantees Firebase always
// has a valid config even when NEXT_PUBLIC_* are not yet set on Vercel.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY             ?? 'AIzaSyAYKocyVFd8tOsc0j2dVvvQb78GU2t2sVM',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? 'handmader-e25b6.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          ?? 'handmader-e25b6',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? 'handmader-e25b6.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '903804968908',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID              ?? '1:903804968908:web:2c4057d1e592a1ae3e8769',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
