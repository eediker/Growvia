import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useActiveChild, useCompletions } from '../src/state/queries';
import { BackButton, Card, ErrorNotice, Icon, Page, Title, Txt, styles } from '../src/ui/components';
import { colors } from '../src/ui/theme';
export default function DevelopmentScreen() {
  const { t } = useTranslation();
  const children = useActiveChild();
  const history = useCompletions(children.child?.id);
  const week = (history.data ?? []).filter(c => Date.parse(c.completedAt) <= Date.now() && Date.parse(c.completedAt) >= Date.now() - 7 * 86400000).length;
  return <Page narrow><BackButton /><Title eyebrow={t('worlds.development')} title={t('worlds.observations', { name: children.child?.name ?? t('worlds.child') })} subtitle={t('worlds.developmentBody')} />
    {(children.error || history.error) && <ErrorNotice error={children.error || history.error} />}
    {children.child && <Card><Txt style={styles.sectionTitle}>{t('thisWeek')}</Txt><Txt>{t('moments', { count: week })}</Txt><Txt style={styles.subtitle}>{t('rhythmNote')}</Txt></Card>}
    {['social', 'speech', 'thinking', 'motor', 'selfCare'].map(area => <Card key={area}><View style={styles.row}><Icon name="heart" color={colors.accent} /><Txt style={[styles.sectionTitle, { flex: 1 }]}>{t(`development.${area}`)}</Txt></View><Txt>{t(`development.${area}Body`)}</Txt></Card>)}
  </Page>;
}
