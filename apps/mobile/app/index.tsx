import React from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMe } from '../src/state/queries';
import { useApp } from '../src/state/AppProvider';
import { assets } from '../src/ui/assets';
import { Button, Card, Icon, Page, Title, Txt, styles } from '../src/ui/components';
import { colors } from '../src/ui/theme';

export default function HubScreen() {
  const { t, i18n } = useTranslation();
  const user = useMe();
  const app = useApp();
  const wide = useWindowDimensions().width >= 760;
  return <Page narrow>
    <View style={styles.row}><Title title={t('hello', { name: user.data?.name || t('worlds.friend') })} subtitle={t('worlds.choose')} />
      <Button variant="ghost" icon="settings" title={t('settings')} onPress={() => router.push('/settings')} /></View>
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
      {(['child', 'classroom'] as const).map(world => <Pressable key={world} accessibilityRole="button" accessibilityLabel={t(`worlds.${world}`)}
        onPress={() => router.push(world === 'child' ? '/child' : '/classroom')}
        style={({ pressed }) => ({ flex: 1, borderRadius: 26, overflow: 'hidden', backgroundColor: world === 'child' ? colors.primary : colors.accent, opacity: pressed ? 0.85 : 1 })}>
        {i18n.resolvedLanguage === 'tr' ? <Image source={assets[world]} style={{ width: '100%', aspectRatio: 0.84 }} resizeMode="cover" accessible={false} /> : <>
          <View style={{ width: '100%', aspectRatio: 1.29, overflow: 'hidden' }}><Image source={assets[world]} style={{ width: '100%', aspectRatio: 0.84 }} resizeMode="cover" accessible={false} /></View>
          <View style={{ padding: 24, gap: 8 }}><View style={styles.row}><Txt style={{ color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '700' }}>{t(`worlds.${world}`)}</Txt><Icon name="arrow-right" color="#fff" size={30} /></View>
            <Txt style={{ color: '#fff' }}>{t(`worlds.${world}Body`)}</Txt></View>
        </>}
      </Pressable>)}
    </View>
    <Card><Txt style={{ textAlign: 'center', fontStyle: 'italic' }}>{t('worlds.quote')}</Txt></Card>
    {app.mode === 'offline' && <Txt style={styles.meta}>{t('sample')}</Txt>}
  </Page>;
}
