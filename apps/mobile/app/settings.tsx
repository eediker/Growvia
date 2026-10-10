import React, { useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp } from '../src/state/AppProvider';
import { BackButton, Button, Card, Chip, ErrorNotice, Icon, Page, Title, Txt, styles } from '../src/ui/components';
import { colors } from '../src/ui/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const reset = useMutation({ mutationFn: app.resetDemo, onSuccess: () => setConfirmReset(false) });
  const language = useMutation({ mutationFn: app.setLanguage });
  const logout = useMutation({ mutationFn: app.logout });
  return <Page narrow><BackButton /><Title title={t('settings')} subtitle={t('tagline')} />
    <Card><View style={styles.row}><Txt style={styles.sectionTitle}>{t('languageSetting')}</Txt><Icon name="globe" /></View>
      <View style={styles.wrap}>{(['tr', 'en'] as const).map(locale => <Chip key={locale} title={locale === 'tr' ? 'Türkçe' : 'English'} selected={i18n.resolvedLanguage === locale} onPress={() => language.mutate(locale)} />)}</View>
      <Txt style={styles.subtitle}>{t('languageNote')}</Txt>{language.error && <ErrorNotice error={language.error} />}</Card>
    {app.mode === 'offline' && <Card><Txt style={styles.sectionTitle}>{t('experience')}</Txt><Txt style={styles.subtitle}>{t('personaNote')}</Txt>
      <View style={styles.wrap}>{(['parent', 'teacher'] as const).map(persona => <Chip key={persona} title={t(persona)} icon={persona === 'parent' ? 'heart' : 'briefcase'} selected={app.persona === persona} onPress={() => app.setPersona(persona)} />)}</View>
    </Card>}
    <Card><Txt style={styles.sectionTitle}>{t('dataSource')}</Txt><Txt style={styles.subtitle}>{t('modeNote')}</Txt>
      <View style={styles.wrap}>{(['offline', 'online'] as const).map(mode => <Chip key={mode} title={t(mode)} icon={mode === 'offline' ? 'coffee' : 'wifi'} selected={app.mode === mode} onPress={() => app.setMode(mode)} />)}</View>
      <Txt style={styles.meta}>{t('configNote')}</Txt>
    </Card>
    {app.mode === 'offline' && <Card><Button variant="secondary" title={t('resetDemo')} icon="rotate-ccw" onPress={() => setConfirmReset(true)} />
      {confirmReset && <><Txt>{t('resetConfirm')}</Txt><Button title={t('resetDemo')} busy={reset.isPending} onPress={() => reset.mutate()} /><Button variant="ghost" title={t('cancel')} onPress={() => setConfirmReset(false)} /></>}
      {reset.error && <ErrorNotice error={reset.error} />}{reset.isSuccess && <Txt accessibilityRole="alert">{t('resetDone')}</Txt>}
    </Card>}
    {app.mode === 'online' && <><Button title={t('signOut')} variant="secondary" busy={logout.isPending} onPress={() => logout.mutate()} />{logout.error && <ErrorNotice error={logout.error} />}</>}
    <Card style={{ backgroundColor: colors.primarySoft }}><Icon name="heart" /><Txt style={styles.sectionTitle}>{t('about')}</Txt><Txt style={styles.subtitle}>{t('aboutBody')}</Txt></Card>
  </Page>;
}

