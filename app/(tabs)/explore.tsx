import { MaterialIcons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';

const STEPS: { number: string; title: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { number: '01', title: 'Choose your role', description: 'Parents follow trips, drivers share live location, attendants record check-ins, and admins manage assignments.', icon: 'people' },
  { number: '02', title: 'Set up buses and routes', description: 'Admins create bus records, assign staff, and connect routes with stops so every trip has the right context.', icon: 'alt-route' },
  { number: '03', title: 'Start a trip', description: 'Drivers start a school trip to share foreground GPS. Families can then follow the bus in real time.', icon: 'my-location' },
  { number: '04', title: 'Record check-ins', description: 'Attendants record when students board and leave, creating a clear trip timeline for the school.', icon: 'fact-check' },
  { number: '05', title: 'Keep families informed', description: 'Trip updates and delay information help families know what is happening during the journey.', icon: 'notifications-active' },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.content, isWideWeb && styles.webContent]}>
        <SettingsButton style={styles.toolbar} />
        <View style={[styles.hero, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <Text style={[styles.eyebrow, { color: theme.tint }]}>AUSTANGEL GUIDE</Text>
          <Text style={[styles.title, { color: theme.text }]}>How it works</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>A simple overview of how trips, live location, check-ins, and assignments fit together.</Text>
        </View>

        <View style={[styles.steps, isWideWeb && styles.webSteps]}>
          {STEPS.map((step) => (
            <View key={step.number} style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border, width: isWideWeb ? '48.5%' : '100%' }]}>
              <View style={[styles.stepIcon, { backgroundColor: theme.surfaceMuted }]}>
                <MaterialIcons name={step.icon} size={22} color={theme.tint} />
              </View>
              <Text style={[styles.stepNumber, { color: theme.tint }]}>{step.number}</Text>
              <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
              <Text style={[styles.stepDescription, { color: theme.icon }]}>{step.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: Layout.pageWidth, alignSelf: 'center', paddingHorizontal: Layout.pageGutter, paddingTop: 20, paddingBottom: 40, gap: 16 },
  webContent: { paddingTop: 32, paddingHorizontal: 28, paddingBottom: 56 },
  toolbar: { position: 'relative', top: 0, right: 0, alignSelf: 'flex-end', marginBottom: -8 },
  hero: { borderWidth: 1, borderRadius: Layout.radius.panel, padding: 24, gap: 7 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800' },
  subtitle: { maxWidth: 720, fontSize: 15, lineHeight: 22 },
  steps: { gap: 12 },
  webSteps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  stepCard: { borderWidth: 1, borderRadius: Layout.radius.card, padding: 20, gap: 7, minHeight: 190 },
  stepIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  stepNumber: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  stepTitle: { fontSize: 16, fontWeight: '700' },
  stepDescription: { fontSize: 14, lineHeight: 21 },
});
