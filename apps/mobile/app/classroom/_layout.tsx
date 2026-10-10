import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';
export default function ClassroomLayout() {
  const { t } = useTranslation();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { minHeight: 70, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 11 } }}>
    <Tabs.Screen name="index" options={{ title: t('classTools.feed'), tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
    <Tabs.Screen name="announcements" options={{ title: t('classTools.announcements'), tabBarIcon: ({ color }) => <Icon name="bell" color={color} /> }} />
    <Tabs.Screen name="gallery" options={{ title: t('classTools.gallery'), tabBarIcon: ({ color }) => <Icon name="image" color={color} /> }} />
    <Tabs.Screen name="notes" options={{ title: t('classTools.notes'), tabBarIcon: ({ color }) => <Icon name="edit-3" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: t('worlds.profile'), tabBarStyle: { display: 'none' }, tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
    <Tabs.Screen name="medication" options={{ href: null }} />
  </Tabs>;
}
