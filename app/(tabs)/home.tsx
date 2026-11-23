import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';
import { auth } from '@/services/firebase';
import { formatRoleLabel, formatUserName } from '@/utils/user';

type HomeAction = { title: string; detail: string; route: string };

const ACTIONS_BY_ROLE: Record<string, HomeAction[]> = {
  parent: [
    { title: 'Track a bus', detail: 'View the latest location for your child’s assigned bus.', route: '/track' },
    { title: 'How tracking works', detail: 'Learn about roles, trips, GPS, and check-ins.', route: '/explore' },
  ],
  driver: [
    { title: 'Driver tools', detail: 'Start a school trip and share foreground GPS.', route: '/driver-tools' },
    { title: 'Bus map', detail: 'View the live map and assigned route.', route: '/track' },
  ],
  attendant: [
    { title: 'Attendant roster', detail: 'View your assigned students and record check-ins.', route: '/attendant' },
    { title: 'Bus map', detail: 'View the live map and assigned route.', route: '/track' },
  ],
  admin: [
    { title: 'Admin console', detail: 'Manage school buses, routes, staff, and student assignments.', route: '/admin' },
    { title: 'Bus map', detail: 'View live bus locations when drivers are sharing GPS.', route: '/track' },
  ],
};

export default function HomeScreen() {
  const router = useRouter();
  const { role, profile } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;
  const [isSigningOut, setIsSigningOut] = useState(false);
  const actions = ACTIONS_BY_ROLE[role ?? 'parent'] ?? ACTIONS_BY_ROLE.parent;

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.content, isWideWeb && styles.webContent]}>
        <SettingsButton style={styles.toolbar} />
        <View style={[styles.hero, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <Text style={[styles.eyebrow, { color: theme.tint }]}>{formatRoleLabel(role)}</Text>
          <Text style={[styles.title, { color: theme.text }]}>Welcome, {formatUserName(profile)}</Text>
          <Text style={[styles.description, { color: theme.icon }]}>
            Choose a task to continue. The information below comes from your current account and assignments.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your tools</Text>
        <View style={[styles.actions, isWideWeb && styles.webActions]}>
        {actions.map((action) => (
          <Pressable
            key={action.route}
            onPress={() => router.push(action.route as never)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.actionCard,
              { backgroundColor: theme.surface, borderColor: theme.border, width: isWideWeb ? '48.5%' : '100%' },
              pressed && styles.pressed,
            ]}>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>{action.title}</Text>
              <Text style={[styles.actionDetail, { color: theme.icon }]}>{action.detail}</Text>
            </View>
            <Text style={[styles.arrow, { color: theme.tint }]}>›</Text>
          </Pressable>
        ))}
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          accessibilityRole="button"
          style={[styles.signOut, { borderColor: colorScheme === 'dark' ? '#7f1d1d' : '#fecaca' }]}>
          {isSigningOut ? <ActivityIndicator color="#dc2626" /> : <Text style={styles.signOutText}>Sign out</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', alignSelf: 'center', maxWidth: Layout.pageWidth, paddingHorizontal: Layout.pageGutter, paddingTop: 28, paddingBottom: 40, gap: 14 },
  webContent: { paddingTop: 44, paddingBottom: 56 },
  toolbar: { position: 'relative', top: 0, right: 0, alignSelf: 'flex-end', marginBottom: -8 },
  hero: { borderRadius: Layout.radius.panel, borderWidth: 1, padding: 26, gap: 8, marginBottom: 12 },
  actions: { gap: 12 },
  webActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 27, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  actionCard: { minHeight: 92, borderRadius: Layout.radius.card, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center' },
  actionText: { flex: 1, gap: 5 },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionDetail: { fontSize: 13, lineHeight: 19 },
  arrow: { fontSize: 28, marginLeft: 14 },
  pressed: { opacity: 0.75 },
  signOut: { marginTop: 18, minHeight: 48, borderWidth: 1, borderRadius: Layout.radius.control, alignItems: 'center', justifyContent: 'center' },
  signOutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});
