import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyAYKocyVFd8tOsc0j2dVvvQb78GU2t2sVM',
  authDomain:        'handmader-e25b6.firebaseapp.com',
  projectId:         'handmader-e25b6',
  storageBucket:     'handmader-e25b6.firebasestorage.app',
  messagingSenderId: '903804968908',
  appId:             '1:903804968908:web:2c4057d1e592a1ae3e8769',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
