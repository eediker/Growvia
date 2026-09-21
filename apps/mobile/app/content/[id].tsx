import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp, uuid } from '../../src/state/AppProvider';
import { useActiveChild, useMe } from '../../src/state/queries';
import type { Language } from '../../src/domain/models';
import { BackButton, Button, Card, Chip, ErrorNotice, Icon, Loading, Page, Title, Txt, contentIcons, styles } from '../../src/ui/components';
import { areaColors, colors } from '../../src/ui/theme';

export default function ContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { gateway, scope, setActiveChildId } = useApp();
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
  return <Page narrow><BackButton />
    {item.isPending ? <Loading /> : item.error ? <ErrorNotice error={item.error} retry={() => void item.refetch()} /> : item.data && text && <>
      <View style={{ backgroundColor: areaColors[item.data.area], borderRadius: 26, padding: 28, gap: 20 }}><Icon name={contentIcons[item.data.area]} size={44} />
        <Title title={text.title} subtitle={text.summary} eyebrow={t(item.data.kind)} />
        <View style={styles.wrap}><Chip title={t('minutes', { count: item.data.durationMinutes })} icon="clock" /><Chip title={t('ages', { min: Math.floor(item.data.minAgeMonths / 12), max: Math.floor(item.data.maxAgeMonths / 12) })} /></View>
      </View>
      {item.data.kind === 'activity' ? <>
        <Card><Txt style={styles.sectionTitle}>{t('materials')}</Txt>{text.materials.length ? text.materials.map(material => <Txt key={material}>• {material}</Txt>) : <Txt style={styles.subtitle}>{t('noMaterials')}</Txt>}</Card>
        {text.safetyNote && <Card style={{ backgroundColor: colors.yellow }}><View style={styles.row}><Txt style={styles.sectionTitle}>{t('safety')}</Txt><Icon name="shield" /></View><Txt>{text.safetyNote}</Txt></Card>}
        <Txt accessibilityRole="header" style={styles.sectionTitle}>{t('steps')}</Txt>
        {text.steps.map((step, index) => <View key={index} style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Txt style={{ fontWeight: '600' }}>{index + 1}</Txt></View><Txt style={{ flex: 1, paddingTop: 5 }}>{step}</Txt></View>)}
      </> : <Card>{text.body.split('\n\n').map((paragraph, index) => <Txt key={index} style={{ fontSize: 18, lineHeight: 30 }}>{paragraph}</Txt>)}</Card>}
      {text.parentTip && <Card style={{ backgroundColor: colors.primarySoft }}><Txt style={styles.sectionTitle}>{t('parentTip')}</Txt><Txt>{text.parentTip}</Txt></Card>}
      {item.data.kind === 'activity' && <>
        {children.data?.length ? <View style={styles.wrap}>{children.data.map(child => <Chip key={child.id} title={t('forChild', { name: child.name })} selected={children.child?.id === child.id} onPress={() => { setActiveChildId(child.id); complete.reset(); undo.reset(); setRequestId(uuid()); }} />)}</View> : null}
        {complete.error && <ErrorNotice error={complete.error} />}{undo.error && <ErrorNotice error={undo.error} />}
        {children.child ? complete.data ? <Card><Txt accessibilityRole="alert" style={styles.sectionTitle}>{t('completed')}</Txt><Txt style={styles.subtitle}>{t('repeatHint')}</Txt><Button title={t('undo')} variant="secondary" busy={undo.isPending} onPress={() => undo.mutate()} /></Card>
          : <Button title={t('tryTogether')} icon="check" busy={complete.isPending} onPress={() => complete.mutate()} />
          : !me.data?.isTeacher ? <Button title={t('addChild')} icon="plus" onPress={() => router.push('/child/new')} /> : <Button title={t('openClass')} onPress={() => router.push('/classroom')} />}
      </>}
    </>}
  </Page>;
}
