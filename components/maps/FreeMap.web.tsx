import { createElement, forwardRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { FreeMapController, FreeMapLine, FreeMapPoint, MapCoordinate } from './FreeMap.native';

type Props = {
  style: StyleProp<ViewStyle>;
  center: MapCoordinate;
  zoomDelta?: number;
  points?: FreeMapPoint[];
  lines?: FreeMapLine[];
  onPanDrag?: () => void;
  onMapReady?: () => void;
};

const FreeMap = forwardRef<FreeMapController, Props>(function FreeMap({ style, center }, _ref) {
  const bbox = `${center.longitude - 0.025},${center.latitude - 0.018},${center.longitude + 0.025},${center.latitude + 0.018}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${center.latitude},${center.longitude}`;
  return (
    <View style={style}>
      {createElement('iframe' as any, {
        title: 'OpenStreetMap',
        src,
        style: { width: '100%', height: '100%', border: 0 },
        loading: 'lazy',
      })}
    </View>
  );
});

export default FreeMap;
