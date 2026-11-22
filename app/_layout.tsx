import '@/globals';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';

// Only import react-native-reanimated on native platforms
// On web, Reanimated animations are not supported
if (Platform.OS !== 'web') {
  require('react-native-reanimated');
}

import { useColorScheme } from '@/hooks/useColorScheme';
import { AppearanceProvider } from '@/providers/AppearanceProvider';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';

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
    const currentScreen = segments[1];

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
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootNavigation />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
