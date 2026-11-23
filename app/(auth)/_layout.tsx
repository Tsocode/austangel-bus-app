import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="login" options={{ presentation: 'card' }} />
      <Stack.Screen name="select-service" options={{ presentation: 'card' }} />
    </Stack>
  );
}
