import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';
import { auth } from '@/services/firebase';
import { formatRoleLabel, formatUserName } from '@/utils/user';

type RoleView = 'parent' | 'driver' | 'admin';

export default function HomeScreen() {
  const router = useRouter();
  const { role, profile } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    heroBg: isDark ? '#0f172a' : '#EEF2FF',
    cardBg: isDark ? '#111827' : '#fff',
    border: isDark ? '#1f2937' : '#E5E7EB',
    pillBg: isDark ? '#0b1220' : '#fff',
    pillBorder: isDark ? '#1f2937' : '#E5E7EB',
    statBg: isDark ? '#0b1220' : '#F9FAFB',
    textStrong: isDark ? '#f8fafc' : '#111827',
    textMuted: isDark ? '#94a3b8' : '#4B5563',
    textSubtle: isDark ? '#9ca3af' : '#6B7280',
    logoutBg: isDark ? '#2b1414' : '#FEF2F2',
    logoutBorder: isDark ? '#7f1d1d' : '#FECACA',
    emptyBg: isDark ? '#0b1220' : '#F8FAFC',
    emptyBorder: isDark ? '#1f2937' : '#E2E8F0',
    emptyActionBg: isDark ? '#1f2937' : '#E2E8F0',
    emptyActionText: isDark ? '#e2e8f0' : '#1F2937',
  };
  const [isLoading, setIsLoading] = useState(true);
  const roleView: RoleView = (role ?? 'parent') as RoleView;
  const hasChildLinks = (profile?.childIds ?? []).length > 0;
  const hasAssignedBus = Boolean(profile?.assignedBusId);

  const stats = [
    { label: 'Active buses', value: '6', hint: '2 en route now' },
    { label: 'Check-ins today', value: '128', hint: '92% on time' },
    { label: 'Open alerts', value: '3', hint: '2 route, 1 safety' },
  ];

  const recent = [
    { title: 'Route 12 started', detail: 'Driver Tunde began at 2:40pm' },
    { title: 'Parent notified', detail: 'Late departure notice sent' },
    { title: 'New driver added', detail: 'Ada assigned to Bus 3' },
  ];

  const handleLogout = async () => {
    Haptics.selectionAsync().catch(() => undefined);
    await signOut(auth);
    router.replace('/(auth)/login');
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.screenBg }]}>
        <SettingsButton />
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
          <View style={[styles.hero, { backgroundColor: palette.heroBg }]}>
            <SkeletonBlock height={28} width="60%" />
            <SkeletonBlock height={16} width="85%" />
            <View style={styles.skeletonRow}>
              <SkeletonBlock height={32} width="26%" radius={999} />
              <SkeletonBlock height={32} width="26%" radius={999} />
              <SkeletonBlock height={32} width="26%" radius={999} />
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <SkeletonBlock height={18} width="40%" />
            <View style={styles.skeletonRow}>
              <SkeletonBlock height={64} width="30%" />
              <SkeletonBlock height={64} width="30%" />
              <SkeletonBlock height={64} width="30%" />
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <SkeletonBlock height={18} width="40%" />
            <SkeletonBlock height={16} width="70%" />
            <SkeletonBlock height={16} width="55%" />
          </View>
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <SkeletonBlock height={18} width="40%" />
            <View style={styles.skeletonRow}>
              <SkeletonBlock height={44} width="30%" radius={12} />
              <SkeletonBlock height={44} width="30%" radius={12} />
              <SkeletonBlock height={44} width="30%" radius={12} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.screenBg }]}>
      <SettingsButton />
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
      <ThemedView style={[styles.hero, { backgroundColor: palette.heroBg }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={[styles.heroTitle, { color: palette.textStrong }]}>
              Hi, {formatUserName(profile)}!
            </ThemedText>
            <ThemedText type="default" style={[styles.heroSubtitle, { color: palette.textMuted }]}>
              Stay on top of bus tracking, check-ins, and announcements.
            </ThemedText>
          </View>
          <HelloWave />
        </View>

        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: palette.pillBg, borderColor: palette.pillBorder }]}>
            <Text style={[styles.pillLabel, { color: palette.textSubtle }]}>Role</Text>
            <Text style={[styles.pillValue, { color: palette.textStrong }]}>
              {formatRoleLabel(role)}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: palette.pillBg, borderColor: palette.pillBorder }]}>
            <Text style={[styles.pillLabel, { color: palette.textSubtle }]}>Status</Text>
            <Text style={[styles.pillValue, { color: palette.textStrong }]}>Online</Text>
          </View>
          <Pressable
            style={[
              styles.pill,
              styles.logoutPill,
              { backgroundColor: palette.logoutBg, borderColor: palette.logoutBorder },
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out">
            <Text style={[styles.pillLabel, { color: '#dc2626' }]}>Logout</Text>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">At a glance</ThemedText>
        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View
              key={item.label}
              style={[
                styles.statCard,
                { backgroundColor: palette.statBg, borderColor: palette.border },
              ]}>
              <Text style={[styles.statValue, { color: palette.textStrong }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { color: palette.textSubtle }]}>{item.label}</Text>
              <Text style={[styles.statHint, { color: palette.textMuted }]}>{item.hint}</Text>
            </View>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Next pickup</ThemedText>
        <View style={styles.nextPickup}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nextTitle, { color: palette.textStrong }]}>
              Route 5 • Queens Avenue
            </Text>
            <Text style={[styles.subtle, { color: palette.textMuted }]}>
              ETA: 12 mins · Driver: Adewale
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/track')}
            accessibilityRole="button"
            accessibilityLabel="Open map">
            <Text style={[styles.link, { color: theme.tint }]}>Open map</Text>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
        <View style={styles.actionRow}>
          <ActionButton label="Track a bus" tint={theme.tint} onPress={() => router.push('/track')} />
          <ActionButton label="Driver tools" tint={theme.tint} onPress={() => router.push('/driver-tools')} />
          <ActionButton label="Admin desk" tint={theme.tint} onPress={() => router.push('/admin')} />
        </View>
      </ThemedView>

      {roleView === 'parent' && (
        <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <ThemedText type="subtitle">Your child&apos;s ride</ThemedText>
          {!hasChildLinks ? (
            <EmptyState
              title="No child linked yet"
              description="Ask an admin to connect your child to a bus so live tracking shows here."
              actionLabel="How to link"
              onPress={() => router.push('/explore')}
              palette={palette}
            />
          ) : (
            <>
              <Notice text="Bus: Route 5 • Driver: Adewale" tone="info" isDark={isDark} />
              <Notice text="ETA to stop: 12 mins • Last update: 45s ago" tone="neutral" isDark={isDark} />
              <Notice text="Status: On bus · Last check-in: 2:38pm" tone="info" isDark={isDark} />
              <View style={styles.actionRow}>
                <ActionButton label="Open live map" tint={theme.tint} onPress={() => router.push('/track')} />
                <ActionButton label="Report issue" tint={theme.tint} onPress={() => router.push('/explore')} />
              </View>
            </>
          )}
        </ThemedView>
      )}

      {roleView === 'driver' && (
        <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <ThemedText type="subtitle">Driver essentials</ThemedText>
          {!hasAssignedBus ? (
            <EmptyState
              title="No bus assigned"
              description="Once an admin assigns you to a bus, your route and tools show up here."
              actionLabel="Contact admin"
              onPress={() => router.push('/explore')}
              palette={palette}
            />
          ) : (
            <>
              <Notice text="Route today: Victoria Express • 12 stops • 32 riders" tone="neutral" isDark={isDark} />
              <Notice text="Publisher: On · Last sent: 30s ago · GPS: Good" tone="info" isDark={isDark} />
              <Notice text="Safety: Report incident or SOS to admin" tone="warning" isDark={isDark} />
              <View style={styles.actionRow}>
                <ActionButton label="Open driver tools" tint={theme.tint} onPress={() => router.push('/driver-tools')} />
                <ActionButton label="Incident report" tint={theme.tint} onPress={() => router.push('/explore')} />
              </View>
            </>
          )}
        </ThemedView>
      )}

      {roleView === 'admin' && (
        <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <ThemedText type="subtitle">Ops snapshot</ThemedText>
          <EmptyState
            title="No ops data yet"
            description="Add buses, routes, and driver assignments to start populating live ops."
            actionLabel="Open admin desk"
            onPress={() => router.push('/admin')}
            palette={palette}
          />
        </ThemedView>
      )}

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Today&apos;s notices</ThemedText>
        <Notice text="Route 12 running 5 minutes late near Broad Street." tone="warning" isDark={isDark} />
        <Notice text="New driver onboarding session this Friday at 3pm." tone="info" isDark={isDark} />
        <Notice text="Remember to publish location when you start a route." tone="neutral" isDark={isDark} />
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Your shortcuts</ThemedText>
        <Shortcut
          title="View assigned buses"
          description="See buses you manage and update driver names."
          onPress={() => router.push('/track')}
          palette={palette}
          tint={theme.tint}
        />
        <Shortcut
          title="Report an issue"
          description="Flag a route or location problem for admins."
          onPress={() => router.push('/explore')}
          palette={palette}
          tint={theme.tint}
        />
        <Shortcut
          title="Learn the app"
          description="Walk through key features and best practices."
          onPress={() => router.push('/explore')}
          palette={palette}
          tint={theme.tint}
        />
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Reviews & feedback</ThemedText>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewStars}>★★★★☆</Text>
          <Text style={[styles.subtle, { color: palette.textMuted }]}>Avg route rating (demo)</Text>
        </View>
        <Pressable
          style={[styles.reviewButton, { backgroundColor: theme.tint }]}
          onPress={() => router.push('/explore')}
          accessibilityRole="button"
          accessibilityLabel="Leave a review">
          <Text style={styles.reviewButtonText}>Leave a review</Text>
        </Pressable>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Recent updates</ThemedText>
        {recent.map((item) => (
          <View key={item.title} style={styles.updateRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
              <ThemedText type="default" style={[styles.subtle, { color: palette.textMuted }]}>
                {item.detail}
              </ThemedText>
            </View>
            <ThemedText type="link" style={[styles.link, { color: theme.tint }]}>
              View
            </ThemedText>
          </View>
        ))}
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Support</ThemedText>
        <ThemedText type="default" style={[styles.supportText, { color: palette.textStrong }]}>
          Need help? Email support@austangel.com or call +234 (0) 800-123-4567.
        </ThemedText>
        <Pressable
          style={[styles.supportButton, { backgroundColor: theme.tint }]}
          onPress={() => router.push('/help')}
          accessibilityRole="button"
          accessibilityLabel="Open help and support">
          <Text style={styles.supportButtonText}>Open Help</Text>
        </Pressable>
      </ThemedView>
      </ScrollView>
    </View>
  );
}

