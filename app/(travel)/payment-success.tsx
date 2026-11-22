import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TravelTrip } from '@/models/travel-trip';
import { getTrip } from '@/services/firebase-travel';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = typeof params.tripId === 'string' ? params.tripId : '';
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const scale = useRef(new Animated.Value(0)).current;
  const [trip, setTrip] = useState<TravelTrip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTrip(tripId)
      .then((value) => {
        if (!active) return;
        const loaded = value as TravelTrip | null;
        if (!loaded || loaded.paymentStatus !== 'paid') {
          router.replace({ pathname: '/(travel)/payment', params: { tripId } });
          return;
        }
        setTrip(loaded);
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }).start();
      })
      .catch((error) => console.error('Could not verify payment receipt:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId, router, scale]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
          <MaterialIcons name="check" size={62} color="#fff" />
        </Animated.View>
        <Text style={[styles.title, { color: theme.text }]}>{loading ? 'Verifying payment…' : trip ? 'Payment confirmed' : 'Checking payment'}</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>
          {trip ? 'Your ride request is paid and visible to verified drivers.' : 'We’ll show trip details as soon as Stripe confirms the payment.'}
        </Text>
        {trip ? <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }]}>
          <Detail label="Trip ID" value={trip.id} color={theme.text} />
          <Detail label="Pickup" value={trip.pickupLocation.address} color={theme.text} />
          <Detail label="Dropoff" value={trip.dropoffLocation.address} color={theme.text} />
          <Detail label="Amount paid" value={formatAmount(trip)} color={theme.text} />
        </View> : null}
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => router.replace('/(travel)/monitor-trip')}>
          <MaterialIcons name="directions-car" size={18} color="#fff" />
          <Text style={styles.buttonText}>View trips</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary, { borderColor: theme.tint }]} onPress={() => router.replace('/(travel)')}>
          <MaterialIcons name="home" size={18} color={theme.tint} />
          <Text style={[styles.secondaryText, { color: theme.tint }]}>Travel home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.detail}><Text style={[styles.label, { color }]}>{label}</Text><Text style={[styles.value, { color }]}>{value}</Text></View>;
}

function formatAmount(trip: TravelTrip) {
  const amount = typeof trip.estimatedCostCents === 'number' ? trip.estimatedCostCents / 100 : trip.estimatedCost ?? 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: (trip.currency ?? 'usd').toUpperCase() }).format(amount);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  card: { width: '100%', borderRadius: 12, padding: 16, gap: 14 },
  detail: { gap: 4 },
  label: { fontSize: 11, opacity: 0.7 },
  value: { fontSize: 13, fontWeight: '600' },
  buttons: { padding: 20, gap: 10 },
  button: { borderRadius: 9, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
