import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../src/state/AppProvider';
import { SessionGate } from '../src/state/SessionGate';
import { colors } from '../src/ui/theme';
import '../src/i18n';
import { Opening } from '../src/ui/Opening';

export default function RootLayout() {
  return <SafeAreaProvider><AppProvider><StatusBar style="dark" /><Opening><SessionGate>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" /><Stack.Screen name="(tabs)" /><Stack.Screen name="classroom" /><Stack.Screen name="content/[id]" /><Stack.Screen name="child/new" options={{ presentation: 'modal' }} />
    </Stack>
  </SessionGate></Opening></AppProvider></SafeAreaProvider>;
}
