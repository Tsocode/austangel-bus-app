import { Stack, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function TravelLayout() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: theme.colors.text,
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerRight: () => <Pressable onPress={() => router.push('/(auth)/select-service')} accessibilityRole="button" accessibilityLabel="Switch service" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '700' }}>Switch service</Text>
        </Pressable>,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Ride & Travel',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="book-appointment"
        options={{
          title: 'Book a Ride',
        }}
      />
      <Stack.Screen
        name="monitor-trip"
        options={{
          title: 'Track Your Trip',
        }}
      />
      <Stack.Screen name="trip-monitor" options={{ title: 'Track Your Trip' }} />
      <Stack.Screen name="payment" options={{ title: 'Payment' }} />
      <Stack.Screen name="payment-success" options={{ title: 'Trip booked' }} />
    </Stack>
  );
}
