import React, { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppProvider';
import { Button, Card, Empty, Page, Title, Txt, styles } from './components';
import { WorldHeader } from './WorldHeader';
import { assets } from './assets';

export const toolNames = ['feed', 'announcements', 'gallery', 'notes', 'medication'] as const;
export function ClassroomTools() {
  const { t } = useTranslation();
  return <View style={styles.wrap}>{toolNames.map(tool => <Button key={tool} variant="secondary" title={t(`classTools.${tool}`)}
    onPress={() => router.navigate(tool === 'feed' ? '/classroom' : `/classroom/${tool}`)} />)}</View>;
}
export function UnconnectedTool() {
  const { t } = useTranslation();
  return <Empty title={t('classTools.notConnected')} body={t('classTools.notConnectedBody')} icon="cloud" />;
}
export function ClassroomTool({ tool }: { tool: 'gallery' | 'notes' | 'announcements' }) {
  const { t } = useTranslation();
  const { mode } = useApp();
  const [photo, setPhoto] = useState<number | null>(null);
  const pictures = [assets.activity, assets.recommendation, assets.story, assets.moon];
  return <Page narrow><WorldHeader world="classroom" /><Title title={t(`classTools.${tool}`)} subtitle={t('classBody')} /><ClassroomTools />
    {mode !== 'offline' ? <UnconnectedTool /> : <>
      <Txt style={styles.meta}>{t('sample')}</Txt>
      {tool === 'gallery' ? <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{pictures.map((picture, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={t('classTools.openPhoto', { count: index + 1 })}
        onPress={() => setPhoto(index)} style={{ width: '47%', flexGrow: 1 }}><Image source={picture} style={{ width: '100%', height: 170, borderRadius: 20 }} resizeMode="cover" /></Pressable>)}</View>
        <Modal visible={photo !== null} transparent animationType="fade" onRequestClose={() => setPhoto(null)}><View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#17251Fee', padding: 24, gap: 20 }}>
          {photo !== null && <Image source={pictures[photo]} style={{ width: '100%', height: '65%' }} resizeMode="contain" />}<Button title={t('close')} onPress={() => setPhoto(null)} />
        </View></Modal></> : [1, 2].map(index => <Card key={index}><Txt style={styles.eyebrow}>{t(tool === 'notes' ? 'teacher' : 'classTools.announcements')}</Txt>
          <Txt style={styles.sectionTitle}>{t(`classTools.${tool}${index}Title`)}</Txt><Txt>{t(`classTools.${tool}${index}Body`)}</Txt></Card>)}
    </>}
  </Page>;
}
