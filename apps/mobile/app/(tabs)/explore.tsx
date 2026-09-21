import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../src/state/AppProvider';
import { useActiveChild } from '../../src/state/queries';
import { ageInMonths, type ContentKind, type Language } from '../../src/domain/models';
import { Button, Chip, ContentCard, Empty, ErrorNotice, Field, Loading, Page, Title, styles } from '../../src/ui/components';

export default function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const { gateway, scope } = useApp();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<ContentKind | undefined>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState(false);
  const { child } = useActiveChild();
  const wide = useWindowDimensions().width >= 680;
  useEffect(() => { setKind(params.kind === 'story' || params.kind === 'guide' || params.kind === 'activity' ? params.kind : undefined); }, [params.kind]);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search), 250); return () => clearTimeout(timer); }, [search]);
  const months = child && ageFilter ? ageInMonths(child.dateOfBirth) ?? undefined : undefined;
  const language = i18n.resolvedLanguage as Language;
  const catalog = useInfiniteQuery({ queryKey: [scope, 'library', kind, months, debouncedSearch, language], initialPageParam: 0,
    queryFn: ({ pageParam }) => gateway.content({ kind, ageMonths: months, search: debouncedSearch, language, offset: pageParam, limit: 30 }),
    getNextPageParam: page => page.offset + page.items.length < page.total ? page.offset + page.limit : undefined });
  const items = catalog.data?.pages.flatMap(p => p.items) ?? [];
  return <Page><Title eyebrow={t('discover')} title={t('exploreTitle')} subtitle={t('exploreBody')} />
    <Field label={t('search')} value={search} onChangeText={setSearch} placeholder={t('search')} returnKeyType="search" maxLength={200} />
    <View style={styles.wrap}>{([undefined, 'activity', 'story', 'guide'] as const).map(value => <Chip key={value ?? 'all'} title={t(value ? `${value === 'activity' ? 'activities' : value === 'story' ? 'stories' : 'guides'}` : 'all')} selected={kind === value} onPress={() => setKind(value)} />)}</View>
    {child && <View style={styles.wrap}><Chip title={t('childFilter', { name: child.name })} icon="smile" selected={ageFilter} onPress={() => setAgeFilter(v => !v)} /></View>}
    {catalog.error && <ErrorNotice error={catalog.error} retry={() => void catalog.refetch()} />}
    {catalog.isPending ? <Loading /> : items.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{items.map(item => <View key={item.id} style={{ width: wide ? '48%' : '100%', flexGrow: 1 }}><ContentCard item={item} /></View>)}</View> :
      <><Empty title={t('noResults')} body={t('noResultsBody')} icon="search" /><Button variant="secondary" title={t('clearFilters')} onPress={() => { setKind(undefined); setSearch(''); setAgeFilter(false); }} /></>}
    {catalog.hasNextPage && <Button variant="secondary" title={t('loadMore')} busy={catalog.isFetchingNextPage} onPress={() => void catalog.fetchNextPage()} />}
  </Page>;
}
