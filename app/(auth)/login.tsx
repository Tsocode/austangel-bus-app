import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { UserRole } from '@/models/user';
import { upsertUserProfile } from '@/services/firestore/users';
import { auth } from '@/services/firebase';

const ROLES: { label: string; value: UserRole; description: string }[] = [
  { label: 'Parent', value: 'parent', description: 'Track your child’s bus' },
  { label: 'Driver', value: 'driver', description: 'Update location & check-ins' },
  { label: 'Attendant', value: 'attendant', description: 'Check kids on/off the bus' },
  { label: 'Admin', value: 'admin', description: 'Manage buses & permissions' },
];

type AuthMode = 'signin' | 'signup';

export default function AuthLandingScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [role, setRole] = useState<UserRole>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasTypedPassword, setHasTypedPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

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
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const { firstName, lastName } = splitName(displayName);
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await upsertUserProfile({
          id: credential.user.uid,
          email: credential.user.email ?? email.trim(),
          role,
          firstName,
          lastName,
          displayName: displayName || credential.user.email || 'Austangel User',
          createdAt: Date.now(),
        });
      }

    } catch (error) {
      console.error('Auth failed:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'We could not complete the request. Please try again.';
      Alert.alert(mode === 'signin' ? 'Login Error' : 'Signup Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.form}>
        <Text style={styles.title}>Welcome to Austangel</Text>
        <Text style={styles.subtitle}>
          Sign in or create an account to manage buses, track rides, or check in students.
        </Text>

        <View style={styles.modeToggle}>
          {(['signin', 'signup'] as AuthMode[]).map((currentMode) => (
            <Pressable
              key={currentMode}
              style={[styles.modeButton, mode === currentMode && styles.modeButtonActive]}
              onPress={() => setMode(currentMode)}>
              <Text
                style={[
                  styles.modeButtonText,
                  mode === currentMode && styles.modeButtonTextActive,
                ]}>
                {currentMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Select your role</Text>
        <View style={styles.roleRow}>
          {ROLES.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.roleChip, role === option.value && styles.roleChipActive]}
              onPress={() => setRole(option.value)}>
              <Text
                style={[
                  styles.roleChipText,
                  role === option.value && styles.roleChipTextActive,
                ]}>
                {option.label}
              </Text>
              {mode === 'signup' ? (
                <Text style={styles.roleHint}>{option.description}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>

        {mode === 'signup' && (
          <TextInput
            placeholder="Full name"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />
        )}
        {mode === 'signup' && fieldErrors.displayName ? (
          <Text style={styles.errorText}>{fieldErrors.displayName}</Text>
        ) : null}

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          style={styles.input}
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
        />
        {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setHasTypedPassword(true);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            style={[styles.input, styles.passwordInput]}
            autoCorrect={false}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'password'}
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <MaterialIcons
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={22}
              color="#6b7280"
            />
          </Pressable>
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

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  form: {
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
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
    borderColor: '#d0d5dd',
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
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
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
