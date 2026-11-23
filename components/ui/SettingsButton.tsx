import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/Colors';
import { minimumTouchTarget } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';

export function SettingsButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.actions, style]}>
    <Pressable style={[styles.switchButton, { backgroundColor: isDark ? '#0b1220' : '#fff', borderColor: isDark ? '#1f2937' : '#e5e7eb' }]} onPress={() => router.push('/(auth)/select-service')} accessibilityRole="button" accessibilityLabel="Switch service" hitSlop={8}>
      <MaterialIcons name="swap-horiz" size={17} color={theme.tint} /><Text style={{ color: theme.tint, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Switch</Text>
    </Pressable>
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: isDark ? '#0b1220' : '#fff',
          borderColor: isDark ? '#1f2937' : '#e5e7eb',
        },
      ]}
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={8}>
      <MaterialIcons name="settings" size={18} color={theme.tint} />
    </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { position: 'absolute', top: 38, right: 16, zIndex: 20, flexDirection: 'row', gap: 8 },
  switchButton: { minHeight: minimumTouchTarget, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  button: {
    minHeight: minimumTouchTarget,
    minWidth: minimumTouchTarget,
    padding: 11,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
