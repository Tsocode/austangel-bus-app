import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { createElement, useState } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LocationAutocomplete, PlaceResult } from '@/components/LocationAutocomplete';
import { Layout } from '@/constants/Layout';

/**
 * Web map using OpenStreetMap's embeddable map; native tracking uses track.tsx.
 */
export default function TrackScreenWeb() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [query, setQuery] = useState('');
  const center = place ?? { latitude: 6.5244, longitude: 3.3792 };
  const markerQuery = place ? `&marker=${center.latitude},${center.longitude}` : '';
  const bbox = `${center.longitude - 0.025},${center.latitude - 0.018},${center.longitude + 0.025},${center.latitude + 0.018}`;
  const googleWebKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
  const googleMapUrl = `https://www.google.com/maps/embed/v1/${place ? 'place' : 'view'}?key=${encodeURIComponent(googleWebKey ?? '')}${place ? `&q=${encodeURIComponent(`${center.latitude},${center.longitude}`)}` : `&center=${center.latitude},${center.longitude}&zoom=12`}`;
  const osmMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik${markerQuery}`;
  const mapUrl = googleWebKey ? googleMapUrl : osmMapUrl;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Bus Location Map</Text>
        <Text style={[styles.description, { color: colors.tabIconDefault }]}>Search a place to view it on the map.</Text>
        <LocationAutocomplete placeholder="Search destination or location" value={query}
          onChangeText={(value) => { setQuery(value); if (value !== place?.address) setPlace(null); }}
          onSelect={(selected) => { setPlace(selected); setQuery(selected.address); }} />
        <View style={styles.mapFrame}>
          {createElement('iframe' as any, {
            title: 'OpenStreetMap location map', src: mapUrl,
            style: { width: '100%', height: '100%', border: 0 },
            loading: 'lazy', referrerPolicy: 'no-referrer-when-downgrade',
          })}
        </View>
        <Text style={[styles.attribution, { color: colors.tabIconDefault }]}>{googleWebKey ? 'Google Maps' : 'Map data © OpenStreetMap contributors'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { width: '100%', maxWidth: Layout.pageWidth, alignSelf: 'center', flex: 1, paddingHorizontal: Layout.pageGutter, paddingVertical: 28, gap: 14 },
  icon: { marginBottom: 16, opacity: 0.6 },
  title: {
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 0,
    textAlign: 'left',
  },
  description: {
    fontSize: 15,
    textAlign: 'left',
    marginBottom: 0,
  },
  hint: { fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  mapFrame: { flex: 1, minHeight: 420, borderRadius: Layout.radius.card, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1' },
  attribution: { fontSize: 13 },
});
