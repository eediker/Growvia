import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp, uuid } from '../../src/state/AppProvider';
import { useClasses, useContent, usePosts } from '../../src/state/queries';
import type { Language } from '../../src/domain/models';
import { Button, Card, Chip, Empty, ErrorNotice, Field, Icon, Loading, Page, Title, Txt, styles } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

export default function ClassroomScreen() {
  const { t, i18n } = useTranslation();
  const { gateway, scope } = useApp();
  const client = useQueryClient();
  const classes = useClasses();
  const catalog = useContent({ kind: 'activity' });
  const [classId, setClassId] = useState<string>();
  const activeClass = classes.data?.find(c => c.id === classId) ?? classes.data?.[0];
  const posts = usePosts(activeClass?.id);
  const [composing, setComposing] = useState(false);
  const [activityId, setActivityId] = useState('');
  const [message, setMessage] = useState('');
  const [messageLanguage, setMessageLanguage] = useState<Language>(i18n.resolvedLanguage === 'tr' ? 'tr' : 'en');
  const [requestId, setRequestId] = useState(uuid);
  const [success, setSuccess] = useState(false);
  const share = useMutation({ mutationFn: () => gateway.shareActivity(activeClass!.id, { id: requestId, activityId, message, language: messageLanguage }),
    onSuccess: async () => { setComposing(false); setMessage(''); setRequestId(uuid()); setSuccess(true); await client.invalidateQueries({ queryKey: [scope, 'posts'] }); } });
  const language = i18n.resolvedLanguage as Language;
  return <Page narrow><Title eyebrow={t('classroom')} title={t('classTitle')} subtitle={t('classBody')} />
    {classes.error && <ErrorNotice error={classes.error} retry={() => void classes.refetch()} />}
    {classes.isPending ? <Loading /> : !activeClass ? <Empty title={t('noClasses')} body={t('noClassesBody')} icon="users" /> : <>
      <View style={styles.wrap}>{classes.data?.map(c => <Chip key={c.id} title={c.name} selected={c.id === activeClass.id} onPress={() => { setClassId(c.id); setComposing(false); setSuccess(false); }} />)}</View>
      <Card style={{ backgroundColor: colors.primarySoft }}><View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Txt style={styles.sectionTitle}>{activeClass.name}</Txt><Txt style={styles.subtitle}>{activeClass.schoolName}</Txt></View><Icon name="sun" size={32} /></View>
        {activeClass.canPost && <Button title={t('shareActivity')} icon="plus" onPress={() => { setComposing(v => !v); setSuccess(false); }} />}</Card>
      {success && <Txt accessibilityRole="alert" style={{ color: colors.primary }}>{t('published')}</Txt>}
      {composing && activeClass.canPost && <Card><Txt style={styles.sectionTitle}>{t('selectActivity')}</Txt>
        {catalog.error && <ErrorNotice error={catalog.error} retry={() => void catalog.refetch()} />}
        <View style={styles.wrap}>{catalog.data?.items.map(item => <Chip key={item.id} title={item.translations[language].title} selected={activityId === item.id} onPress={() => { setActivityId(item.id); setRequestId(uuid()); }} />)}</View>
        <Field label={t('message')} value={message} onChangeText={value => { setMessage(value); setRequestId(uuid()); }} multiline maxLength={2000} placeholder={t('messagePlaceholder')} />
        <View style={styles.wrap}>{(['tr', 'en'] as const).map(locale => <Chip key={locale} title={locale === 'tr' ? 'Türkçe' : 'English'} selected={messageLanguage === locale} onPress={() => { setMessageLanguage(locale); setRequestId(uuid()); }} />)}</View>
        {share.error && <ErrorNotice error={share.error} />}<Button title={t('publish')} busy={share.isPending} disabled={!activityId || !message.trim()} onPress={() => share.mutate()} />
        <Button title={t('cancel')} variant="ghost" onPress={() => setComposing(false)} /></Card>}
      {posts.error && <ErrorNotice error={posts.error} retry={() => void posts.refetch()} />}
      {posts.isPending ? <Loading /> : !posts.data?.pages.some(p => p.items.length) ? <Empty title={t('noPosts')} body={t('noPostsBody')} /> :
        posts.data.pages.flatMap(p => p.items).map(post => {
          const activity = catalog.data?.items.find(c => c.id === post.activityId);
          return <Card key={post.id}><View style={styles.row}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ backgroundColor: colors.lavender, borderRadius: 22, padding: 12 }}><Icon name="user" /></View><View><Txt style={{ fontWeight: '600' }}>{post.teacherName}</Txt><Txt style={styles.meta}>{new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(new Date(post.createdAt))}</Txt></View></View><Icon name="more-horizontal" /></View>
            <Txt>{post.message}</Txt>{post.language !== language && <Txt style={styles.meta}>{t('originalLanguage', { language: post.language === 'tr' ? 'Türkçe' : 'English' })}</Txt>}
            <View style={{ backgroundColor: colors.peach, padding: 18, borderRadius: 16, gap: 12 }}><Txt style={styles.eyebrow}>{t('activity')}</Txt><Txt style={styles.sectionTitle}>{activity?.translations[language].title ?? t('continueHome')}</Txt>
              <Button variant="secondary" title={t('continueHome')} icon="arrow-right" onPress={() => router.push({ pathname: '/content/[id]', params: { id: post.activityId } })} /></View>
          </Card>;
        })}
      {posts.hasNextPage && <Button title={t('loadMore')} variant="secondary" busy={posts.isFetchingNextPage} onPress={() => void posts.fetchNextPage()} />}
    </>}
  </Page>;
}
