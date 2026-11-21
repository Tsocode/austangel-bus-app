import { useRoute, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, useEffect } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function PaymentSuccessScreen() {
  const route = useRoute();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const params = route.params as any;
  const { tripId } = params || {};

  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 8,
      bounciness: 6,
    }).start();
  }, []);

  const handleBackToHome = () => {
    router.replace('/(travel)');
  };

  const handleViewTrip = () => {
    router.replace('/(travel)/monitor-trip');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <View style={[styles.successCircle, { backgroundColor: '#10b981' }]}>
            <MaterialIcons name="check" size={80} color="#fff" />
          </View>
        </Animated.View>

        {/* Success Message */}
        <Text style={[styles.successTitle, { color: theme.text }]}>Payment Successful!</Text>
        <Text style={[styles.successSubtitle, { color: theme.icon }]}>
          Your ride has been booked and driver is on the way.
        </Text>

        {/* Trip Details */}
        <View
          style={[
            styles.tripDetailsCard,
            { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f9fafb' },
          ]}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialIcons name="confirmation-number" size={20} color={theme.tint} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.labelText, { color: theme.icon }]}>Trip ID</Text>
                <Text style={[styles.valueText, { color: theme.text }]}>{tripId}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.icon, opacity: 0.2 }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialIcons name="schedule" size={20} color={theme.tint} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.labelText, { color: theme.icon }]}>Estimated ETA</Text>
                <Text style={[styles.valueText, { color: theme.text }]}>8-12 minutes</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.icon, opacity: 0.2 }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialIcons name="notifications-active" size={20} color={theme.tint} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.labelText, { color: theme.icon }]}>Notifications</Text>
                <Text style={[styles.valueText, { color: theme.text }]}>
                  You'll receive updates as your driver approaches
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View
          style={[
            styles.tipsCard,
            { backgroundColor: colorScheme === 'dark' ? '#1a3a4a' : '#ecfdf5' },
          ]}>
          <MaterialIcons name="lightbulb" size={20} color="#10b981" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.tipTitle, { color: '#10b981' }]}>Pro Tip</Text>
            <Text style={[styles.tipText, { color: theme.text }]}>
              Share your trip with a friend or family member for added safety
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.tint, borderWidth: 2 }]}
          onPress={handleBackToHome}>
          <MaterialIcons name="home" size={18} color={theme.tint} />
          <Text style={[styles.secondaryButtonText, { color: theme.tint }]}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.tint }]}
          onPress={handleViewTrip}>
          <MaterialIcons name="directions-car" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Track Trip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  successContainer: {
    marginBottom: 32,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  tripDetailsCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    flexDirection: 'row',
    flex: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  tipsCard: {
    width: '100%',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
