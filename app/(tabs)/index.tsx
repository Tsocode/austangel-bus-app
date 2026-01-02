import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { HelloWave } from '@/components/HelloWave';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthContext } from '@/providers/AuthProvider';
import { formatRoleLabel, formatUserName } from '@/utils/user';

export default function HomeScreen() {
  const router = useRouter();
  const { role, profile } = useAuthContext();

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Welcome, {formatUserName(profile)}!</ThemedText>
            <ThemedText type="default" style={styles.subtle}>
              Stay on top of bus tracking, check-ins, and announcements.
            </ThemedText>
          </View>
          <HelloWave />
        </View>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Role</Text>
            <Text style={styles.pillValue}>{formatRoleLabel(role)}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Status</Text>
            <Text style={styles.pillValue}>Online</Text>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">At a glance</ThemedText>
        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statHint}>{item.hint}</Text>
            </View>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Next pickup</ThemedText>
        <View style={styles.nextPickup}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextTitle}>Route 5 • Queens Avenue</Text>
            <Text style={styles.subtle}>ETA: 12 mins · Driver: Adewale</Text>
          </View>
          <Pressable onPress={() => router.push('/track')}>
            <Text style={styles.link}>Open map</Text>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
        <View style={styles.actionRow}>
          <ActionButton label="Track a bus" onPress={() => router.push('/track')} />
          <ActionButton label="Driver tools" onPress={() => router.push('/driver-tools')} />
          <ActionButton label="Admin desk" onPress={() => router.push('/admin')} />
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Today&apos;s notices</ThemedText>
        <Notice text="Route 12 running 5 minutes late near Broad Street." tone="warning" />
        <Notice text="New driver onboarding session this Friday at 3pm." tone="info" />
        <Notice text="Remember to publish location when you start a route." tone="neutral" />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Your shortcuts</ThemedText>
        <Shortcut
          title="View assigned buses"
          description="See buses you manage and update driver names."
          onPress={() => router.push('/track')}
        />
        <Shortcut
          title="Report an issue"
          description="Flag a route or location problem for admins."
          onPress={() => router.push('/explore')}
        />
        <Shortcut
          title="Learn the app"
          description="Walk through key features and best practices."
          onPress={() => router.push('/explore')}
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Recent updates</ThemedText>
        {recent.map((item) => (
          <View key={item.title} style={styles.updateRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
              <ThemedText type="default" style={styles.subtle}>
                {item.detail}
              </ThemedText>
            </View>
            <ThemedText type="link" style={styles.link}>
              View
            </ThemedText>
          </View>
        ))}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Support</ThemedText>
        <ThemedText type="default" style={styles.supportText}>
          Need help? Email support@austangel.com or call +234 (0) 800-123-4567.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <ThemedView style={styles.actionButton}>
      <Text style={styles.actionLabel} onPress={onPress}>
        {label}
      </Text>
    </ThemedView>
  );
}

function Notice({ text, tone }: { text: string; tone: 'warning' | 'info' | 'neutral' }) {
  const bg =
    tone === 'warning'
      ? '#FFF6E5'
      : tone === 'info'
      ? '#E7F0FF'
      : '#F4F4F5';
  const color =
    tone === 'warning'
      ? '#9A5B00'
      : tone === 'info'
      ? '#1D4ED8'
      : '#3F3F46';
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={[styles.noticeText, { color }]}>{text}</Text>
    </View>
  );
}

function Shortcut({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.shortcut} onPress={onPress}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText type="default" style={styles.subtle}>
        {description}
      </ThemedText>
      <ThemedText type="link" style={styles.shortcutLink}>
        Open
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    gap: 14,
  },
  hero: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  subtle: {
    color: '#4B5563',
  },
  pills: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  notice: {
    padding: 10,
    borderRadius: 12,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  shortcutLink: {
    marginTop: 4,
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
});
