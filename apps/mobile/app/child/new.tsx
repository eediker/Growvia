import React, { useState } from 'react';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../src/state/AppProvider';
import { validateChild } from '../../src/domain/models';
import { BackButton, Button, Card, ErrorNotice, Field, Page, Title } from '../../src/ui/components';

export default function NewChildScreen() {
  const { t } = useTranslation();
  const { gateway, scope, setActiveChildId } = useApp();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const save = useMutation({ mutationFn: () => gateway.createChild(validateChild({ name, dateOfBirth })),
    onSuccess: async child => { setActiveChildId(child.id); await client.invalidateQueries({ queryKey: [scope, 'children'] }); router.replace('/'); } });
  return <Page narrow><BackButton /><Title title={t('noChild')} subtitle={t('noChildBody')} /><Card>
    <Field label={t('childName')} value={name} onChangeText={setName} maxLength={80} autoComplete="off" />
    <Field label={t('birthDate')} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="2023-03-15" maxLength={10} autoCapitalize="none" />
    {save.error && <ErrorNotice error={save.error} />}<Button title={t('save')} busy={save.isPending} disabled={!name.trim() || dateOfBirth.length !== 10} onPress={() => save.mutate()} />
  </Card></Page>;
}
