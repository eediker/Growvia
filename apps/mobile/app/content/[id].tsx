import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp, uuid } from '../../src/state/AppProvider';
import { useActiveChild, useMe } from '../../src/state/queries';
import type { Language } from '../../src/domain/models';
import { BackButton, Button, Card, Chip, ErrorNotice, Icon, Loading, Page, Title, Txt, contentIcons, styles } from '../../src/ui/components';
import { areaColors, colors } from '../../src/ui/theme';
import { contentImage } from '../../src/ui/assets';
import { GuideBody } from '../../src/ui/GuideBody';

export default function ContentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentScreen key={id} />;
}
function ContentScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { t, i18n } = useTranslation();
  const { gateway, scope, setActiveChildId, mode, prototype } = useApp();
  const children = useActiveChild();
  const me = useMe();
  const client = useQueryClient();
  const [requestId, setRequestId] = useState(uuid);
  const item = useQuery({ queryKey: [scope, 'content-detail', id], queryFn: () => gateway.contentById(id) });
  const complete = useMutation({ mutationFn: () => gateway.complete(children.child!.id, id, requestId),
    onSuccess: () => client.invalidateQueries({ queryKey: [scope, 'completions'] }) });
  const undo = useMutation({ mutationFn: () => gateway.removeCompletion(complete.data!.childId, complete.data!.id),
    onSuccess: async () => { complete.reset(); setRequestId(uuid()); await client.invalidateQueries({ queryKey: [scope, 'completions'] }); } });
  const language = i18n.resolvedLanguage as Language;
  const text = item.data?.translations[language];
  const readKey = [scope, 'story-read', children.child?.id, id];
  const read = useQuery({ queryKey: readKey, queryFn: () => prototype.hasRead(children.child!.id, id), enabled: mode === 'offline' && !!children.child && item.data?.kind === 'story' });
  const markRead = useMutation({ mutationFn: () => prototype.markRead(children.child!.id, id), onSuccess: () => client.invalidateQueries({ queryKey: readKey }) });
  if (complete.data) return <Page narrow><Card style={{ backgroundColor: colors.primarySoft }}><Icon name="check-circle" size={56} /><Title title={t('completed')} subtitle={text?.title} /><Txt>{t('repeatHint')}</Txt>
    <Button title={t(returnTo === 'classroom' ? 'worlds.returnClass' : 'worlds.returnChild')} onPress={() => router.replace(returnTo === 'classroom' ? '/classroom' : '/child')} />
    <Button title={t('activities')} variant="secondary" onPress={() => router.replace('/explore')} />
    {undo.error && <ErrorNotice error={undo.error} />}<Button title={t('undo')} variant="ghost" busy={undo.isPending} onPress={() => undo.mutate()} />
  </Card></Page>;
  return <Page narrow>{returnTo === 'classroom' ? <Button variant="ghost" title={t('worlds.returnClass')} onPress={() => router.replace('/classroom')} /> : <BackButton />}
    {item.isPending ? <Loading /> : item.error ? <ErrorNotice error={item.error} retry={() => void item.refetch()} /> : item.data && text && <>
      {(item.data.kind !== 'guide' || item.data.coverImageUrl) && <Image source={item.data.coverImageUrl ? { uri: item.data.coverImageUrl } : contentImage(item.data)} style={{ width: '100%', height: 220, borderRadius: 24 }} resizeMode="cover" />}
      <View style={{ backgroundColor: areaColors[item.data.area], borderRadius: 26, padding: 28, gap: 20 }}><Icon name={contentIcons[item.data.area]} size={44} />
        <Title title={text.title} subtitle={text.summary} eyebrow={t(item.data.kind)} />
        {item.data.kind !== 'guide' && <View style={styles.wrap}><Chip title={t('minutes', { count: item.data.durationMinutes })} icon="clock" /><Chip title={t('ages', { min: Math.floor(item.data.minAgeMonths / 12), max: Math.floor(item.data.maxAgeMonths / 12) })} /></View>}
      </View>
      {item.data.kind === 'activity' ? <>
        <Card><Txt style={styles.sectionTitle}>{t('materials')}</Txt>{text.materials.length ? text.materials.map(material => <Txt key={material}>• {material}</Txt>) : <Txt style={styles.subtitle}>{t('noMaterials')}</Txt>}</Card>
        {text.safetyNote && <Card style={{ backgroundColor: colors.yellow }}><View style={styles.row}><Txt style={styles.sectionTitle}>{t('safety')}</Txt><Icon name="shield" /></View><Txt>{text.safetyNote}</Txt></Card>}
        <Txt accessibilityRole="header" style={styles.sectionTitle}>{t('steps')}</Txt>
        {text.steps.map((step, index) => <View key={index} style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Txt style={{ fontWeight: '600' }}>{index + 1}</Txt></View><Txt style={{ flex: 1, paddingTop: 5 }}>{step}</Txt></View>)}
      </> : item.data.kind === 'guide' ? <GuideBody blocks={text.contentBlocks} body={text.body} /> : <Card>{text.body.split('\n\n').map((paragraph, index) => <Txt key={index} style={{ fontSize: 18, lineHeight: 30 }}>{paragraph}</Txt>)}</Card>}
      {item.data.kind === 'guide' && item.data.relatedActivityId && <Button title={t('guideCms.tryActivity')} icon="arrow-right"
        onPress={() => router.push({ pathname: '/content/[id]', params: { id: item.data!.relatedActivityId! } })} />}
      {text.parentTip && <Card style={{ backgroundColor: colors.primarySoft }}><Txt style={styles.sectionTitle}>{t('parentTip')}</Txt><Txt>{text.parentTip}</Txt></Card>}
      {item.data.kind === 'story' && <Card><Txt style={styles.meta}>{t('worlds.storyLocal')}</Txt>
        {mode === 'offline' && children.child && <><Button title={t(read.data ? 'worlds.storyRead' : 'worlds.readStory')} disabled={!!read.data || read.isPending || !!read.error} busy={markRead.isPending} onPress={() => markRead.mutate()} />
          {(read.error || markRead.error) && <ErrorNotice error={read.error || markRead.error} />}</>}
      </Card>}
      {item.data.kind === 'activity' && <>
        {children.data?.length ? <View style={styles.wrap}>{children.data.map(child => <Chip key={child.id} title={t('forChild', { name: child.name })} selected={children.child?.id === child.id} onPress={() => { setActiveChildId(child.id); complete.reset(); undo.reset(); setRequestId(uuid()); }} />)}</View> : null}
        {complete.error && <ErrorNotice error={complete.error} />}{undo.error && <ErrorNotice error={undo.error} />}
        {children.child ? <Button title={t('tryTogether')} icon="check" busy={complete.isPending} onPress={() => complete.mutate()} />
          : !me.data?.isTeacher ? <Button title={t('addChild')} icon="plus" onPress={() => router.push('/child/new')} /> : <Button title={t('openClass')} onPress={() => router.push('/classroom')} />}
      </>}
    </>}
  </Page>;
}
