import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { TravelTrip } from '@/models/travel-trip';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Layout } from '@/constants/Layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createTravelPaymentIntent, getTrip, verifyTravelPayment } from '@/services/firebase-travel';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ tripId?: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  if (!stripePublishableKey) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <MaterialIcons name="credit-card-off" size={48} color={theme.icon} />
        <Text style={[styles.title, { color: theme.text }]}>Payments aren’t configured</Text>
        <Text style={[styles.message, { color: theme.icon }]}>Add your Stripe publishable test key to the local environment and restart Expo to continue.</Text>
      </SafeAreaView>
    );
  }
  return (
    <StripeProvider publishableKey={stripePublishableKey} urlScheme={Linking.createURL('')}>
      <PaymentFlow tripId={typeof params.tripId === 'string' ? params.tripId : ''} />
    </StripeProvider>
  );
}

function PaymentFlow({ tripId }: { tripId: string }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [trip, setTrip] = useState<TravelTrip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!tripId) {
      setErrorMessage('Trip ID is missing. Return to booking and try again.');
      setLoadingTrip(false);
      return;
    }
    getTrip(tripId)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setErrorMessage('This trip could not be found.');
        } else {
          setTrip(result as TravelTrip);
          if ((result as TravelTrip).paymentStatus === 'paid') {
            router.replace({ pathname: '/(travel)/payment-success', params: { tripId } });
          }
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Unable to load this trip.');
      })
      .finally(() => { if (active) setLoadingTrip(false); });
    return () => { active = false; };
  }, [tripId, router]);

  const handlePayment = async () => {
    if (!tripId || !trip || paying) return;
    setPaying(true);
    setErrorMessage(null);
    try {
      const alreadyPaid = await verifyTravelPayment(tripId);
      if (alreadyPaid.paid) {
        router.replace({ pathname: '/(travel)/payment-success', params: { tripId } });
        return;
      }
      const { clientSecret } = await createTravelPaymentIntent(tripId);
      const initialized = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Austangel',
        returnURL: Linking.createURL('stripe-redirect'),
      });
      if (initialized.error) throw new Error(initialized.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code === 'Canceled') return;
        throw new Error(result.error.message);
      }

      const verification = await verifyTravelPayment(tripId);
      if (!verification.paid) {
        throw new Error('Stripe is still confirming this payment. Reopen this trip to check again.');
      }
      router.replace({ pathname: '/(travel)/payment-success', params: { tripId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment could not be completed.';
      setErrorMessage(message);
      Alert.alert('Payment not completed', message);
    } finally {
      setPaying(false);
    }
  };

  if (loadingTrip) {
    return <SafeAreaView style={[styles.container, styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.tint} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Secure payment</Text>
        {trip ? <>
          <View style={[styles.summary, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }]}>
            <Summary label="Pickup" value={trip.pickupLocation.address} color={theme.text} />
            <Summary label="Dropoff" value={trip.dropoffLocation.address} color={theme.text} />
            <Summary label="Scheduled" value={new Date(trip.scheduledTime ?? trip.requestedTime).toLocaleString()} color={theme.text} />
            <Summary label="Ride class" value={trip.serviceClass ?? 'Standard'} color={theme.text} />
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: theme.tint }]}>{formatAmount(trip)}</Text>
          </View>
          <Text style={[styles.secureNote, { color: theme.icon }]}>Card details are collected by Stripe’s secure payment sheet. Austangel never stores your card number or security code.</Text>
          {errorMessage ? <Text style={styles.error} accessibilityRole="alert">{errorMessage}</Text> : null}
          <TouchableOpacity style={[styles.payButton, { backgroundColor: theme.tint, opacity: paying ? 0.65 : 1 }]} onPress={handlePayment} disabled={paying || trip.paymentStatus === 'paid'}>
            {paying ? <ActivityIndicator color="#fff" /> : <>
              <MaterialIcons name="lock" size={18} color="#fff" />
              <Text style={styles.payButtonText}>Pay {formatAmount(trip)}</Text>
            </>}
          </TouchableOpacity>
        </> : <Text style={[styles.message, { color: theme.icon }]}>{errorMessage ?? 'Trip details are unavailable.'}</Text>}
      </View>
    </SafeAreaView>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color }]}>{label}</Text><Text style={[styles.summaryValue, { color }]}>{value}</Text></View>;
}

function formatAmount(trip: TravelTrip) {
  const amount = typeof trip.estimatedCostCents === 'number'
    ? trip.estimatedCostCents / 100
    : trip.estimatedCost ?? 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: (trip.currency ?? 'usd').toUpperCase() }).format(amount);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', flex: 1, paddingHorizontal: Layout.pageGutter, paddingVertical: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 20 },
  summary: { borderRadius: Layout.radius.card, padding: 20, gap: 16 },
  summaryRow: { gap: 6 },
  summaryLabel: { fontSize: 11, opacity: 0.7 },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 22 },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalAmount: { fontSize: 22, fontWeight: '700' },
  secureNote: { fontSize: 12, lineHeight: 18, marginBottom: 18 },
  payButton: { minHeight: 52, borderRadius: Layout.radius.control, padding: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  payButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  message: { textAlign: 'center', lineHeight: 20, marginTop: 12 },
  error: { color: '#dc2626', fontSize: 12, marginBottom: 14 },
});
