import { Pressable, ScrollView, StyleSheet, Switch, Text, View, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemePreference } from '@/providers/AppearanceProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { promoteToAdminSecure } from '@/services/adminPromotion';
import { auth, functions } from '@/services/firebase';
import { httpsCallable } from 'firebase/functions';

const APPEARANCE_OPTIONS = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
] as const;

const UNIT_OPTIONS = [
  { label: 'Kilometers', value: 'km' },
  { label: 'Miles', value: 'mi' },
] as const;

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();
  const { profile, primaryService, reloadProfile } = useAuthContext();
  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [isPromotingToAdmin, setIsPromotingToAdmin] = useState(false);
  const [isRebuildingAccessMaps, setIsRebuildingAccessMaps] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    heroBg: isDark ? '#0f172a' : '#EEF2FF',
    cardBg: isDark ? '#111827' : '#fff',
    border: isDark ? '#1f2937' : '#E5E7EB',
    textStrong: isDark ? '#f8fafc' : '#111827',
    textMuted: isDark ? '#94a3b8' : '#4B5563',
    textSubtle: isDark ? '#9ca3af' : '#475569',
    segmentBg: isDark ? '#0b1220' : '#F1F5F9',
    segmentActive: isDark ? '#1f2937' : '#111827',
    toggleTrack: isDark ? '#1f2937' : '#e5e7eb',
  };

  /**
   * Admin promotion is verified by the callable Cloud Function.
   */
  const handlePromoteToAdmin = async () => {
    if (!adminCode.trim()) {
      Alert.alert('Empty Code', 'Please enter an admin promotion code.');
      return;
    }

    if (!profile) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    // Prevent double submission
    if (isPromotingToAdmin) {
      return;
    }

    setIsPromotingToAdmin(true);

    try {
      // The callable verifies the code on the server and sets the custom claim.
      const result = await promoteToAdminSecure(adminCode);

      if (result.success) {
        // Backend already updated the user role in Firestore
        await auth.currentUser?.getIdToken(true);
        // Reload profile to reflect the changes
        await reloadProfile();
        Alert.alert('Success! 🎉', 'You have been promoted to Admin. The changes will appear immediately.');
        setAdminCode('');
        setShowAdminCode(false);
      } else {
        // Validation failed (invalid code, already admin, etc.)
        Alert.alert('Promotion Failed', result.error || 'Could not promote to admin.');
      }
    } catch (error: any) {
      console.error('Admin promotion error:', error);
      Alert.alert('Error', 'An error occurred during admin promotion. Please try again.');
    } finally {
      setIsPromotingToAdmin(false);
    }
  };

  const handleRebuildAccessMaps = async () => {
    setIsRebuildingAccessMaps(true);
    try {
      const rebuild = httpsCallable(functions, 'rebuildRealtimeAccessMaps');
      const result = await rebuild();
      const counts = result.data as { buses?: number; parents?: number; drivers?: number };
      Alert.alert(
        'Access maps updated',
        `Synced ${counts.buses ?? 0} buses, ${counts.parents ?? 0} parents, and ${counts.drivers ?? 0} drivers.`
      );
    } catch (error) {
      Alert.alert(
        'Sync failed',
        error instanceof Error ? error.message : 'Could not rebuild access maps.'
      );
    } finally {
      setIsRebuildingAccessMaps(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]} keyboardShouldPersistTaps="handled">
      <ThemedView style={[styles.hero, { backgroundColor: palette.heroBg }]}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText type="default" style={[styles.subtle, { color: palette.textMuted }]}>
          Manage appearance, notifications, and other preferences.
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Appearance</ThemedText>
        <View style={[styles.segmented, { backgroundColor: palette.segmentBg }]}>
          {APPEARANCE_OPTIONS.map((option) => {
            const isActive = preference === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.segment,
                  isActive ? [styles.segmentActive, { backgroundColor: palette.segmentActive }] : null,
                ]}
                onPress={() => setPreference(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${option.label} theme`}
                hitSlop={8}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: palette.textSubtle },
                    isActive ? styles.segmentTextActive : null,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.subtle, { color: palette.textSubtle }]}>
          Choose light, dark, or follow your device setting.
        </Text>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Units</ThemedText>
        <View style={[styles.segmented, { backgroundColor: palette.segmentBg }]}>
          {UNIT_OPTIONS.map((option) => {
            const isActive = unit === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.segment,
                  isActive ? [styles.segmentActive, { backgroundColor: palette.segmentActive }] : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Use ${option.label}`}
                hitSlop={8}
                onPress={() => setUnit(option.value)}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: palette.textSubtle },
                    isActive ? styles.segmentTextActive : null,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.subtle, { color: palette.textSubtle }]}>
          Units will apply to ETA and distance displays.
        </Text>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Notifications</ThemedText>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: palette.textStrong }]}>Trip updates</Text>
          <Switch
            trackColor={{ false: palette.toggleTrack, true: theme.tint }}
            value
            accessibilityLabel="Toggle trip updates"
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: palette.textStrong }]}>Delay alerts</Text>
          <Switch
            trackColor={{ false: palette.toggleTrack, true: theme.tint }}
            value
            accessibilityLabel="Toggle delay alerts"
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: palette.textStrong }]}>Weekly summary</Text>
          <Switch
            trackColor={{ false: palette.toggleTrack, true: theme.tint }}
            accessibilityLabel="Toggle weekly summary"
          />
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Account</ThemedText>
        <Text style={[styles.subtle, { color: palette.textMuted }]}>
          Email: {profile?.email}
        </Text>
        <Text style={[styles.subtle, { color: palette.textMuted }]}>
          Current Role: <Text style={{ fontWeight: '700', color: palette.textStrong }}>{profile?.role}</Text>
        </Text>
        {primaryService === 'school' && (
          <View style={{ marginTop: 12, gap: 10, paddingBottom: 80 }}>
            <Text style={[styles.subtle, { color: palette.textMuted, fontSize: 12 }]}>
              {profile?.role === 'admin'
                ? 'Enter the admin code to refresh secure server access.'
                : 'Have an admin code? Enter it below to request admin access.'}
            </Text>
            <View style={[styles.adminCodeInput, { borderColor: palette.border, backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
              <TextInput
                placeholder="Enter admin code"
                secureTextEntry={!showAdminCode}
                value={adminCode}
                onChangeText={setAdminCode}
                style={[styles.input, { color: palette.textStrong }]}
                placeholderTextColor={palette.textMuted}
              />
              <Pressable
                onPress={() => setShowAdminCode(!showAdminCode)}
                style={{ padding: 8 }}>
                <MaterialIcons
                  name={showAdminCode ? 'visibility-off' : 'visibility'}
                  size={18}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>
            <Pressable
              style={[styles.adminButton, { backgroundColor: isPromotingToAdmin ? '#94a3b8' : theme.tint }]}
              onPress={handlePromoteToAdmin}
              disabled={isPromotingToAdmin}
              accessibilityRole="button">
              {isPromotingToAdmin ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.adminButtonText}>
                  {profile?.role === 'admin' ? 'Refresh Admin Access' : 'Verify & Promote to Admin'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
        {profile?.role === 'admin' && (
          <View style={{ marginTop: 8, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="verified" size={16} color="#16a34a" />
              <Text style={{ color: '#16a34a', fontWeight: '600', fontSize: 13 }}>
                Admin Access Enabled
              </Text>
            </View>
            <Pressable
              style={[styles.adminButton, { backgroundColor: theme.tint }]}
              onPress={handleRebuildAccessMaps}
              disabled={isRebuildingAccessMaps}
              accessibilityRole="button">
              <Text style={styles.adminButtonText}>
                {isRebuildingAccessMaps ? 'Syncing access maps…' : 'Sync Existing Firebase Access'}
              </Text>
            </Pressable>
          </View>
        )}
      </ThemedView>

      {__DEV__ ? (
        <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <ThemedText type="subtitle">Developer</ThemedText>
          <Text style={[styles.subtle, { color: palette.textMuted }]}>
            Trigger the global error screen to verify it renders correctly.
          </Text>
          <Pressable
            style={[styles.devButton, { backgroundColor: theme.tint }]}
            onPress={() => {
              throw new Error('Test: global error boundary');
            }}
            accessibilityRole="button"
            accessibilityLabel="Trigger global error screen">
            <Text style={styles.devButtonText}>Test error screen</Text>
          </Pressable>
        </ThemedView>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingTop: 48,
    gap: 14,
  },
  hero: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  subtle: {
    color: '#4B5563',
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#111827',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  segmentTextActive: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  devButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  devButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  adminCodeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  adminButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
