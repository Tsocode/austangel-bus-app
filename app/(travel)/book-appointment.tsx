import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { TravelBookingInput, TravelFareQuote, TravelServiceClass } from '@/models/travel-trip';
import { createTripRequest, quoteTravelFare } from '@/services/firebase-travel';
import { LocationAutocomplete, PlaceResult } from '@/components/LocationAutocomplete';
import { Layout } from '@/constants/Layout';
import { SafeAreaView } from 'react-native-safe-area-context';

const rideClasses: { id: TravelServiceClass; name: string; detail: string }[] = [
  { id: 'standard', name: 'Standard', detail: 'Everyday ride' },
  { id: 'comfort', name: 'Comfort', detail: 'Extra comfort' },
  { id: 'premium', name: 'Premium', detail: 'Premium vehicle' },
];

export default function BookAppointmentScreen() {
  const router = useRouter();
  const theme = useTheme();
  const primaryColor = typeof theme.colors.primary === 'string' ? theme.colors.primary : '#0a7ea4';
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupPlace, setPickupPlace] = useState<PlaceResult | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceResult | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengerCount, setPassengerCount] = useState('1');
  const [serviceClass, setServiceClass] = useState<TravelServiceClass>('standard');
  const [booking, setBooking] = useState<TravelBookingInput | null>(null);
  const [quote, setQuote] = useState<TravelFareQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateInput = (update: () => void) => {
    update();
    setBooking(null);
    setQuote(null);
    setErrorMessage(null);
  };

  const buildBookingInput = async (): Promise<TravelBookingInput> => {
    const cleanPickup = pickup.trim();
    const cleanDropoff = dropoff.trim();
    const count = Number(passengerCount);
    if (cleanPickup.length < 3 || cleanDropoff.length < 3) {
      throw new Error('Enter a pickup and dropoff address.');
    }
    if (!Number.isInteger(count) || count < 1 || count > 8) {
      throw new Error('Passenger count must be between 1 and 8.');
    }
    const scheduledTime = new Date(`${date.trim()} ${time.trim()}`).getTime();
    if (!date.trim() || !time.trim() || !Number.isFinite(scheduledTime) || scheduledTime < Date.now() - 60_000) {
      throw new Error('Enter a valid future date and time.');
    }

    const [pickupResult, dropoffResult] = await Promise.all([
      pickupPlace ? Promise.resolve([{ latitude: pickupPlace.latitude, longitude: pickupPlace.longitude }]) : Location.geocodeAsync(cleanPickup),
      dropoffPlace ? Promise.resolve([{ latitude: dropoffPlace.latitude, longitude: dropoffPlace.longitude }]) : Location.geocodeAsync(cleanDropoff),
    ]);
    if (!pickupResult.length || !dropoffResult.length) {
      throw new Error('We could not find one of those addresses. Check the spelling and try again.');
    }
    return {
          pickupLocation: {
        latitude: pickupResult[0].latitude,
        longitude: pickupResult[0].longitude,
            address: pickupPlace?.address ?? cleanPickup,
      },
      dropoffLocation: {
        latitude: dropoffResult[0].latitude,
        longitude: dropoffResult[0].longitude,
            address: dropoffPlace?.address ?? cleanDropoff,
      },
      passengers: count,
      serviceClass,
      scheduledTime,
    };
  };

  const handleQuote = async () => {
    setLoadingQuote(true);
    setErrorMessage(null);
    try {
      const nextBooking = await buildBookingInput();
      const nextQuote = await quoteTravelFare(nextBooking);
      setBooking(nextBooking);
      setQuote(nextQuote);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not calculate the fare.';
      setErrorMessage(message);
      Alert.alert('Fare quote unavailable', message);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleContinueToPayment = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const bookingInput = booking ?? await buildBookingInput();
      if (!quote) {
        const nextQuote = await quoteTravelFare(bookingInput);
        setBooking(bookingInput);
        setQuote(nextQuote);
      }
      // The callable recalculates the fare from server-side pricing before it
      // creates the pending trip. The client quote is display-only.
      const created = await createTripRequest(bookingInput);
      router.push({ pathname: '/(travel)/payment', params: { tripId: created.tripId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the booking.';
      setErrorMessage(message);
      Alert.alert('Booking failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatFare = (value: TravelFareQuote) => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: value.currency.toUpperCase(),
  }).format(value.amountCents / 100);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={[styles.content, isWideWeb && styles.webContent]} keyboardShouldPersistTaps="handled">
          <LocationAutocomplete label="Pickup location" placeholder="Search pickup address" value={pickup} onChangeText={(value) => { updateInput(() => { setPickup(value); setPickupPlace(null); }); }} onSelect={(place) => { setPickupPlace(place); setPickup(place.address); updateInput(() => {}); }} />
          <LocationAutocomplete label="Dropoff location" placeholder="Search destination address" value={dropoff} onChangeText={(value) => { updateInput(() => { setDropoff(value); setDropoffPlace(null); }); }} onSelect={(place) => { setDropoffPlace(place); setDropoff(place.address); updateInput(() => {}); }} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Date" icon="calendar-today" value={date} placeholder="MM/DD/YYYY" onChangeText={(value) => updateInput(() => setDate(value))} theme={theme} primaryColor={primaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Time" icon="access-time" value={time} placeholder="HH:MM AM/PM" onChangeText={(value) => updateInput(() => setTime(value))} theme={theme} primaryColor={primaryColor} />
            </View>
          </View>

          <Field label="Passengers" icon="people" value={passengerCount} placeholder="1" keyboardType="number-pad" onChangeText={(value) => updateInput(() => setPassengerCount(value))} theme={theme} primaryColor={primaryColor} />

          <Text style={[styles.label, { color: theme.colors.text }]}>Ride class</Text>
          <View style={styles.classRow}>
            {rideClasses.map((item) => (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: serviceClass === item.id }}
                style={[styles.classCard, { borderColor: serviceClass === item.id ? primaryColor : theme.colors.border, backgroundColor: serviceClass === item.id ? theme.colors.background : theme.colors.card }]}
                onPress={() => updateInput(() => setServiceClass(item.id))}>
                <Text style={[styles.className, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.classDetail, { color: theme.colors.text }]}>{item.detail}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.quoteCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quoteLabel, { color: theme.colors.text }]}>Estimated fare</Text>
              <Text style={[styles.quoteAmount, { color: primaryColor }]}>
                {quote ? formatFare(quote) : 'Calculate to see price'}
              </Text>
              {quote ? <Text style={[styles.quoteDistance, { color: theme.colors.text }]}>
                Estimated route: {quote.estimatedRoadKm.toFixed(1)} km
              </Text> : null}
            </View>
            <TouchableOpacity style={[styles.quoteButton, { backgroundColor: primaryColor }]} onPress={handleQuote} disabled={loadingQuote || submitting}>
              {loadingQuote ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get quote</Text>}
            </TouchableOpacity>
          </View>

          {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity style={[styles.continueButton, { backgroundColor: primaryColor, opacity: submitting ? 0.7 : 1 }]} onPress={handleContinueToPayment} disabled={submitting || loadingQuote}>
            {submitting ? <ActivityIndicator color="#fff" /> : <>
              <Text style={styles.buttonText}>Continue to secure payment</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, icon, value, placeholder, onChangeText, theme, primaryColor, keyboardType,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  theme: ReturnType<typeof useTheme>;
  primaryColor: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={[styles.inputContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
        <MaterialIcons name={icon} size={19} color={primaryColor} />
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="words"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', alignSelf: 'center', maxWidth: 760, paddingHorizontal: Layout.pageGutter, paddingTop: 20, paddingBottom: 36, gap: 8 },
  webContent: { paddingTop: 36, paddingBottom: 52 },
  field: { marginBottom: 16, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 10, height: 48, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  classRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  classCard: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 11 },
  className: { fontSize: 13, fontWeight: '700' },
  classDetail: { fontSize: 10, marginTop: 4 },
  quoteCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 16, marginBottom: 18 },
  quoteLabel: { fontSize: 12 },
  quoteAmount: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  quoteDistance: { fontSize: 11, marginTop: 3 },
  quoteButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8 },
  continueButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 15, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  errorText: { color: '#dc2626', marginBottom: 14, fontSize: 12 },
});
