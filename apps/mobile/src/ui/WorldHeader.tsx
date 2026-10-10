import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, styles } from './components';

export function WorldHeader({ world }: { world: 'child' | 'classroom' }) {
  const { t } = useTranslation();
  return <View style={[styles.row, { flexWrap: 'wrap' }]}>
    <Button variant="ghost" icon="grid" title={t('worlds.hub')} onPress={() => router.replace('/')} />
    <Button variant="secondary" title={t(world === 'child' ? 'worlds.toClass' : 'worlds.toChild')}
      onPress={() => router.replace(world === 'child' ? '/classroom' : '/child')} />
  </View>;
}
