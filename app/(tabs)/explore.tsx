import { StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SettingsButton } from '@/components/ui/SettingsButton';

export default function TabTwoScreen() {
  return (
    <View style={styles.screen}>
      <SettingsButton />
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#E0F2FE', dark: '#0b1220' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#38bdf8"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">How it works</ThemedText>
        </ThemedView>
      <ThemedText style={styles.subtitle}>
        Get a clear picture of how tracking, check‑ins, and alerts flow through the app.
      </ThemedText>

      <ThemedView style={styles.stepCard}>
        <ThemedText type="subtitle">1) Set up roles</ThemedText>
        <ThemedText>
          Parents track. Drivers publish location. Attendants handle check‑ins. Admins manage
          routes and assignments.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepCard}>
        <ThemedText type="subtitle">2) Assign buses + routes</ThemedText>
        <ThemedText>
          Admins create bus records, assign drivers, and attach routes with stops to power map
          views.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepCard}>
        <ThemedText type="subtitle">3) Go live</ThemedText>
        <ThemedText>
          Drivers start a trip to publish live GPS updates. Parents see the bus move in real time.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepCard}>
        <ThemedText type="subtitle">4) Record attendance</ThemedText>
        <ThemedText>
          Boarding and drop‑off events create a timeline of who is on the bus and when.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepCard}>
        <ThemedText type="subtitle">5) Send alerts</ThemedText>
        <ThemedText>
          Delays, incidents, and missed check‑ins can trigger updates to keep families informed.
        </ThemedText>
      </ThemedView>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  stepCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
});
