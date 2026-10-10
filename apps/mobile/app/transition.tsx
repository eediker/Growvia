import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, Icon, Page, Title } from '../src/ui/components';
export default function TransitionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const open = () => router.replace({ pathname: '/content/[id]', params: { id, returnTo: 'classroom' } });
  useEffect(() => { if (!id) { router.replace('/classroom'); return; } const timer = setTimeout(() => router.replace({ pathname: '/content/[id]', params: { id, returnTo: 'classroom' } }), 900); return () => clearTimeout(timer); }, [id]);
  return <Page narrow><Card><Icon name="home" size={44} /><Title title={t('continueHome')} subtitle={t('worlds.transition')} /><Button title={t('startActivity')} onPress={open} /></Card></Page>;
}
