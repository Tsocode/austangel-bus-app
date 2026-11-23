import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AustangelUser, UserRole, ServiceType, SchoolRole, TravelRole } from '@/models/user';
import { auth } from '@/services/firebase';
import { getUserProfile, upsertUserProfile } from '@/services/firestore/users';

type AuthStatus = 'idle' | 'loading' | 'authorized' | 'unauthorized';
const PROFILE_REQUEST_TIMEOUT_MS = 10_000;

function withTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), PROFILE_REQUEST_TIMEOUT_MS);
    operation.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

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
  const preferredService = useRef<ServiceType | null>(null);

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
      let userProfile = await withTimeout(
        getUserProfile(firebaseAccount.uid),
        'Profile request timed out'
      );
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

        await withTimeout(upsertUserProfile(userProfile), 'Profile setup timed out');
      }

      const service = preferredService.current ?? userProfile.primaryService ?? 'school';
      const activeProfile = { ...userProfile, primaryService: service };
      setProfile(activeProfile);
      setPrimaryService(service);
      if (userProfile.primaryService !== service) {
        void upsertUserProfile(activeProfile).catch((error) => {
          console.warn('Could not save the selected service:', error);
        });
      }
      setStatus('authorized');
    } catch (error) {
      console.warn('Failed to load profile from Firestore, using fallback profile.', error);
      const { firstName, lastName } = splitName(firebaseAccount.displayName);
      const service = preferredService.current ?? 'school';
      const fallbackProfile: AustangelUser = {
        id: firebaseAccount.uid,
        email: firebaseAccount.email ?? '',
        role: (service === 'travel' ? 'passenger' : 'parent') as UserRole,
        primaryService: service,
        schoolRole: service === 'school' ? 'parent' as SchoolRole : undefined,
        travelRole: service === 'travel' ? 'passenger' as TravelRole : undefined,
        firstName,
        lastName,
        displayName: firebaseAccount.displayName ?? firebaseAccount.email ?? 'Austangel User',
        createdAt: Date.now(),
      };

      setProfile(fallbackProfile);
      setPrimaryService(service);
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
        preferredService.current = null;
        setFirebaseUser(null);
        setProfile(null);
        setStatus('unauthorized');
      }
    });

    return () => unsubscribe();
  }, []);

  const switchService = async (service: ServiceType) => {
    preferredService.current = service;
    setPrimaryService(service);
    if (profile) {
      const nextProfile = { ...profile, primaryService: service };
      setProfile(nextProfile);
      void upsertUserProfile({
        ...profile,
        primaryService: service,
      }).catch((error) => {
        console.warn('Could not save the selected service:', error);
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
