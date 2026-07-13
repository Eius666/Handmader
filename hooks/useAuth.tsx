'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebase';
import { getUser, setUser as firestoreSetUser } from '@/lib/firestore';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user:    User | null;
  profile: User | null;  // alias — same reference as user, for code that prefers this name
  loading: boolean;
  login:         (email: string, password: string, displayName?: string) => Promise<void>;
  register:      (email: string, password: string, displayName: string) => Promise<void>;
  logout:        () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  // backward-compat aliases used by settings/profile/select-role pages
  setRole:     (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading]  = useState(true);

  // When register() is running it owns the auth-state write; skip the
  // onAuthStateChanged handler so we don't race against it.
  const registering = useRef(false);

  useEffect(() => {
    // Safety valve: force-unblock after 8 s if Firebase never calls back.
    const timer = setTimeout(() => {
      console.error('[Auth] onAuthStateChanged timeout — forcing loading:false');
      setLoading(false);
    }, 8000);

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (registering.current) return;   // register() handles state itself

      clearTimeout(timer);

      if (fbUser) {
        // Bug fix #2: set loading:true here so page.tsx shows a spinner while
        // we fetch the Firestore profile instead of briefly seeing user:null.
        setLoading(true);
        try {
          const profile = await getUser(fbUser.uid);
          if (profile) {
            setCurrentUser(profile);
          } else {
            // No Firestore doc yet — create minimal defaults so onboarding shows.
            const basic: User = {
              uid:             fbUser.uid,
              email:           fbUser.email        ?? '',
              displayName:     fbUser.displayName  ?? '',
              role:            null,
              hasSelectedRole: false,
              createdAt:       new Date(),
            };
            setCurrentUser(basic);
            firestoreSetUser(fbUser.uid, basic).catch(console.error);
          }
        } catch (err) {
          console.error('[Auth] profile load error:', err);
          setCurrentUser({
            uid:             fbUser.uid,
            email:           fbUser.email        ?? '',
            displayName:     fbUser.displayName  ?? '',
            role:            null,
            hasSelectedRole: false,
            createdAt:       new Date(),
          });
        }
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  // ── login ───────────────────────────────────────────────────────────────────
  async function login(email: string, password: string) {
    // Bug fix #2: set loading:true BEFORE the network call so that by the time
    // router.replace('/') runs in the login page, page.tsx sees loading:true
    // and shows a spinner rather than the stale user:null → redirect-to-login.
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged fires next, loads the profile, then sets loading:false
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }

  // ── register ─────────────────────────────────────────────────────────────────
  async function register(email: string, password: string, displayName: string) {
    // Bug fix #1 + #2: we own state during the entire registration sequence.
    registering.current = true;
    setLoading(true);
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateFirebaseProfile(fbUser, { displayName });

      const profile: User = {
        uid:             fbUser.uid,
        email,
        displayName,
        role:            null,   // Bug fix #3: null until user picks a role
        hasSelectedRole: false,
        createdAt:       new Date(),
      };

      await firestoreSetUser(fbUser.uid, profile);
      // Set local state explicitly — this overrides whatever onAuthStateChanged
      // may have set during the race (displayName was '' there because Firebase
      // Auth displayName wasn't set yet when the event fired).
      setCurrentUser(profile);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      registering.current = false;
    }
  }

  // ── logout ───────────────────────────────────────────────────────────────────
  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
  }

  // ── updateProfile ────────────────────────────────────────────────────────────
  async function updateProfile(data: Partial<User>) {
    if (!auth.currentUser) throw new Error('Нет авторизации');
    await firestoreSetUser(auth.currentUser.uid, data);
    setCurrentUser((prev) => (prev ? { ...prev, ...data } : prev));
  }

  // ── refreshProfile ───────────────────────────────────────────────────────────
  async function refreshProfile() {
    if (!auth.currentUser) return;
    const profile = await getUser(auth.currentUser.uid);
    if (profile) setCurrentUser(profile);
  }

  // ── backward-compat aliases ──────────────────────────────────────────────────
  async function setRole(role: UserRole) {
    await updateProfile({ role, hasSelectedRole: true });
  }

  const refreshUser = refreshProfile;

  const value: AuthContextType = {
    user,
    profile: user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
    setRole,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
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
      case 'auth/invalid-email':        return 'Неверный формат email';
      case 'auth/weak-password':        return 'Пароль должен содержать минимум 6 символов';
      case 'auth/user-not-found':       return 'Пользователь не найден';
      case 'auth/wrong-password':       return 'Неверный пароль';
      case 'auth/invalid-credential':   return 'Неверный email или пароль';
      default:                          return 'Произошла ошибка. Попробуйте снова';
    }
  }
  return 'Произошла ошибка. Попробуйте снова';
}
