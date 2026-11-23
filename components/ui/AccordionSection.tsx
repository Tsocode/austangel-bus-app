import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ReactNode, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  children: ReactNode;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  tintColor: string;
};

export function AccordionSection({
  title,
  subtitle,
  icon,
  children,
  borderColor,
  backgroundColor,
  textColor,
  mutedColor,
  tintColor,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  };

  return (
    <View style={[styles.card, { borderColor, backgroundColor }]}>
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${subtitle}`}>
        <View style={[styles.iconWrap, { backgroundColor: `${tintColor}18` }]}>
          <MaterialIcons name={icon} size={21} color={tintColor} />
        </View>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>{subtitle}</Text>
        </View>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={25}
          color={mutedColor}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, gap: 3 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
});
