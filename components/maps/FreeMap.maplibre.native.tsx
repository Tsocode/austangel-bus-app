import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  TransformRequestManager,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FreeMapController, FreeMapProps } from './FreeMap.native';

const EMPTY_FEATURES = { type: 'FeatureCollection', features: [] };
const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

TransformRequestManager.addHeader({
  id: 'austangel-openfreemap-user-agent',
  match: 'tiles.openfreemap.org',
  name: 'User-Agent',
  value: 'AustangelBusApp/1.0 (+https://austangel.com)',
});

function zoomFromDelta(delta: number) {
  return Math.max(2, Math.min(18, Math.log2(360 / Math.max(delta, 0.0001))));
}

const FreeMapMapLibre = forwardRef<FreeMapController, FreeMapProps>(function FreeMapMapLibre({
  style,
  center,
  zoomDelta = 0.03,
  points = [],
  lines = [],
  onPanDrag,
  onMapReady,
}, ref) {
  const cameraRef = useRef<CameraRef>(null);
  const lineData = lines.length ? {
    type: 'FeatureCollection',
    features: lines.filter((line) => line.coordinates.length > 1).map((line) => ({
      type: 'Feature',
      properties: { color: line.color, width: line.width },
      geometry: {
        type: 'LineString',
        coordinates: line.coordinates.map(({ latitude, longitude }) => [longitude, latitude]),
      },
    })),
  } : EMPTY_FEATURES;
  const pointData = points.length ? {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      properties: { color: point.color, title: point.title },
      geometry: { type: 'Point', coordinates: [point.coordinate.longitude, point.coordinate.latitude] },
    })),
  } : EMPTY_FEATURES;

  useImperativeHandle(ref, () => ({
    animateToRegion(region, duration = 350) {
      cameraRef.current?.easeTo({
        center: [region.longitude, region.latitude],
        zoom: zoomFromDelta(region.longitudeDelta),
        duration,
      });
    },
    fitToCoordinates(coordinates, options) {
      if (!coordinates.length) return;
      const longitudes = coordinates.map((point) => point.longitude);
      const latitudes = coordinates.map((point) => point.latitude);
      let west = Math.min(...longitudes);
      let east = Math.max(...longitudes);
      let south = Math.min(...latitudes);
      let north = Math.max(...latitudes);
      if (west === east) { west -= 0.003; east += 0.003; }
      if (south === north) { south -= 0.003; north += 0.003; }
      cameraRef.current?.fitBounds(
        [west, south, east, north],
        { padding: options?.edgePadding ?? { top: 60, right: 50, bottom: 80, left: 50 }, duration: options?.animated === false ? 0 : 450 },
      );
    },
  }), []);

  return (
    <View style={style}>
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={OPENFREEMAP_STYLE_URL}
        attribution
        attributionPosition={{ bottom: 8, right: 8 }}
        logo={false}
        compass
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction) onPanDrag?.();
        }}
        onDidFinishLoadingMap={onMapReady}>
        <Camera ref={cameraRef} initialViewState={{ center: [center.longitude, center.latitude], zoom: zoomFromDelta(zoomDelta) }} />
        <GeoJSONSource id="tracking-lines" data={lineData as any}>
          <Layer id="tracking-lines-layer" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'] }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
        </GeoJSONSource>
        <GeoJSONSource id="tracking-points" data={pointData as any}>
          <Layer id="tracking-points-circles" type="circle" paint={{ 'circle-color': ['get', 'color'], 'circle-radius': 9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }} />
          <Layer
            id="tracking-points-labels"
            type="symbol"
            layout={{ 'text-field': ['get', 'title'], 'text-size': 12, 'text-offset': [0, 1.25], 'text-anchor': 'top', 'text-optional': true }}
            paint={{ 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }}
          />
        </GeoJSONSource>
      </MapLibreMap>
    </View>
  );
});

export default FreeMapMapLibre;
