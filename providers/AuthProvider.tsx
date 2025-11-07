import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AustangelUser, UserRole } from '@/models/user';
import { auth } from '@/services/firebase';
import { getUserProfile, upsertUserProfile } from '@/services/firestore/users';

type AuthStatus = 'idle' | 'loading' | 'authorized' | 'unauthorized';

interface AuthContextValue {
  status: AuthStatus;
  firebaseUser: FirebaseUser | null;
  profile: AustangelUser | null;
  role: UserRole | null;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AustangelUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const loadProfile = async (firebaseAccount: FirebaseUser) => {
    setStatus('loading');
    try {
      let userProfile = await getUserProfile(firebaseAccount.uid);
      if (!userProfile) {
        userProfile = {
          id: firebaseAccount.uid,
          email: firebaseAccount.email ?? '',
          role: 'parent',
          displayName: firebaseAccount.displayName ?? firebaseAccount.email ?? 'Austangel Parent',
          createdAt: Date.now(),
        };

        await upsertUserProfile(userProfile);
      }

      setProfile(userProfile);
      setStatus('authorized');
    } catch (error) {
      console.warn('Failed to load profile from Firestore, using fallback profile.', error);
      const fallbackProfile: AustangelUser = {
        id: firebaseAccount.uid,
        email: firebaseAccount.email ?? '',
        role: 'parent',
        displayName: firebaseAccount.displayName ?? firebaseAccount.email ?? 'Austangel Parent',
        createdAt: Date.now(),
      };

      setProfile(fallbackProfile);
      setStatus('authorized');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        loadProfile(user).catch(() => {
          setProfile(null);
          setStatus('unauthorized');
        });
      } else {
        setFirebaseUser(null);
        setProfile(null);
        setStatus('unauthorized');
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      firebaseUser,
      profile,
      role: profile?.role ?? null,
      reloadProfile: async () => {
        if (firebaseUser) {
          await loadProfile(firebaseUser);
        }
      },
    }),
    [status, firebaseUser, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
