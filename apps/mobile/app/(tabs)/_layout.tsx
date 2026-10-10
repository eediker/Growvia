import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';
export default function TabLayout() {
  const { t } = useTranslation();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, minHeight: 70, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="child" options={{ title: t('home'), tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
    <Tabs.Screen name="explore" options={{ title: t('activities'), tabBarIcon: ({ color }) => <Icon name="sun" color={color} /> }} />
    <Tabs.Screen name="stories" options={{ title: t('stories'), tabBarIcon: ({ color }) => <Icon name="book-open" color={color} /> }} />
    <Tabs.Screen name="guides" options={{ title: t('guides'), tabBarIcon: ({ color }) => <Icon name="book" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: t('worlds.profile'), tabBarStyle: { display: 'none' }, tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
  </Tabs>;
}
