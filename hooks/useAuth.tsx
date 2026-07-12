'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebase';
import { getUser, setUser } from '@/lib/firestore';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUser(firebaseUser.uid);
          if (profile) {
            setCurrentUser(profile);
          } else {
            // Firestore doc absent — create a basic user object from Auth
            const basic: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? '',
              role: 'customer',
              createdAt: new Date(),
            };
            setCurrentUser(basic);
            // Persist to Firestore in background (don't block loading)
            setUser(firebaseUser.uid, basic).catch(console.error);
          }
        } catch (err) {
          console.error('[Auth] Failed to load Firestore profile:', err);
          // Still let the user in with basic Auth data
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? '',
            role: 'customer',
            createdAt: new Date(),
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(fbUser, { displayName });
    await setUser(fbUser.uid, {
      email,
      displayName,
      role: 'customer',
      createdAt: new Date(),
    });
  }

  async function setRole(role: UserRole) {
    if (!auth.currentUser) return;
    await setUser(auth.currentUser.uid, { role });
    setCurrentUser((prev) => (prev ? { ...prev, role } : prev));
  }

  async function logout() {
    await signOut(auth);
  }

  async function refreshUser() {
    if (!auth.currentUser) return;
    const profile = await getUser(auth.currentUser.uid);
    if (profile) setCurrentUser(profile);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, setRole, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use': return 'Этот email уже зарегистрирован';
      case 'auth/invalid-email': return 'Неверный формат email';
      case 'auth/weak-password': return 'Пароль должен содержать минимум 6 символов';
      case 'auth/user-not-found': return 'Пользователь не найден';
      case 'auth/wrong-password': return 'Неверный пароль';
      case 'auth/invalid-credential': return 'Неверный email или пароль';
      default: return 'Произошла ошибка. Попробуйте снова';
    }
  }
  return 'Произошла ошибка. Попробуйте снова';
}
