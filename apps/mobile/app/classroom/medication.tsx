import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp, uuid } from '../../src/state/AppProvider';
import { useActiveChild } from '../../src/state/queries';
import { Button, Card, Empty, ErrorNotice, Field, Loading, Page, Title, Txt, styles } from '../../src/ui/components';
import { WorldHeader } from '../../src/ui/WorldHeader';
import { ClassroomTools, UnconnectedTool } from '../../src/ui/ClassroomTool';
export default function MedicationScreen() {
  const { t } = useTranslation();
  const { mode, scope, prototype } = useApp();
  const { child } = useActiveChild();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const key = [scope, 'demo-medications', child?.id];
  const rows = useQuery({ queryKey: key, queryFn: () => prototype.medications(child!.id), enabled: mode === 'offline' && !!child });
  const add = useMutation({ mutationFn: async () => {
    if (mode !== 'offline' || !child) return;
    await prototype.addMedication({ id: uuid(), childId: child.id, name, time, note });
  }, onSuccess: async () => { setName(''); setTime(''); setNote(''); await client.invalidateQueries({ queryKey: key }); } });
  return <Page narrow><WorldHeader world="classroom" /><Title title={t('classTools.medication')} subtitle={t('classTools.medicationBody')} /><ClassroomTools />
    {mode !== 'offline' ? <UnconnectedTool /> : !child ? <Empty title={t('noChild')} body={t('classTools.chooseDemoChild')} /> : <>
      <Txt style={styles.meta}>{t('classTools.medicationDemo', { name: child.name })}</Txt>
      <Card><Field label={t('classTools.medicineName')} value={name} onChangeText={setName} maxLength={100} />
        <Field label={t('classTools.time')} value={time} onChangeText={setTime} placeholder="14:00" maxLength={5} />
        <Field label={t('classTools.note')} value={note} onChangeText={setNote} multiline maxLength={1000} />
        {add.error && <ErrorNotice error={add.error} />}<Button title={t('save')} busy={add.isPending} disabled={!name.trim() || !time.trim()} onPress={() => add.mutate()} /></Card>
      {rows.error && <ErrorNotice error={rows.error} retry={() => void rows.refetch()} />}
      {rows.isPending ? <Loading /> : rows.data?.length ? rows.data.map(row => <Card key={row.id}><Txt style={styles.sectionTitle}>{row.name}</Txt><Txt>{row.time}</Txt><Txt>{row.note}</Txt><Txt style={styles.meta}>{t('classTools.recorded')}</Txt></Card>) : <Empty title={t('classTools.noMedication')} body={t('classTools.localOnly')} />}
    </>}
  </Page>;
}
