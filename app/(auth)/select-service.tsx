import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ServiceType } from '@/models/user';
import { useAuthContext } from '@/providers/AuthProvider';

const SERVICES: { id: ServiceType; title: string; description: string; icon: 'directions-bus' | 'directions-car'; iconColor: string }[] = [
  {
    id: 'school',
    title: 'School transport',
    description: 'Track school buses, manage attendance, and stay connected with drivers.',
    icon: 'directions-bus',
    iconColor: '#087E83',
  },
  {
    id: 'travel',
    title: 'Travel & rides',
    description: 'Book rides, follow trips, and manage your transportation needs.',
    icon: 'directions-car',
    iconColor: '#188B63',
  },
];

export default function SelectServiceScreen() {
  const router = useRouter();
  const { switchService, status, primaryService } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType>(primaryService ?? 'school');

  const handleContinue = async () => {
    setLoading(true);
    try {
      await switchService?.(selectedService);
      if (status === 'authorized') {
        router.replace(selectedService === 'travel' ? '/(travel)' : '/(tabs)');
      } else {
        router.replace({ pathname: '/(auth)/login', params: { service: selectedService } });
      }
    } catch (error) {
      console.error('Failed to switch service:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.content, isWideWeb && styles.webContent]}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to welcome">
            <MaterialIcons name="arrow-back" size={20} color={theme.tint} />
            <Text style={[styles.backText, { color: theme.tint }]}>Welcome</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: theme.tint }]}>YOUR JOURNEY STARTS HERE</Text>
            <Text style={[styles.title, { color: theme.text }]}>Choose your service</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>Select the Austangel experience you want to use.</Text>
          </View>

          <View style={[styles.serviceList, isWideWeb && styles.webServiceList]}>
            {SERVICES.map((service) => {
              const selected = selectedService === service.id;
              return (
                <Pressable
                  key={service.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedService(service.id)}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.serviceCard,
                    {
                      width: isWideWeb ? '48.5%' : '100%',
                      backgroundColor: selected ? theme.surfaceMuted : theme.surface,
                      borderColor: selected ? theme.tint : theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}>
                  <View style={[styles.serviceIcon, { backgroundColor: theme.surfaceMuted }]}>
                    <MaterialIcons name={service.icon} size={30} color={service.iconColor} />
                  </View>
                  <Text style={[styles.serviceTitle, { color: theme.text }]}>{service.title}</Text>
                  <Text style={[styles.serviceDescription, { color: theme.icon }]}>{service.description}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.selectLabel, { color: selected ? theme.tint : theme.icon }]}>{selected ? 'Selected' : 'Choose service'}</Text>
                    <MaterialIcons name={selected ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selected ? theme.tint : theme.icon} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [styles.continueButton, { backgroundColor: theme.tint, opacity: loading ? 0.7 : pressed ? 0.9 : 1 }]}
            onPress={handleContinue}
            disabled={loading}
            accessibilityRole="button">
            {loading ? <ActivityIndicator color="#fff" /> : <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>}
          </Pressable>
          <Text style={[styles.switchNote, { color: theme.icon }]}>You can switch services anytime from your account.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: Layout.pageWidth, alignSelf: 'center', flex: 1, paddingHorizontal: Layout.pageGutter, paddingVertical: 24, gap: 18 },
  webContent: { paddingHorizontal: 32, paddingVertical: 36 },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '700' },
  header: { gap: 7, marginBottom: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  serviceList: { gap: 12 },
  webServiceList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: { minHeight: 214, borderWidth: 1.5, borderRadius: Layout.radius.card, padding: 20, gap: 10 },
  serviceIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  serviceTitle: { fontSize: 18, fontWeight: '700' },
  serviceDescription: { fontSize: 14, lineHeight: 21 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  selectLabel: { fontSize: 13, fontWeight: '700' },
  continueButton: { minHeight: 52, borderRadius: Layout.radius.control, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 2 },
  continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchNote: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
