import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type ThemePreference = 'system' | 'light' | 'dark';

type AppearanceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colorScheme: 'light' | 'dark';
};

const STORAGE_KEY = 'themePreference';

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!isMounted) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => undefined);
  }, [preference, isLoaded]);

  const colorScheme = preference === 'system' ? systemScheme : preference;
  const value = useMemo(
    () => ({
      preference,
      setPreference: setPreferenceState,
      colorScheme,
    }),
    [preference, colorScheme]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppColorScheme(): 'light' | 'dark' {
  const systemScheme = useRNColorScheme() ?? 'light';
  const context = useContext(AppearanceContext);
  return context?.colorScheme ?? systemScheme;
}

export function useThemePreference(): AppearanceContextValue {
  const systemScheme = useRNColorScheme() ?? 'light';
  const context = useContext(AppearanceContext);
  if (!context) {
    return {
      preference: 'system',
      setPreference: () => undefined,
      colorScheme: systemScheme,
    };
  }
  return context;
}
