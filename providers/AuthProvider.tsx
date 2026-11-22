import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AustangelUser, UserRole, ServiceType, SchoolRole, TravelRole } from '@/models/user';
import { auth } from '@/services/firebase';
import { getUserProfile, upsertUserProfile } from '@/services/firestore/users';

type AuthStatus = 'idle' | 'loading' | 'authorized' | 'unauthorized';

interface AuthContextValue {
  status: AuthStatus;
  firebaseUser: FirebaseUser | null;
  profile: AustangelUser | null;
  role: UserRole | null;
  reloadProfile: () => Promise<void>;
  primaryService?: ServiceType;
  switchService?: (service: ServiceType) => Promise<void>;
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
  const [primaryService, setPrimaryService] = useState<ServiceType>('school');

  const splitName = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.includes('@')) {
      return { firstName: undefined, lastName: undefined };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: undefined };
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const loadProfile = async (firebaseAccount: FirebaseUser) => {
    setStatus('loading');
    try {
      let userProfile = await getUserProfile(firebaseAccount.uid);
      if (!userProfile) {
        const { firstName, lastName } = splitName(firebaseAccount.displayName);
        userProfile = {
          id: firebaseAccount.uid,
          email: firebaseAccount.email ?? '',
          role: 'parent' as UserRole,
          primaryService: 'school',
          schoolRole: 'parent' as SchoolRole,
          firstName,
          lastName,
          displayName: firebaseAccount.displayName ?? firebaseAccount.email ?? 'Austangel User',
          createdAt: Date.now(),
        };

        await upsertUserProfile(userProfile);
      }

      setProfile(userProfile);
      setPrimaryService(userProfile.primaryService ?? 'school');
      setStatus('authorized');
    } catch (error) {
      console.warn('Failed to load profile from Firestore, using fallback profile.', error);
      const { firstName, lastName } = splitName(firebaseAccount.displayName);
      const fallbackProfile: AustangelUser = {
        id: firebaseAccount.uid,
        email: firebaseAccount.email ?? '',
        role: 'parent' as UserRole,
        primaryService: 'school',
        schoolRole: 'parent' as SchoolRole,
        firstName,
        lastName,
        displayName: firebaseAccount.displayName ?? firebaseAccount.email ?? 'Austangel User',
        createdAt: Date.now(),
      };

      setProfile(fallbackProfile);
      setPrimaryService('school');
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

  const switchService = async (service: ServiceType) => {
    // Allow switching service even without profile (during login flow)
    setPrimaryService(service);
    
    if (profile) {
      await upsertUserProfile({
        ...profile,
        primaryService: service,
      });
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      firebaseUser,
      profile,
      role: profile?.role ?? null,
      primaryService,
      switchService,
      reloadProfile: async () => {
        if (firebaseUser) {
          await loadProfile(firebaseUser);
        }
      },
    }),
    [status, firebaseUser, profile, primaryService]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
