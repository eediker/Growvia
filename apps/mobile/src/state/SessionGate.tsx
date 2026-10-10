import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useApp } from './AppProvider';
import { useMe } from './queries';
import { AppError } from '../domain/models';
import { Button, Card, Chip, ErrorNotice, Field, Loading, Page, Title, Txt, styles } from '../ui/components';
import { SunLogo } from '../ui/SunLogo';

export function SessionGate({ children }: React.PropsWithChildren) {
  const app = useApp();
  const me = useMe();
  // Restore and refresh the saved session before deciding whether to show auth.
  if (me.isPending) return <Page><Loading /></Page>;
  if (app.mode === 'online' && me.error instanceof AppError && me.error.code === 'unauthorized') return <AuthPages />;
  if (me.error) return <SessionError error={me.error} retry={() => void me.refetch()} />;
  return children;
}

function SessionError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useTranslation();
  const app = useApp();
  return <Page><ErrorNotice error={error} retry={retry} /><Button title={t('backToDemo')} onPress={() => app.setMode('offline')} /></Page>;
}

type AuthPage = 'login' | 'signup' | 'confirmation';

function AuthPages() {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const [page, setPage] = useState<AuthPage>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const login = useMutation({ mutationFn: () => app.login(email, password), onSuccess: () => setPassword('') });
  const signup = useMutation({
    mutationFn: () => app.signup(name, email, password),
    onSuccess: result => {
      setPassword(''); setRepeatPassword('');
      if (result === 'confirmationRequired') setPage('confirmation');
    },
  });
  const resend = useMutation({ mutationFn: () => app.resendConfirmation(email) });
  const busy = login.isPending || signup.isPending || resend.isPending;
  const navigate = (next: AuthPage) => {
    if (busy) return;
    setPassword(''); setRepeatPassword(''); setValidation(null);
    login.reset(); signup.reset(); resend.reset(); setPage(next);
  };
  const submit = () => {
    if (busy || !email.trim() || !password) return;
    setValidation(null);
    if (page === 'signup') {
      if (password !== repeatPassword) { setValidation('passwordMismatch'); return; }
      signup.mutate();
    } else login.mutate();
  };
  const title = { login: 'signInTitle', signup: 'signUpTitle', confirmation: 'checkEmailTitle' }[page];
  const body = { login: 'signInBody', signup: 'signUpBody', confirmation: 'checkEmailBody' }[page];

  return <Page narrow>
    <View style={{ alignItems: 'center', gap: 18, paddingVertical: 20 }}><SunLogo /><Txt style={{ fontSize: 30, lineHeight: 36, fontWeight: '700' }}>Kids Guide</Txt><Txt>{t('worlds.twoWorlds')}</Txt></View>
    <Title title={t(title)} subtitle={t(body, { email: email.trim() })} eyebrow="Kids Guide" />
    <View style={styles.wrap}>{(['tr', 'en'] as const).map(language =>
      <Chip key={language} title={language === 'tr' ? 'Türkçe' : 'English'} selected={i18n.resolvedLanguage === language} onPress={() => void app.setLanguage(language)} />
    )}</View>
    {page === 'confirmation' ? <Card>
      <Txt>{t('confirmationNote')}</Txt>
      {resend.error && <ErrorNotice error={resend.error} />}
      {resend.isSuccess && <Txt accessibilityRole="alert">{t('confirmationResent')}</Txt>}
      <Button title={t('signIn')} disabled={busy} onPress={() => navigate('login')} />
      <Button variant="secondary" title={t('resendConfirmation')} busy={resend.isPending} disabled={resend.isSuccess} onPress={() => resend.mutate()} />
    </Card> : <Card>
      {page === 'signup' && <Field label={t('yourName')} value={name} onChangeText={setName} maxLength={100} autoComplete="name" editable={!busy} />}
      <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy} />
      <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={page === 'signup' ? 'new-password' : 'current-password'} editable={!busy} onSubmitEditing={page === 'login' ? submit : undefined} />
      {page === 'signup' && <>
        <Txt style={styles.meta}>{t('passwordHint')}</Txt>
        <Field label={t('repeatPassword')} value={repeatPassword} onChangeText={setRepeatPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} onSubmitEditing={submit} />
      </>}
      {validation && <Txt accessibilityRole="alert">{t(validation)}</Txt>}
      {(page === 'login' ? login.error : signup.error) && <ErrorNotice error={page === 'login' ? login.error : signup.error} />}
      {login.error instanceof AppError && login.error.code === 'emailUnconfirmed' && page === 'login' &&
        <Button variant="secondary" title={t('checkEmailTitle')} onPress={() => navigate('confirmation')} />}
      <Button title={t(page === 'signup' ? 'signUp' : 'signIn')} onPress={submit} busy={busy}
        disabled={!email.trim() || !password || (page === 'signup' && (!name.trim() || !repeatPassword))} />
      <Button variant="ghost" title={t(page === 'signup' ? 'haveAccount' : 'needAccount')} disabled={busy} onPress={() => navigate(page === 'signup' ? 'login' : 'signup')} />
    </Card>}
    {page !== 'login' && <Button variant="ghost" title={t('back')} disabled={busy} onPress={() => navigate('login')} />}
    <Button variant="secondary" title={t('backToDemo')} disabled={busy} onPress={() => app.setMode('offline')} />
  </Page>;
}
