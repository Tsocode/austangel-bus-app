import { useRoute, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function PaymentScreen() {
  const route = useRoute();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const params = route.params as any;
  const { tripId, pickup, dropoff, fare, rideType, passengerCount, date, time } = params || {};

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card' },
    { id: 'wallet', name: 'Digital Wallet', icon: 'account-balance-wallet' },
    { id: 'bank', name: 'Bank Transfer', icon: 'account-balance' },
  ];

  const finalFare = parseFloat(fare || '0') - discount;

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'SAVE10') {
      setDiscount(parseFloat(fare || '0') * 0.1);
      Alert.alert('Success', '10% discount applied!');
    } else if (promoCode !== '') {
      Alert.alert('Invalid', 'Promo code not found');
    }
  };

  const handleCompletePayment = async () => {
    if (paymentMethod === 'card') {
      if (!cardNumber || !expiryDate || !cvv || !cardHolder) {
        Alert.alert('Missing Information', 'Please fill in all card details');
        return;
      }
    }

    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success
      Alert.alert('Success', `Payment of $${finalFare.toFixed(2)} completed!`, [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to trip details or success screen
            router.replace({
              pathname: '/(travel)/payment-success',
              params: { tripId },
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Payment Failed', 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f9fafb' }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Trip Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <MaterialIcons name="location-on" size={16} color={theme.tint} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.summaryLabel, { color: theme.icon }]}>From</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{pickup}</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={16} color={theme.icon} />
            <View style={styles.summaryItem}>
              <MaterialIcons name="location-on" size={16} color={theme.tint} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.summaryLabel, { color: theme.icon }]}>To</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{dropoff}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.icon, opacity: 0.2 }]} />

          <View style={styles.summaryDetails}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.icon }]}>Date & Time</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {date}, {time}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.icon }]}>Passengers</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{passengerCount}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.icon }]}>Ride Type</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {rideType?.toUpperCase() || 'Economy'}
              </Text>
            </View>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Promo Code (Optional)</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[
                styles.promoInput,
                {
                  borderColor: theme.icon,
                  color: theme.text,
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                },
              ]}
              placeholder="Enter promo code"
              placeholderTextColor={theme.icon}
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: theme.tint }]}
              onPress={handleApplyPromo}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {promoCode === 'SAVE10' && (
            <Text style={[styles.promoHint, { color: '#10b981' }]}>
              💡 Tip: Try promo code "SAVE10"
            </Text>
          )}
        </View>

        {/* Fare Breakdown */}
        <View style={[styles.fareCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f9fafb' }]}>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.icon }]}>Base Fare</Text>
            <Text style={[styles.fareValue, { color: theme.text }]}>
              ${parseFloat(fare || '0').toFixed(2)}
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: '#10b981' }]}>Discount</Text>
              <Text style={[styles.fareValue, { color: '#10b981' }]}>
                -${discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: theme.icon, opacity: 0.2 }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: theme.tint }]}>
              ${finalFare.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Method</Text>
          <View style={styles.paymentMethodsContainer}>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  {
                    borderColor: paymentMethod === method.id ? theme.tint : theme.icon,
                    borderWidth: 2,
                    backgroundColor:
                      paymentMethod === method.id
                        ? colorScheme === 'dark'
                          ? '#1a3a4a'
                          : '#e0f2fe'
                        : colorScheme === 'dark'
                          ? '#2a2a2a'
                          : '#f5f5f5',
                  },
                ]}
                onPress={() => setPaymentMethod(method.id)}>
                <MaterialIcons
                  name={method.icon as any}
                  size={24}
                  color={paymentMethod === method.id ? theme.tint : theme.icon}
                />
                <Text
                  style={[
                    styles.paymentMethodName,
                    {
                      color: paymentMethod === method.id ? theme.tint : theme.text,
                      fontWeight: paymentMethod === method.id ? '600' : '500',
                    },
                  ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Card Details (shown if card method selected) */}
        {paymentMethod === 'card' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Card Details</Text>

            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: theme.icon,
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                },
              ]}>
              <MaterialIcons name="credit-card" size={20} color={theme.tint} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Card Number"
                placeholderTextColor={theme.icon}
                keyboardType="numeric"
                maxLength={16}
                value={cardNumber}
                onChangeText={setCardNumber}
              />
            </View>

            <View style={styles.row}>
              <View
                style={[
                  styles.inputContainer,
                  styles.halfInput,
                  {
                    borderColor: theme.icon,
                    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  },
                ]}>
                <MaterialIcons name="calendar-today" size={20} color={theme.tint} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="MM/YY"
                  placeholderTextColor={theme.icon}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  maxLength={5}
                />
              </View>

              <View
                style={[
                  styles.inputContainer,
                  styles.halfInput,
                  {
                    borderColor: theme.icon,
                    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  },
                ]}>
                <MaterialIcons name="lock" size={20} color={theme.tint} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="CVV"
                  placeholderTextColor={theme.icon}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                  value={cvv}
                  onChangeText={setCvv}
                />
              </View>
            </View>

            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: theme.icon,
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                },
              ]}>
              <MaterialIcons name="person" size={20} color={theme.tint} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Cardholder Name"
                placeholderTextColor={theme.icon}
                value={cardHolder}
                onChangeText={setCardHolder}
              />
            </View>
          </View>
        )}

        {/* Complete Payment Button */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            { backgroundColor: theme.tint, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={handleCompletePayment}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="lock" size={20} color="#fff" />
              <Text style={styles.completeButtonText}>
                Complete Payment - ${finalFare.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  summaryDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  applyButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  promoHint: {
    fontSize: 12,
    marginTop: 8,
  },
  fareCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 13,
  },
  fareValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentMethodsContainer: {
    gap: 10,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 12,
  },
  paymentMethodName: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
