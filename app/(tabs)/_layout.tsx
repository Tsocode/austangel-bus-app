import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';

type Role = 'parent' | 'driver' | 'admin';

const TAB_CONFIG = {
  track: { title: 'Track', icon: 'location.fill' as const },
  'driver-tools': { title: 'Driver', icon: 'car.fill' as const },
  admin: { title: 'Admin', icon: 'gearshape.fill' as const },
  home: { title: 'Home', icon: 'house.fill' as const },
  explore: { title: 'Explore', icon: 'paperplane.fill' as const },
};

const VISIBLE_TABS: Record<Role, Array<keyof typeof TAB_CONFIG>> = {
  parent: ['track', 'home', 'explore'],
  driver: ['track', 'driver-tools', 'home'],
  admin: ['track', 'admin', 'home'],
};

const HIDDEN_TABS: string[] = ['index'];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { role } = useAuthContext();
  const currentRole: Role = (role ?? 'parent') as Role;

  const visibleTabs = VISIBLE_TABS[currentRole];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
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
                ? ({ color }) => <IconSymbol size={28} name={config.icon!} color={color} />
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
