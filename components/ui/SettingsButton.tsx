import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function SettingsButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: isDark ? '#0b1220' : '#fff',
          borderColor: isDark ? '#1f2937' : '#e5e7eb',
        },
        style,
      ]}
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={8}>
      <MaterialIcons name="settings" size={18} color={theme.tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 38,
    right: 16,
    zIndex: 20,
    padding: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
