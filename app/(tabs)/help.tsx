import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    heroBg: theme.surfaceMuted,
    cardBg: theme.surface,
    border: theme.border,
    textStrong: theme.text,
    textMuted: theme.icon,
    textSubtle: theme.icon,
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.screenBg }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
      <SettingsButton style={styles.toolbar} />
      <ThemedView style={[styles.hero, { backgroundColor: palette.heroBg }]}>
        <ThemedText type="title">Austangel User Guide</ThemedText>
        <ThemedText type="default" style={[styles.subtle, { color: palette.textMuted }]}>
          Help for families, drivers, attendants, and administrators.
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Getting started</ThemedText>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Choose School Transport or Travel & Rides, then sign in or create an account. Your tabs and access depend on your account role and assignments. A new account does not automatically receive a bus, child, route, or admin access.</Text>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">School Transport tracking</ThemedText>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Parents can view buses assigned to their children. Open Track and select an available bus. Bus live means a recent GPS point arrived; GPS signal lost means the last point is over two minutes old; Waiting for GPS means no point has arrived yet.</Text>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Drivers start and finish trips from Driver Tools. Bus GPS is shared only while the trip is active, Driver Tools remains open, location permission is allowed, and the device has network access. Attendants record boarding and drop-off check-ins during an active trip. Drivers and attendants without a bus assignment can still use the personal route planner.</Text>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Route planning and map</ThemedText>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Expand Plan Your Route and tap either field. Search for a place, use My Current Location, or choose a point on the map. Location permission is requested only when you choose current location; address search and map selection remain available if permission is denied. Swap Locations reverses the endpoints. Plan Route shows distance, estimated time, and a preview when the routing service returns them.</Text>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Route planning is a personal preview only. It does not change the school's assigned route or official stops, and the estimate is not live traffic guidance.</Text>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Use the map search, + and − zoom, current-focus, refresh, and fullscreen controls. Fullscreen bus details can be hidden or shown with the bus button.</Text>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Settings, privacy, and help</ThemedText>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>Settings sections open when tapped. Notification switches currently save preferences on this device; push alerts and delivered weekly summaries are not active. Admin promotion is verified by the server. Never share an admin code.</Text>
        <Text style={[styles.guideText, { color: palette.textStrong }]}>For a missing bus, route, child, or staff assignment, contact your school or app administrator. If GPS is missing or old, ask the driver to check the active trip, location permission, Driver Tools, and connectivity.</Text>
        <Text style={[styles.guideText, { color: palette.textSubtle }]}>Background location collection, offline GPS upload, and location-history playback are not available. See the app Privacy Policy for data handling details.</Text>
      </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: Layout.pageGutter,
    paddingTop: 20,
    paddingBottom: 44,
    gap: 16,
  },
  toolbar: { position: 'relative', top: 0, right: 0, alignSelf: 'flex-end', marginBottom: -8 },
  hero: {
    padding: 24,
    borderRadius: Layout.radius.panel,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  subtle: {
    color: '#4B5563',
  },
  card: {
    padding: 20,
    borderRadius: Layout.radius.card,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  guideText: { fontSize: 14, lineHeight: 21 },
});
