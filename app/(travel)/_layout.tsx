import { Stack } from 'expo-router';

export default function TravelLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0a7ea4',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
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
      <Stack.Screen name="payment" options={{ title: 'Payment' }} />
      <Stack.Screen name="payment-success" options={{ title: 'Trip booked' }} />
    </Stack>
  );
}
