import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/**
 * Web-only placeholder for Track screen
 * Maps are not supported on web, so we show a placeholder message
 * On iOS/Android, the full track.tsx is used instead
 */
export default function TrackScreenWeb() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <MaterialIcons
          name="map"
          size={64}
          color={colors.text}
          style={styles.icon}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          Track Not Available on Web
        </Text>
        <Text style={[styles.description, { color: colors.tabIconDefault }]}>
          Real-time bus tracking is only available on iOS and Android devices.
        </Text>
        <Text style={[styles.hint, { color: colors.tabIconDefault }]}>
          Use Expo Go or build a development app to test tracking features.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
