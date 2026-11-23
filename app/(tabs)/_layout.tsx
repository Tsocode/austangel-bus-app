import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';

type Role = 'parent' | 'driver' | 'admin' | 'attendant';

const TAB_CONFIG = {
  track: { title: 'Track', icon: 'location.fill' as const },
  'driver-tools': { title: 'Driver', icon: 'steeringwheel' as const },
  attendant: { title: 'Attendant', icon: 'clipboard.fill' as const },
  admin: { title: 'Admin', icon: 'person.crop.circle.badge.checkmark' as const },
  home: { title: 'Home', icon: 'house.fill' as const },
  explore: { title: 'Explore', icon: 'paperplane.fill' as const },
  settings: { title: 'Settings', icon: 'gearshape.fill' as const },
};

const VISIBLE_TABS: Record<Role, (keyof typeof TAB_CONFIG)[]> = {
  parent: ['track', 'home', 'explore', 'settings'],
  driver: ['track', 'driver-tools', 'home', 'settings'],
  attendant: ['track', 'attendant', 'home', 'settings'],
  admin: ['track', 'admin', 'home', 'settings'],
};

const HIDDEN_TABS: string[] = ['index', 'help'];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { role } = useAuthContext();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Layout.desktopBreakpoint;
  const currentRole: Role = (role ?? 'parent') as Role;

  const visibleTabs = VISIBLE_TABS[currentRole];

  return (
    <Tabs
      tabBarPosition={isWideWeb ? 'left' : 'bottom'}
      tabBarVariant={isWideWeb ? 'material' : undefined}
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarLabelPosition: isWideWeb ? 'beside-icon' : 'below-icon',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
        tabBarButton: HapticTab as any,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingTop: 6,
          },
          android: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            elevation: 10,
          },
          web: isWideWeb
            ? {
                width: 232,
                backgroundColor: theme.surface,
                borderRightColor: theme.border,
                borderRightWidth: 1,
                borderTopWidth: 0,
                paddingTop: 18,
              }
            : {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                borderTopWidth: 1,
                paddingTop: 6,
              },
        }),
      }}>
      {visibleTabs.map((name) => {
        const config = TAB_CONFIG[name];
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: config.title,
              tabBarIcon: config.icon
                ? ({ color }) => (
                    <IconSymbol
                      size={isWideWeb ? 22 : 24}
                      name={config.icon!}
                      color={typeof color === 'string' ? color : theme.tint}
                    />
                  )
                : undefined,
            }}
          />
        );
      })}

      {HIDDEN_TABS.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
