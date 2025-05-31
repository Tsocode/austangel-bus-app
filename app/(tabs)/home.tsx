import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { auth } from '../../services/firebase';

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome to Austangel 👋</Text>
      <Text style={styles.subtext}>You're successfully logged in!</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtext: { fontSize: 16, color: '#666', marginBottom: 20 }
});