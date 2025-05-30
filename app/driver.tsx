

import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function DriverScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const updateLocation = async () => {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        const user = auth.currentUser;
        if (user) {
          await setDoc(doc(db, 'locations', user.uid), {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // Update location immediately, then every 10 seconds
      await updateLocation();
      const intervalId = setInterval(updateLocation, 10000);

      return () => clearInterval(intervalId);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Location Sharing</Text>
      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : location ? (
        <Text>
          Latitude: {location.coords.latitude}{'\n'}
          Longitude: {location.coords.longitude}
        </Text>
      ) : (
        <Text>Fetching location...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  error: { color: 'red', marginTop: 10 },
});