function SkeletonBlock({
  height,
  width,
  radius = 10,
}: {
  height: number;
  width: DimensionValue;
  radius?: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';
  const fill = isDark ? '#1f2937' : '#e5e7eb';
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: radius, backgroundColor: fill }]} />;
}

function ActionButton({
  label,
  onPress,
  tint,
}: {
  label: string;
  onPress: () => void;
  tint: string;
}) {
  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: tint }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Notice({
  text,
  tone,
  isDark,
}: {
  text: string;
  tone: 'warning' | 'info' | 'neutral';
  isDark: boolean;
}) {
  const bg =
    tone === 'warning'
      ? isDark
        ? '#3a2a12'
        : '#FFF6E5'
      : tone === 'info'
      ? isDark
        ? '#0b1f3a'
        : '#E7F0FF'
      : isDark
      ? '#0b1220'
      : '#F4F4F5';
  const color =
    tone === 'warning'
      ? isDark
        ? '#fbbf24'
        : '#9A5B00'
      : tone === 'info'
      ? isDark
        ? '#93c5fd'
        : '#1D4ED8'
      : isDark
      ? '#cbd5f5'
      : '#3F3F46';
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={[styles.noticeText, { color }]}>{text}</Text>
    </View>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onPress,
  palette,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onPress?: () => void;
  palette: {
    textStrong: string;
    textMuted: string;
    emptyBg: string;
    emptyBorder: string;
    emptyActionBg: string;
    emptyActionText: string;
  };
}) {
  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: palette.emptyBg, borderColor: palette.emptyBorder },
      ]}>
      <Text style={[styles.emptyTitle, { color: palette.textStrong }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: palette.textMuted }]}>{description}</Text>
      {actionLabel && onPress ? (
        <Pressable
          style={[styles.emptyAction, { backgroundColor: palette.emptyActionBg }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}>
          <Text style={[styles.emptyActionText, { color: palette.emptyActionText }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Shortcut({
  title,
  description,
  onPress,
  palette,
  tint,
}: {
  title: string;
  description: string;
  onPress: () => void;
  palette: {
    textMuted: string;
    border: string;
  };
  tint: string;
}) {
  return (
    <Pressable
      style={[styles.shortcut, { borderColor: palette.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText type="default" style={[styles.subtle, { color: palette.textMuted }]}>
        {description}
      </ThemedText>
      <ThemedText type="link" style={[styles.shortcutLink, { color: tint }]}>
        Open
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 18,
    paddingTop: 52,
    paddingBottom: 120,
    gap: 12,
  },
  hero: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  heroTitle: {
    letterSpacing: -0.2,
    lineHeight: 34,
  },
  heroSubtitle: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  subtle: {
    color: '#4B5563',
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutPill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  pillLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  skeletonBlock: {
    backgroundColor: '#e5e7eb',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  notice: {
    padding: 10,
    borderRadius: 10,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 13,
    color: '#374151',
  },
  statHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  nextPickup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  link: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  shortcut: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  emptyState: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  emptyAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  shortcutLink: {
    marginTop: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewStars: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  reviewButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  supportText: {
    color: '#111827',
  },
  supportButton: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  supportButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
