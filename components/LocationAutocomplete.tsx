import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GOOGLE_MAPS_LEGACY_API_KEY, GOOGLE_PLACES_API_KEY, MAPBOX_TOKEN, USE_GOOGLE_MAPS } from '@/constants/mapProvider';
import { searchOpenMapPlaces } from '@/services/maps/openMapGeocoding';

export type PlaceResult = { latitude: number; longitude: number; address: string; title: string; placeId?: string };

/** Debounced Google Places or free OpenStreetMap-based location search. */
export function LocationAutocomplete({
  label, placeholder, value, onChangeText, onSelect,
}: {
  label?: string; placeholder: string; value: string; onChangeText: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
}) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const selectedValue = useRef('');
  const newSessionToken = () => `austangel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sessionToken = useRef(newSessionToken());

  useEffect(() => {
    const query = value.trim();
    const id = ++requestId.current;
    if (query === selectedValue.current) { setResults([]); return; }
    if (query.length < 3) { setResults([]); sessionToken.current = newSessionToken(); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const googleKey = GOOGLE_PLACES_API_KEY || GOOGLE_MAPS_LEGACY_API_KEY;
        const mapboxToken = MAPBOX_TOKEN;
        let places: PlaceResult[] = [];
        if (googleKey) {
          const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text',
            },
            body: JSON.stringify({ input: query, sessionToken: sessionToken.current }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message ?? `Google Places rejected the request (${response.status})`);
          places = (data.suggestions ?? []).slice(0, 6).flatMap((item: any) => {
            const prediction = item.placePrediction;
            if (!prediction?.placeId) return [];
            return [{
              title: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
              address: prediction.text?.text ?? '', latitude: Number.NaN, longitude: Number.NaN,
              placeId: prediction.placeId,
            }];
          });
        } else if (mapboxToken) {
          const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=6&access_token=${encodeURIComponent(mapboxToken)}`);
          if (!response.ok) throw new Error(`Mapbox search failed (${response.status})`);
          const data = await response.json();
          places = (data.features ?? []).map((item: any) => ({
            title: item.properties?.name ?? item.properties?.full_address,
            address: item.properties?.full_address ?? item.properties?.name,
            longitude: item.geometry.coordinates[0], latitude: item.geometry.coordinates[1],
          }));
        } else {
          places = await searchOpenMapPlaces(query);
        }
        places = places.filter((place) => place.placeId || (Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && (place.latitude !== 0 || place.longitude !== 0)));
        if (!places.length && (googleKey || mapboxToken)) places = await searchOpenMapPlaces(query);
        if (requestId.current === id) setResults(places);
      } catch (error) {
        console.warn('Location autocomplete failed', error);
        try {
          const fallback = await searchOpenMapPlaces(query);
          if (requestId.current === id) setResults(fallback);
        } catch (fallbackError) {
          console.warn('Open map location fallback failed', fallbackError);
          if (requestId.current === id) setResults([]);
        }
      } finally { if (requestId.current === id) setLoading(false); }
    }, USE_GOOGLE_MAPS ? 300 : 700);
    return () => clearTimeout(timer);
  }, [value]);

  return <View style={styles.wrap}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={styles.inputRow}>
      <MaterialIcons name="search" size={20} color="#475569" />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#64748b" style={styles.input} autoCorrect={false} />
      {loading ? <ActivityIndicator size="small" /> : value ? <Pressable accessibilityLabel="Clear search" onPress={() => { onChangeText(''); setResults([]); }} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable> : null}
    </View>
    {results.length > 0 ? <View style={styles.dropdown}>{results.map((place, index) => <Pressable
      key={`${place.placeId ?? `${place.latitude}-${place.longitude}`}-${index}`} style={styles.result} onPress={async () => {
        let resolvedPlace = place;
        const placesKey = GOOGLE_PLACES_API_KEY || GOOGLE_MAPS_LEGACY_API_KEY;
        if (place.placeId && placesKey) {
          setLoading(true);
          try {
            const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place.placeId)}?sessionToken=${encodeURIComponent(sessionToken.current)}`, {
              headers: { 'X-Goog-Api-Key': placesKey, 'X-Goog-FieldMask': 'location,formattedAddress' },
            });
            const details = await response.json();
            if (!response.ok || !details.location) throw new Error(details.error?.message ?? 'Google Place Details returned no coordinates.');
            resolvedPlace = { ...place, latitude: details.location.latitude, longitude: details.location.longitude, address: details.formattedAddress ?? place.address };
          } catch (error) {
            console.warn('Google Place Details failed; resolving with OpenStreetMap.', error);
            try {
              const fallback = await searchOpenMapPlaces(place.address || place.title, 1);
              if (fallback[0]) resolvedPlace = fallback[0];
            } catch (fallbackError) {
              console.warn('Could not resolve selected place coordinates.', fallbackError);
            }
          } finally {
            setLoading(false);
            sessionToken.current = newSessionToken();
          }
        }
        selectedValue.current = resolvedPlace.address; onChangeText(resolvedPlace.address); setResults([]); onSelect(resolvedPlace);
      }}>
      <Text numberOfLines={1} style={styles.title}>{place.title}</Text>
      <Text numberOfLines={1} style={styles.address}>{place.address}</Text>
    </Pressable>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { zIndex: 30 }, label: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 6 },
  inputRow: { minHeight: 50, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 48, fontSize: 16, color: '#0f172a' }, clear: { width: 34, height: 40, justifyContent: 'center', alignItems: 'center' }, clearText: { fontSize: 26, color: '#334155' },
  dropdown: { position: 'absolute', top: 56, left: 0, right: 0, zIndex: 50, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', elevation: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8 },
  result: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cbd5e1' }, title: { fontSize: 15, fontWeight: '600', color: '#0f172a' }, address: { fontSize: 13, color: '#475569', marginTop: 2 },
});
