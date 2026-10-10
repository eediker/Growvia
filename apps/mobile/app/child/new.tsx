import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../src/state/AppProvider';
import { useChildren } from '../../src/state/queries';
import { AppError, validateChild } from '../../src/domain/models';
import { Button, Card, ErrorNotice, Field, Loading, Page, Title } from '../../src/ui/components';

export default function NewChildScreen() {
  const { t } = useTranslation();
  const { gateway, scope, setActiveChildId } = useApp();
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const children = useChildren();
  const existing = children.data?.find(child => child.id === id);
  const destination = returnTo === 'classroom' ? '/classroom/profile' : returnTo === 'profile' ? '/profile' : '/child';
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  useEffect(() => { setName(existing?.name ?? ''); setDateOfBirth(existing?.dateOfBirth ?? ''); }, [id, existing?.name, existing?.dateOfBirth]);
  const save = useMutation({ mutationFn: () => id ? gateway.updateChild(id, validateChild({ name, dateOfBirth })) : gateway.createChild(validateChild({ name, dateOfBirth })),
    onSuccess: async child => { setActiveChildId(child.id); await client.invalidateQueries({ queryKey: [scope, 'children'] }); router.replace(destination); } });
  if (id && children.isPending) return <Page narrow><Loading /></Page>;
  if (id && (children.error || !existing)) return <Page narrow><Button title={t('back')} variant="ghost" onPress={() => router.replace(destination)} /><ErrorNotice error={children.error ?? new AppError('notFound')} /></Page>;
  return <Page narrow><Button title={t('back')} variant="ghost" disabled={save.isPending} onPress={() => router.replace(destination)} /><Title title={t(id ? 'guideCms.editChild' : 'noChild')} subtitle={id ? undefined : t('noChildBody')} /><Card>
    <Field label={t('childName')} value={name} onChangeText={setName} maxLength={80} autoComplete="off" />
    <Field label={t('birthDate')} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="2023-03-15" maxLength={10} autoCapitalize="none" />
    {save.error && <ErrorNotice error={save.error} />}<Button title={t('save')} busy={save.isPending} disabled={!name.trim() || dateOfBirth.length !== 10} onPress={() => save.mutate()} />
  </Card></Page>;
}
