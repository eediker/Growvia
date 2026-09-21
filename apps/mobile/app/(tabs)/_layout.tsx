import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

export default function TabLayout() {
  const { t } = useTranslation();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, minHeight: 70, paddingTop: 8, paddingBottom: 12 }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color }) => <Icon name="sun" color={color} /> }} />
    <Tabs.Screen name="explore" options={{ title: t('discover'), tabBarIcon: ({ color }) => <Icon name="compass" color={color} /> }} />
    <Tabs.Screen name="classroom" options={{ title: t('classroom'), tabBarIcon: ({ color }) => <Icon name="users" color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: t('settings'), tabBarIcon: ({ color }) => <Icon name="sliders" color={color} /> }} />
  </Tabs>;
}
