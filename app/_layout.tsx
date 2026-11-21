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

    // If NOT authorized (not logged in), show service selector FIRST
    if (status !== 'authorized') {
      if (!inAuthGroup || segments[1] !== 'select-service') {
        router.replace('/(auth)/select-service');
      }
      return;
    }

    // After login is successful, show appropriate dashboard based on primaryService
    if (status === 'authorized') {
      if (inAuthGroup) {
        if (primaryService === 'school') {
          router.replace('/(tabs)/track');
        } else {
          router.replace('/(travel)');
        }
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
