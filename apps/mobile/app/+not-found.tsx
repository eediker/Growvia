import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Empty, Page } from '../src/ui/components';
export default function NotFound() { const { t } = useTranslation(); return <Page><Empty title={t('noResults')} body={t('errors.notFound')} /><Button title={t('home')} onPress={() => router.replace('/')} /></Page>; }
