import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
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
};

const VISIBLE_TABS: Record<Role, (keyof typeof TAB_CONFIG)[]> = {
  parent: ['track', 'home', 'explore'],
  driver: ['track', 'driver-tools', 'home'],
  attendant: ['track', 'attendant', 'home'],
  admin: ['track', 'admin', 'home'],
};

const HIDDEN_TABS: string[] = ['index', 'help', 'settings'];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { role } = useAuthContext();
  const currentRole: Role = (role ?? 'parent') as Role;

  const visibleTabs = VISIBLE_TABS[currentRole];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: theme.background,
            borderTopColor: theme.icon,
          },
          default: {
            backgroundColor: theme.background,
            borderTopColor: theme.icon,
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
