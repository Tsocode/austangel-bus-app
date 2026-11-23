import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, LogBox, View, Platform } from 'react-native';

// This notice only reflects the device's Accessibility > Motion setting.
LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device']);

// Only import react-native-reanimated on native platforms
// On web, Reanimated animations are not supported
if (Platform.OS !== 'web') {
  try {
    require('react-native-reanimated');
  } catch (error) {
    console.debug('Reanimated not available');
  }
}

import { useColorScheme } from '@/hooks/useColorScheme';
import { AppearanceProvider } from '@/providers/AppearanceProvider';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';
import { Colors } from '@/constants/Colors';

function RootNavigation() {
  const { status, primaryService } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inTravelGroup = segments[0] === '(travel)';
    const currentScreen = (segments as string[])[1];

    // If user hasn't selected a service yet and is not in auth flow, go to service selector
    if (!primaryService && !inAuthGroup) {
      router.replace('/(auth)/select-service');
      return;
    }

    // If user is in auth group, let them continue through auth flow
    if (inAuthGroup) {
      // User selected service but not logged in yet, let login screen handle it
      if (status !== 'authorized' && currentScreen !== 'select-service') {
        return; // Stay on current auth screen (login)
      }

      // User is authorized, navigate to appropriate dashboard (but only if not already there)
      if (status === 'authorized') {
        if (currentScreen === 'select-service') return;
        if (primaryService === 'school') {
          router.replace('/(tabs)');
        } else {
          router.replace('/(travel)');
        }
      }

      // User not authorized and trying to access dashboard, redirect to select-service
      if (status !== 'authorized' && !primaryService && currentScreen !== 'select-service') {
        router.replace('/(auth)/select-service');
      }
      return;
    }

    // User is authorized and in tabs or travel group, let them navigate freely
    if (status === 'authorized' && (inTabsGroup || inTravelGroup)) {
      return;
    }

    // User is authorized but not in auth/tabs/travel, redirect to appropriate dashboard
    if (status === 'authorized') {
      if (primaryService === 'school') {
        router.replace('/(tabs)');
      } else {
        router.replace('/(travel)');
      }
    }
  }, [status, primaryService, segments, router]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(travel)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <AppearanceProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </AppearanceProvider>
  );
}

function ThemedApp() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = useMemo(() => ({
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
  }), [baseTheme, palette]);
  return (
    <ThemeProvider value={navigationTheme}>
      <RootNavigation />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
