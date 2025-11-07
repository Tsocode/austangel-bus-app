import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      navigation?.navigate?.('Login');
    } catch (error) {
      console.log('Legacy signup failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown signup error';
      Alert.alert('Signup Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign Up for Austangel</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Sign Up" onPress={handleSignup} />
      <Text onPress={() => navigation?.navigate?.('Login')} style={styles.link}>
        Already have an account? Log in
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10 },
  link: { color: 'blue', marginTop: 15, textAlign: 'center' }
});

export default SignupScreen;
