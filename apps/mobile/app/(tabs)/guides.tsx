import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../src/state/AppProvider';
import type { Language } from '../../src/domain/models';
import { assets } from '../../src/ui/assets';
import { Button, Card, Empty, ErrorNotice, Field, Icon, Loading, Page, Title, Txt, styles } from '../../src/ui/components';

export default function GuidesScreen() {
  const { gateway, scope } = useApp();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage as Language;
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const categories = useQuery({ queryKey: [scope, 'guide-categories'], queryFn: () => gateway.guideCategories() });
  const selected = categories.data?.find(category => category.id === categoryId);
  const catalog = useInfiniteQuery({ queryKey: [scope, 'guide-library', categoryId, search, language], initialPageParam: 0,
    queryFn: ({ pageParam }) => gateway.content({ kind: 'guide', categoryId: categoryId!, language, search, offset: pageParam, limit: 30 }),
    enabled: !!categoryId, getNextPageParam: page => page.offset + page.items.length < page.total ? page.offset + page.limit : undefined });
  const items = catalog.data?.pages.flatMap(page => page.items) ?? [];
  return <Page narrow>
    {categoryId && <Button variant="ghost" icon="arrow-left" title={t('guides')} onPress={() => { setCategoryId(null); setSearch(''); }} />}
    <Title eyebrow={t('guides')} title={selected?.names[language] ?? t('guideCms.title')} subtitle={t('guideCms.body')} />
    {categories.isPending ? <Loading /> : categories.error ? <ErrorNotice error={categories.error} retry={() => void categories.refetch()} /> : !categoryId ?
      <View style={{ gap: 14 }}>{categories.data?.map((category, index) => <Pressable key={category.id} accessibilityRole="button"
        accessibilityLabel={category.names[language]} onPress={() => setCategoryId(category.id)}>
        <Card><View style={styles.row}><Image source={category.illustrationUrl ? { uri: category.illustrationUrl } : [assets.guide, assets.guide2, assets.guide3, assets.guide4][index % 4]}
          style={{ width: 72, height: 72, borderRadius: 18 }} resizeMode="contain" /><Txt style={{ ...styles.sectionTitle, flex: 1 }}>{category.names[language]}</Txt><Icon name="chevron-right" /></View></Card>
      </Pressable>)}{!categories.data?.length && <Empty title={t('noResults')} body={t('noResultsBody')} />}</View> : <>
        <Field label={t('search')} value={search} onChangeText={setSearch} maxLength={200} returnKeyType="search" autoCorrect={false} />
        {catalog.error && <ErrorNotice error={catalog.error} retry={() => void catalog.refetch()} />}
        {catalog.isPending ? <Loading /> : items.length ? items.map(item =>
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.translations[language].title}
            onPress={() => router.push({ pathname: '/content/[id]', params: { id: item.id } })}>
            <Card><View style={styles.row}>{item.iconUrl ? <Image source={{ uri: item.iconUrl }} style={{ width: 44, height: 44 }} resizeMode="contain" /> : <Icon name="book-open" size={30} />}
              <View style={{ flex: 1, gap: 6 }}><Txt style={styles.sectionTitle}>{item.translations[language].title}</Txt><Txt style={styles.subtitle}>{item.translations[language].summary}</Txt></View><Icon name="chevron-right" /></View></Card>
          </Pressable>) : <Empty title={t('noResults')} body={t('noResultsBody')} />}
        {catalog.hasNextPage && <Button title={t('loadMore')} variant="secondary" busy={catalog.isFetchingNextPage} onPress={() => void catalog.fetchNextPage()} />}
      </>}
  </Page>;
}
