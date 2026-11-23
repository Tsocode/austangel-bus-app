import Constants from 'expo-constants';
import { createElement, forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type MapCoordinate = { latitude: number; longitude: number };
export type FreeMapPoint = {
  id: string;
  coordinate: MapCoordinate;
  title: string;
  color: string;
};
export type FreeMapLine = {
  id: string;
  coordinates: MapCoordinate[];
  color: string;
  width: number;
};
export type FreeMapController = {
  animateToRegion: (region: MapCoordinate & { latitudeDelta: number; longitudeDelta: number }, duration?: number) => void;
  fitToCoordinates: (coordinates: MapCoordinate[], options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }) => void;
};

export type FreeMapProps = {
  style: StyleProp<ViewStyle>;
  center: MapCoordinate;
  zoomDelta?: number;
  points?: FreeMapPoint[];
  lines?: FreeMapLine[];
  onPanDrag?: () => void;
  onMapReady?: () => void;
};

const FreeMap = forwardRef<FreeMapController, FreeMapProps>(function FreeMap(props, ref) {
  const expoGo = Constants.executionEnvironment === 'storeClient';
  const Renderer = expoGo
    ? require('./FreeMap.expo-go.native').default
    : require('./FreeMap.maplibre.native').default;
  return (
    createElement(Renderer, { ...props, ref })
  );
});

export default FreeMap;
