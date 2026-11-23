import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';

import { SchoolRole, TravelRole, UserRole } from '@/models/user';
import { upsertUserProfile } from '@/services/firestore/users';
import { auth } from '@/services/firebase';
import { useAuthContext } from '@/providers/AuthProvider';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';

const SCHOOL_ROLES: { label: string; value: UserRole; description: string }[] = [
  { label: 'Parent', value: 'parent', description: 'Track your child’s bus' },
  { label: 'Driver', value: 'driver', description: 'Update location & check-ins' },
  { label: 'Attendant', value: 'attendant', description: 'Check kids on/off the bus' },
];

const TRAVEL_ROLES: { label: string; value: UserRole; description: string }[] = [
  { label: 'Passenger', value: 'passenger', description: 'Book and track rides' },
  { label: 'Driver', value: 'driver', description: 'Offer rides to passengers' },
];

type AuthMode = 'signin' | 'signup';
const SUBMIT_TIMEOUT_MS = 20_000;

function withTimeout<T>(operation: Promise<T>, message: string, timeoutMs = SUBMIT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    operation.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

export default function AuthLandingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const { primaryService, switchService } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;
  const selectedService = params.service === 'travel' || params.service === 'school' ? params.service : primaryService ?? 'school';
  const [mode, setMode] = useState<AuthMode>('signin');
  const [role, setRole] = useState<UserRole>(selectedService === 'travel' ? 'passenger' : 'parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasTypedPassword, setHasTypedPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

  // Get roles based on service type
  const ROLES = selectedService === 'travel' ? TRAVEL_ROLES : SCHOOL_ROLES;

  const splitName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { firstName: undefined, lastName: undefined };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: undefined };
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const getPasswordChecks = (value: string) => ({
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
  });

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string; displayName?: string } = {};
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = displayName.trim();
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (mode === 'signup' && !trimmedName) {
      nextErrors.displayName = 'Full name is required.';
    }
    if (!trimmedPassword) {
      nextErrors.password = 'Password is required.';
    } else if (mode === 'signup') {
      const checks = getPasswordChecks(trimmedPassword);
      if (!checks.length || !checks.upper || !checks.lower || !checks.number) {
        nextErrors.password = 'Use 8+ chars with upper, lower, and a number.';
      }
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing information', 'Enter both email and password to continue.');
      return;
    }
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      Keyboard.dismiss();
      if (mode === 'signin') {
        await withTimeout(
          signInWithEmailAndPassword(auth, email.trim(), password),
          'Sign-in timed out. Check your connection and make sure Firebase is reachable.'
        );
        // Profile loading and service saving happen in AuthProvider; they must
        // not hold this screen open after Firebase Authentication succeeds.
        await switchService?.(selectedService);
        router.replace(selectedService === 'travel' ? '/(travel)' : '/(tabs)');
      } else {
        const { firstName, lastName } = splitName(displayName);
        const credential = await withTimeout(
          createUserWithEmailAndPassword(auth, email.trim(), password),
          'Account creation timed out. Check your connection and make sure Firebase is reachable.'
        );
        await withTimeout(upsertUserProfile({
          id: credential.user.uid,
          email: credential.user.email ?? email.trim(),
          role,
          primaryService: selectedService,
          schoolRole: selectedService === 'travel' ? undefined : role as SchoolRole,
          travelRole: selectedService === 'travel' ? role as TravelRole : undefined,
          firstName,
          lastName,
          displayName: displayName || credential.user.email || 'Austangel User',
          createdAt: Date.now(),
        }), 'Profile setup timed out. Your account was created, but setup could not finish.', 15_000);
        await switchService?.(selectedService);
        router.replace(selectedService === 'travel' ? '/(travel)' : '/(tabs)');
      }

    } catch (error) {
      const authError = error as { code?: string; message?: string };
      const messages: Record<string, string> = {
        'auth/user-not-found': 'No account was found for this email. Choose Create Account to register it first.',
        'auth/invalid-credential': 'We could not sign you in. Check your email and password, or choose Create Account if you are new.',
        'auth/wrong-password': 'That password is incorrect. Check it and try again.',
        'auth/email-already-in-use': 'An account already uses this email. Switch to Sign In.',
        'auth/weak-password': 'Choose a stronger password with at least 8 characters, including uppercase, lowercase, and a number.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.',
      };
      const message = (authError.code && messages[authError.code]) ||
        authError.message || 'We could not complete the request. Please try again.';
      Alert.alert(mode === 'signin' ? 'Sign-in failed' : 'Account creation failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isWideWeb && styles.webScrollContent]}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={[styles.form, isWideWeb && styles.webForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/select-service')}
          accessibilityRole="button"
          accessibilityLabel="Go back to service selection">
          <MaterialIcons name="arrow-back" size={22} color={theme.tint} />
          <Text style={[styles.backButtonText, { color: theme.tint }]}>Back to Services</Text>
        </Pressable>

        <Text style={[styles.title, { color: theme.text }]}>Welcome to Austangel</Text>
        <View style={[styles.servicePill, { backgroundColor: theme.surfaceMuted }]}><Text style={[styles.servicePillText, { color: theme.tint }]}>{selectedService === 'travel' ? 'Travel & Rides' : 'School Transport'}</Text><Pressable onPress={() => router.replace('/(auth)/select-service')}><Text style={[styles.changeService, { color: theme.tint }]}>Change Service</Text></Pressable></View>
        <Text style={[styles.subtitle, { color: theme.icon }]}>
          Sign in or create an account to get started.
        </Text>

        <View style={styles.modeToggle}>
          {(['signin', 'signup'] as AuthMode[]).map((currentMode) => (
            <Pressable
              key={currentMode}
              style={[styles.modeButton, { borderColor: theme.border }, mode === currentMode && [styles.modeButtonActive, { backgroundColor: theme.tint, borderColor: theme.tint }] ]}
              onPress={() => setMode(currentMode)}>
              <Text
                style={[
                  styles.modeButtonText,
                  { color: theme.icon },
                  mode === currentMode && styles.modeButtonTextActive,
                ]}>
                {currentMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'signup' && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Choose your role</Text>
            <View style={styles.roleRow}>
              {ROLES.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.roleChip, { borderColor: theme.border }, role === option.value && [styles.roleChipActive, { backgroundColor: theme.surfaceMuted, borderColor: theme.tint }] ]}
                  onPress={() => setRole(option.value)}>
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: theme.icon },
                      role === option.value && [styles.roleChipTextActive, { color: theme.tint }],
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {mode === 'signup' && (
          <>
            <Text style={[styles.infoText, { color: theme.tint, backgroundColor: theme.surfaceMuted, borderLeftColor: theme.tint }]}>
              Admin access must be granted by an administrator. New accounts cannot grant themselves admin privileges.
            </Text>
            <View>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Full Name
              </Text>
              <TextInput
                placeholder="e.g., John Doe"
                value={displayName}
                onChangeText={setDisplayName}
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholderTextColor="#9ca3af"
              />
            </View>
            {mode === 'signup' && fieldErrors.displayName ? (
              <Text style={styles.errorText}>{fieldErrors.displayName}</Text>
            ) : null}
          </>
        )}

        <View>
          <Text style={[styles.inputLabel, { color: theme.text }]}>
            Email Address
          </Text>
          <TextInput
            placeholder="e.g., you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            autoCorrect={false}
            textContentType="username"
            autoComplete="email"
            placeholderTextColor="#9ca3af"
          />
        </View>
        {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}

        <View>
          <Text style={[styles.inputLabel, { color: theme.text }]}>
            Password
          </Text>
          <View style={styles.passwordWrapper}>
          <TextInput
            placeholder={mode === 'signup' ? 'e.g., SecurePass123' : 'Enter your password'}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setHasTypedPassword(true);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            style={[styles.input, styles.passwordInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            autoCorrect={false}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'password'}
            placeholderTextColor="#9ca3af"
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <MaterialIcons
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={22}
              color={theme.icon}
            />
          </Pressable>
          </View>
        </View>
        {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
        {mode === 'signup' && hasTypedPassword ? (
          <View style={styles.passwordRules}>
            {(() => {
              const checks = getPasswordChecks(password.trim());
              return (
                <>
                  <Text style={[styles.ruleText, checks.length ? styles.rulePass : styles.ruleFail]}>
                    • 8+ characters
                  </Text>
                  <Text style={[styles.ruleText, checks.upper ? styles.rulePass : styles.ruleFail]}>
                    • Uppercase letter
                  </Text>
                  <Text style={[styles.ruleText, checks.lower ? styles.rulePass : styles.ruleFail]}>
                    • Lowercase letter
                  </Text>
                  <Text style={[styles.ruleText, checks.number ? styles.rulePass : styles.ruleFail]}>
                    • Number
                  </Text>
                </>
              );
            })()}
          </View>
        ) : null}

        <Pressable style={[styles.submitButton, { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? mode === 'signin'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
          </Text>
        </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.pageGutter,
    paddingVertical: 28,
  },
  form: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: Layout.radius.panel,
    borderWidth: 1,
    padding: 22,
    gap: 14,
  },
  webScrollContent: { paddingVertical: 44 },
  webForm: { maxWidth: 600, padding: 32 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  servicePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#eff6ff', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10, marginBottom: 10 },
  servicePillText: { color: '#1e3a8a', fontSize: 14, fontWeight: '600' },
  changeService: { color: '#1d4ed8', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DCE6E8',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roleChipActive: {
    backgroundColor: '#e0ecff',
    borderColor: '#1d4ed8',
  },
  roleChipText: {
    fontWeight: '600',
    color: '#334155',
  },
  roleChipTextActive: {
    color: '#1d4ed8',
  },
  roleHint: {
    fontSize: 12,
    color: '#64748b',
  },
  infoText: {
    fontSize: 13,
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#14232B',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 6,
  },
  passwordRules: {
    gap: 4,
    marginTop: 6,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 12,
  },
  rulePass: {
    color: '#16a34a',
  },
  ruleFail: {
    color: '#b45309',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -11,
  },
  submitButton: {
    borderRadius: Layout.radius.control,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
