import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';

export default function WelcomeScreen() {
  const router = useRouter();
  const { status, primaryService } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;

  useEffect(() => {
    if (status === 'authorized') router.replace(primaryService === 'travel' ? '/(travel)' : '/(tabs)');
  }, [status, primaryService, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isWideWeb && styles.webContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.logo, { backgroundColor: theme.tint }]}>
            <MaterialIcons name="directions-bus" size={42} color="#fff" />
          </View>
          <Text style={[styles.eyebrow, { color: theme.tint }]}>MOVE WITH CONFIDENCE</Text>
          <Text style={[styles.brand, { color: theme.text }]}>Austangel</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>School transport and everyday travel, together in one place.</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, { backgroundColor: theme.tint, opacity: pressed ? 0.88 : 1 }]}
            onPress={() => router.push('/(auth)/select-service')}>
            <Text style={styles.ctaText}>Get started</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
          <View style={styles.footerRow}>
            <MaterialIcons name="verified-user" size={17} color={theme.icon} />
            <Text style={[styles.footer, { color: theme.icon }]}>Safe journeys start here</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Layout.pageGutter },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
    borderWidth: 1,
    borderRadius: Layout.radius.panel,
    gap: 12,
  },
  webContent: { maxWidth: 680, paddingHorizontal: 48, paddingVertical: 52 },
  logo: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  brand: { fontSize: 36, fontWeight: '800', lineHeight: 44 },
  subtitle: { maxWidth: 400, textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 16 },
  cta: { width: '100%', minHeight: 54, borderRadius: Layout.radius.control, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  footer: { fontSize: 13, fontWeight: '500' },
});
