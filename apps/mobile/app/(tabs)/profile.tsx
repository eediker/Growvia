import React from 'react';
import { View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMe, useActiveChild } from '../../src/state/queries';
import { useApp } from '../../src/state/AppProvider';
import { BackButton, Button, Card, Empty, ErrorNotice, Icon, Loading, Page, Title, Txt, styles } from '../../src/ui/components';
export default function ProfileScreen() {
  const { t } = useTranslation();
  const app = useApp();
  const me = useMe();
  const children = useActiveChild();
  const returnTo = usePathname().startsWith('/classroom') ? 'classroom' : 'profile';
  return <Page narrow><BackButton /><Title title={t('worlds.profile')} subtitle={me.data?.name} />
    <Card><Icon name="user" size={32} /><Txt style={styles.sectionTitle}>{me.data?.name}</Txt><Txt>{me.data?.email}</Txt>
      <Button title={t('settings')} variant="secondary" onPress={() => router.push('/settings')} /></Card>
    {children.error && <ErrorNotice error={children.error} retry={() => void children.refetch()} />}
    {children.isPending ? <Loading /> : children.data?.length ? children.data.map(child => <Card key={child.id}><View style={styles.row}><Icon name="smile" /><Txt style={styles.sectionTitle}>{child.name}</Txt></View>
      <Txt>{child.dateOfBirth}</Txt><Button title={t('worlds.selectChild')} variant={child.id === children.child?.id ? 'primary' : 'secondary'} onPress={() => { app.setActiveChildId(child.id); router.replace('/child'); }} />
      <Button title={t('guideCms.editChild')} variant="ghost" icon="edit" onPress={() => router.push({ pathname: '/child/new', params: { id: child.id, returnTo } })} /></Card>) : <Empty title={t('noChild')} body={t('noChildBody')} />}
    {!me.data?.isTeacher && <Button title={t('addChild')} icon="plus" onPress={() => router.push({ pathname: '/child/new', params: { returnTo } })} />}
  </Page>;
}
