// Cross-platform icon helper: maps SF Symbol-like names to Material (and Community) icons.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconSet = 'material' | 'community';
type IconSymbolName =
  | 'house.fill'
  | 'paperplane.fill'
  | 'location.fill'
  | 'steeringwheel'
  | 'person.crop.circle.badge.checkmark'
  | 'car.fill'
  | 'gearshape.fill'
  | 'clipboard.fill'
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right';

const MAPPING: Record<IconSymbolName, { set: IconSet; name: string }> = {
  'house.fill': { set: 'material', name: 'home' },
  'paperplane.fill': { set: 'material', name: 'send' },
  'location.fill': { set: 'material', name: 'near-me' },
  steeringwheel: { set: 'community', name: 'steering' }, // driver tools
  'person.crop.circle.badge.checkmark': { set: 'community', name: 'account-tie' }, // admin
  'car.fill': { set: 'material', name: 'directions-bus-filled' }, // track
  'gearshape.fill': { set: 'material', name: 'settings' },
  'clipboard.fill': { set: 'material', name: 'assignment-turned-in' }, // attendant
  'chevron.left.forwardslash.chevron.right': { set: 'material', name: 'code' },
  'chevron.right': { set: 'material', name: 'chevron-right' },
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mapping = MAPPING[name];
  if (mapping.set === 'community') {
    return <MaterialCommunityIcons color={color} size={size} name={mapping.name} style={style} />;
  }
  return <MaterialIcons color={color} size={size} name={mapping.name} style={style} />;
}
