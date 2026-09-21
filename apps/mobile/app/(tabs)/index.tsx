import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../src/state/AppProvider';
import { useActiveChild, useCompletions, useContent, useMe } from '../../src/state/queries';
import { ageInMonths, recommend } from '../../src/domain/models';
import { Button, Card, Chip, ContentCard, Empty, ErrorNotice, Icon, Loading, Page, Section, Title, Txt, styles } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

export default function TodayScreen() {
  const { t } = useTranslation();
  const app = useApp();
  const user = useMe();
  const children = useActiveChild();
  const catalog = useContent();
  const history = useCompletions(children.child?.id);
  const wide = useWindowDimensions().width >= 780;
  const isTeacher = user.data?.isTeacher && !children.data?.length;
  const recommendation = recommend(catalog.data?.items ?? [], children.child, history.data ?? []);
  const week = (history.data ?? []).filter(c => Date.parse(c.completedAt) <= Date.now() && Date.parse(c.completedAt) >= Date.now() - 7 * 86400000).length;
  const error = children.error ?? catalog.error ?? history.error;
  return <Page>
    <View style={styles.row}><View style={{ gap: 2 }}><Txt style={{ fontSize: 23, fontWeight: '700', letterSpacing: -0.8 }}>Kids Guide<Txt style={{ color: '#C58D56', fontSize: 24 }}>.</Txt></Txt><Txt style={styles.meta}>{t('tagline')}</Txt></View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('settings')} onPress={() => router.push('/settings')} style={{ width: 46, height: 46, backgroundColor: colors.primarySoft, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}><Icon name={isTeacher ? 'briefcase' : 'user'} /></Pressable>
    </View>
    <View style={[styles.row, { flexWrap: 'wrap' }]}><Txt style={styles.eyebrow}>{t('hello', { name: user.data?.name })}</Txt><Chip title={app.mode === 'offline' ? `${t('offline')} · ${t(app.persona)}` : t('online')} icon={app.mode === 'offline' ? 'coffee' : 'wifi'} onPress={() => router.push('/settings')} /></View>
    <View style={{ backgroundColor: colors.primarySoft, borderRadius: 28, padding: wide ? 36 : 26, gap: 22, overflow: 'hidden' }}>
      <View style={{ maxWidth: 560, gap: 14 }}><Txt accessibilityRole="header" style={{ fontSize: wide ? 46 : 36, lineHeight: wide ? 52 : 43, fontWeight: '700', letterSpacing: -1.4 }}>{t(isTeacher ? 'teacherHero' : 'heroTitle')}</Txt>
        <Txt style={[styles.subtitle, { maxWidth: 450 }]}>{t(isTeacher ? 'teacherHeroBody' : 'heroBody')}</Txt></View>
      <View style={{ alignSelf: 'flex-start' }}><Button title={t(isTeacher ? 'openClass' : 'exploreAll')} icon="arrow-right" onPress={() => router.push(isTeacher ? '/classroom' : '/explore')} /></View>
      {wide && <View accessibilityElementsHidden style={{ position: 'absolute', right: 48, top: 40, width: 200, height: 200, borderRadius: 100, backgroundColor: '#D5E3CC', alignItems: 'center', justifyContent: 'center' }}><Icon name="sun" size={90} color="#597E4D" /><View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8BD78', top: 5, right: 0 }} /></View>}
    </View>
    {error && <ErrorNotice error={error} retry={() => { void children.refetch(); void catalog.refetch(); if (children.child) void history.refetch(); }} />}
    {children.isPending || catalog.isPending ? <Loading /> : <>
      {!isTeacher && <View style={styles.wrap}>{children.data?.map(child => {
        const months = ageInMonths(child.dateOfBirth) ?? 0;
        return <Chip key={child.id} title={`${child.name} · ${months < 24 ? t('ageMonths', { count: months }) : t('ageYears', { count: Math.floor(months / 12) })}`} selected={children.child?.id === child.id} icon="smile" onPress={() => app.setActiveChildId(child.id)} />;
      })}<Chip title={t('addChild')} icon="plus" onPress={() => router.push('/child/new')} /></View>}
      {!isTeacher && !children.child ? <Empty title={t('noChild')} body={t('noChildBody')} icon="smile" /> :
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24 }}>
          <View style={{ flex: 1, gap: 16 }}><Section title={t(isTeacher ? 'sharedLibrary' : 'todayPick')} />
            {(isTeacher ? catalog.data?.items.find(c => c.kind === 'activity') : recommendation) ? <ContentCard featured item={(isTeacher ? catalog.data!.items.find(c => c.kind === 'activity') : recommendation)!} /> : <Empty title={t('noResults')} body={t('noResultsBody')} />}
          </View>
          <View style={{ flex: 1, gap: 16 }}>
            <Section title={t(isTeacher ? 'moreIdeas' : 'thisWeek')} />
            {!isTeacher && <Card><View style={styles.row}><Icon name="heart" size={28} /><Txt style={{ fontSize: 36, lineHeight: 42, fontWeight: '700' }}>{week}</Txt></View><Txt style={{ fontWeight: '600' }}>{t('moments', { count: week })}</Txt><Txt style={styles.subtitle}>{t('rhythmNote')}</Txt></Card>}
            <Card style={{ backgroundColor: colors.lavender }}><Icon name="book-open" size={26} /><Title title={t('storyTitle')} subtitle={t('storyBody')} /><Button variant="ghost" title={t('stories')} icon="arrow-right" onPress={() => router.push({ pathname: '/explore', params: { kind: 'story' } })} /></Card>
            <Card style={{ backgroundColor: colors.peach }}><View style={styles.row}><Icon name="coffee" size={24} /><View style={{ flex: 1 }}><Txt style={styles.sectionTitle}>{t('guideTitle')}</Txt><Txt style={styles.subtitle}>{t('guideBody')}</Txt></View></View><Button variant="ghost" title={t('guides')} icon="arrow-right" onPress={() => router.push({ pathname: '/explore', params: { kind: 'guide' } })} /></Card>
          </View>
        </View>}
    </>}
    {app.mode === 'offline' && <Txt style={[styles.meta, { textAlign: 'center' }]}>{t('sample')}</Txt>}
  </Page>;
}
