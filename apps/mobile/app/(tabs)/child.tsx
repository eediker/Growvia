import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../src/state/AppProvider';
import { useActiveChild, useCompletions, useContent, useMe } from '../../src/state/queries';
import { ageInMonths, recommend, type Language } from '../../src/domain/models';
import { Button, Card, Chip, Empty, ErrorNotice, Icon, Loading, Page, Txt, styles, type IconName } from '../../src/ui/components';
import { WorldHeader } from '../../src/ui/WorldHeader';
import { contentImage } from '../../src/ui/assets';
import { colors } from '../../src/ui/theme';

export default function ChildHomeScreen() {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const user = useMe();
  const children = useActiveChild();
  const catalog = useContent();
  const history = useCompletions(children.child?.id);
  const recommendation = recommend(catalog.data?.items ?? [], children.child, history.data ?? []);
  const selected = recommendation ?? catalog.data?.items.find(item => item.kind === 'activity');
  const text = selected?.translations[i18n.resolvedLanguage as Language];
  const error = children.error ?? catalog.error ?? history.error;
  const features = [
    { title: 'activities', body: 'worlds.play', icon: 'sun', color: colors.accent, path: '/explore' },
    { title: 'stories', body: 'worlds.imagine', icon: 'book-open', color: colors.sky, path: '/stories' },
    { title: 'guides', body: 'worlds.learn', icon: 'book', color: colors.green, path: '/guides' },
    { title: 'worlds.development', body: 'worlds.notice', icon: 'heart', color: colors.purple, path: '/development' },
  ] as const;
  return <Page narrow><WorldHeader world="child" />
    <Txt style={styles.eyebrow}>{t('worlds.child')}</Txt>
    {error && <ErrorNotice error={error} retry={() => { void children.refetch(); void catalog.refetch(); if (children.child) void history.refetch(); }} />}
    {children.isPending || catalog.isPending ? <Loading /> : <>
      {children.child ? <Card><View style={styles.row}><Icon name="smile" size={36} /><View style={{ flex: 1 }}>
        <Txt style={styles.sectionTitle}>{children.child.name}</Txt><Txt style={styles.meta}>{t('ageMonths', { count: ageInMonths(children.child.dateOfBirth) ?? 0 })}</Txt>
      </View><Button variant="ghost" title={t('worlds.profile')} onPress={() => router.push('/profile')} /></View>
        <View style={styles.wrap}>{children.data?.map(child => <Chip key={child.id} title={child.name} selected={child.id === children.child?.id} onPress={() => app.setActiveChildId(child.id)} />)}</View>
      </Card> : <><Empty title={t(user.data?.isTeacher ? 'sharedLibrary' : 'noChild')} body={t(user.data?.isTeacher ? 'sharedLibraryBody' : 'noChildBody')} />
        {!user.data?.isTeacher && <Button title={t('addChild')} onPress={() => router.push('/child/new')} />}</>}
      {selected && text && <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Image source={contentImage(selected)} style={{ width: '100%', height: 175 }} resizeMode="cover" />
        <View style={{ padding: 22, gap: 12 }}><Txt style={styles.eyebrow}>{t('todayPick')}</Txt><Txt style={styles.sectionTitle}>{text.title}</Txt><Txt style={styles.subtitle}>{text.summary}</Txt>
          <Button title={t('startActivity')} icon="arrow-right" onPress={() => router.push({ pathname: '/content/[id]', params: { id: selected.id } })} /></View>
      </Card>}
    </>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{features.map(feature => <Pressable key={feature.path} accessibilityRole="button" accessibilityLabel={t(feature.title)}
      onPress={() => router.push(feature.path)} style={({ pressed }) => ({ width: '47%', flexGrow: 1, minHeight: 150, borderRadius: 22, padding: 20, gap: 8, backgroundColor: feature.color, opacity: pressed ? 0.8 : 1 })}>
      <Icon name={feature.icon as IconName} color="#fff" size={28} /><Txt style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{t(feature.title)}</Txt><Txt style={{ color: '#fff' }}>{t(feature.body)}</Txt>
    </Pressable>)}</View>
    {app.mode === 'offline' && <Txt style={styles.meta}>{t('sample')}</Txt>}
  </Page>;
}
