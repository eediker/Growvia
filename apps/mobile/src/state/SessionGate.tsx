import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useApp } from './AppProvider';
import { useMe } from './queries';
import { AppError } from '../domain/models';
import { Button, Card, Chip, ErrorNotice, Field, Loading, Page, Title, styles } from '../ui/components';

export function SessionGate({ children }: React.PropsWithChildren) {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const me = useMe();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({ mutationFn: () => app.login(email, password), onSuccess: () => setPassword('') });
  if (me.isPending) return <Page><Loading /></Page>;
  if (me.error && !(me.error instanceof AppError && me.error.code === 'unauthorized')) return <Page><ErrorNotice error={me.error} retry={() => void me.refetch()} /><Button title={t('backToDemo')} onPress={() => app.setMode('offline')} /></Page>;
  if (app.mode === 'online' && me.error) return <Page narrow><Title title={t('signInTitle')} subtitle={t('signInBody')} eyebrow="Kids Guide" />
    <View style={styles.wrap}>{(['tr', 'en'] as const).map(language => <Chip key={language} title={language === 'tr' ? 'Türkçe' : 'English'} selected={i18n.resolvedLanguage === language} onPress={() => void app.setLanguage(language)} />)}</View>
    <Card><Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={() => { if (email && password) login.mutate(); }} />
      {login.error && <ErrorNotice error={login.error} />}<Button title={t('signIn')} onPress={() => login.mutate()} busy={login.isPending} disabled={!email.trim() || !password} />
    </Card><Button variant="secondary" title={t('backToDemo')} onPress={() => app.setMode('offline')} /></Page>;
  return children;
}
