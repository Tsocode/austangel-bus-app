import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps): React.ReactNode {
  const handlePressIn = async (ev: any) => {
    if (Platform.OS === 'ios') {
      try {
        // Add a soft haptic feedback when pressing down on the tabs.
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics not available
        console.debug('Haptics not available');
      }
    }
    props.onPressIn?.(ev);
  };

  return (
    <PlatformPressable
      {...(props as any)}
      onPressIn={handlePressIn}
    />
  );
}
