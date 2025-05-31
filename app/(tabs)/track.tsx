import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { auth, db } from '../../services/firebase';

const TrackScreen = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, 'locations', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    });

    return () => unsub();
  }, []);

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={location} title="Bus Location" />
        </MapView>
      ) : (
        <Text style={styles.loading}>Loading bus location...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loading: { flex: 1, textAlign: 'center', marginTop: 50, fontSize: 18 }
});

export default TrackScreen;