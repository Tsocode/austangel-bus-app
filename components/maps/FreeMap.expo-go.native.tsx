import { forwardRef, useImperativeHandle, useRef } from 'react';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import type { FreeMapController, FreeMapProps } from './FreeMap.native';

const ExpoGoFreeMap = forwardRef<FreeMapController, FreeMapProps>(function ExpoGoFreeMap({
  style,
  center,
  zoomDelta = 0.03,
  points = [],
  lines = [],
  onPanDrag,
  onMapReady,
  onPress,
}, ref) {
  const mapRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion(region, duration = 350) {
      mapRef.current?.animateToRegion(region, duration);
    },
    fitToCoordinates(coordinates, options) {
      if (!coordinates.length) return;
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: options?.edgePadding ?? { top: 60, right: 50, bottom: 80, left: 50 },
        animated: options?.animated ?? true,
      });
    },
  }), []);

  const initialRegion: Region = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: zoomDelta,
    longitudeDelta: zoomDelta,
  };

  return (
    <View style={style}>
      {/* Expo Go includes Apple Maps on iOS; no Google key or native build is needed for this preview. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPanDrag={onPanDrag}
        onMapReady={onMapReady}
        onPress={(event) => onPress?.(event.nativeEvent.coordinate)}
        showsCompass
        showsUserLocation>
        {lines.map((line) => line.coordinates.length > 1 ? (
          <Polyline
            key={line.id}
            coordinates={line.coordinates}
            strokeColor={line.color}
            strokeWidth={line.width}
            lineCap="round"
            lineJoin="round"
          />
        ) : null)}
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={point.coordinate}
            title={point.title}
            pinColor={point.color}
          />
        ))}
      </MapView>
    </View>
  );
});

export default ExpoGoFreeMap;
