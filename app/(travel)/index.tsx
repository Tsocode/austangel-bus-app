import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';

export default function TravelDashboard() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.content, isWideWeb && styles.webContent]}>
        <View style={[styles.header, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <Text style={[styles.eyebrow, { color: theme.tint }]}>AUSTANGEL TRAVEL</Text>
          <Text style={[styles.greeting, { color: theme.text }]}>Welcome back, {profile?.firstName || 'Guest'}</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Plan a ride or follow an active trip.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>What would you like to do?</Text>
        <View style={[styles.actionsContainer, isWideWeb && styles.webActions]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border, width: isWideWeb ? '48.5%' : '100%' }]}
            onPress={() => router.push('/(travel)/book-appointment')}
            activeOpacity={0.8}
            accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: theme.surfaceMuted }]}>
              <MaterialIcons name="directions-car" size={30} color={theme.tint} />
            </View>
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonTitle, { color: theme.text }]}>Book a ride</Text>
              <Text style={[styles.buttonSubtitle, { color: theme.icon }]}>Choose a destination and schedule.</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border, width: isWideWeb ? '48.5%' : '100%' }]}
            onPress={() => router.push('/(travel)/monitor-trip')}
            activeOpacity={0.8}
            accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: theme.surfaceMuted }]}>
              <MaterialIcons name="location-on" size={30} color="#188B63" />
            </View>
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonTitle, { color: theme.text }]}>Monitor a trip</Text>
              <Text style={[styles.buttonSubtitle, { color: theme.icon }]}>View live details for your trips.</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.icon} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your travel</Text>
        <View style={styles.infoCardsContainer}>
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="check-circle" size={23} color={theme.tint} />
            <Text style={[styles.infoCardLabel, { color: theme.icon }]}>Completed</Text>
            <Text style={[styles.infoCardValue, { color: theme.text }]}>0 trips</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="star" size={23} color="#D99A21" />
            <Text style={[styles.infoCardLabel, { color: theme.icon }]}>Rating</Text>
            <Text style={[styles.infoCardValue, { color: theme.text }]}>--</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="account-balance-wallet" size={23} color="#188B63" />
            <Text style={[styles.infoCardLabel, { color: theme.icon }]}>Wallet</Text>
            <Text style={[styles.infoCardValue, { color: theme.text }]}>$0.00</Text>
          </View>
        </View>

        <View style={[styles.aboutSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.aboutTitle, { color: theme.text }]}>Travel made simpler</Text>
          <Text style={[styles.aboutText, { color: theme.icon }]}>
            Book a ride, follow your trip, and pay securely through the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: Layout.pageWidth,
    paddingHorizontal: Layout.pageGutter,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 14,
  },
  webContent: { paddingTop: 44, paddingBottom: 56 },
  header: { borderWidth: 1, borderRadius: Layout.radius.panel, padding: 24, gap: 6, marginBottom: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  actionsContainer: { gap: 12 },
  webActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionButton: {
    minHeight: 104,
    borderRadius: Layout.radius.card,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flex: 1, gap: 4 },
  buttonTitle: { fontSize: 16, fontWeight: '700' },
  buttonSubtitle: { fontSize: 13, lineHeight: 19 },
  infoCardsContainer: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' },
  infoCard: { flex: 1, minWidth: 100, borderRadius: Layout.radius.card, borderWidth: 1, padding: 14, alignItems: 'center', gap: 7 },
  infoCardLabel: { fontSize: 12, fontWeight: '500' },
  infoCardValue: { fontSize: 15, fontWeight: '700' },
  aboutSection: { borderRadius: Layout.radius.card, borderWidth: 1, padding: 18, gap: 6, marginTop: 6 },
  aboutTitle: { fontSize: 15, fontWeight: '700' },
  aboutText: { fontSize: 14, lineHeight: 21 },
});
