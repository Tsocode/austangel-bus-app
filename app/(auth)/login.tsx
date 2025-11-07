import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  Alert,
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
  { label: 'Admin', value: 'admin', description: 'Manage buses & permissions' },
];

type AuthMode = 'signin' | 'signup';

export default function AuthLandingScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [role, setRole] = useState<UserRole>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing information', 'Enter both email and password to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await upsertUserProfile({
          id: credential.user.uid,
          email: credential.user.email ?? email.trim(),
          role,
          displayName: displayName || credential.user.email || 'Austangel User',
          createdAt: Date.now(),
        });
      }

      router.replace('/(tabs)/track');
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

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

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
