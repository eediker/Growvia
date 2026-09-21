import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { colors, areaColors } from './theme';
import { AppError, type Content, type Language } from '../domain/models';

export type IconName = React.ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = colors.primary }: { name: IconName; size?: number; color?: ColorValue }) {
  return <Feather name={name} size={size} color={color} />;
}
export function Txt({ style, ...props }: TextProps) { return <Text {...props} style={[styles.text, style]} />; }
export function Page({ children, narrow = false }: React.PropsWithChildren<{ narrow?: boolean }>) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
    <View style={[styles.page, narrow && { maxWidth: 760 }]}>{children}</View>
  </ScrollView></SafeAreaView>;
}
export function Button({ title, onPress, icon, variant = 'primary', disabled = false, busy = false }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; busy?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }}
    onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary,
      variant === 'ghost' && styles.ghost, (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.78 }]}>
    {busy ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} /> : icon && <Icon name={icon} size={18} color={variant === 'primary' ? '#fff' : colors.primary} />}
    <Txt style={[styles.buttonText, variant !== 'primary' && { color: colors.primary }]}>{title}</Txt>
  </Pressable>;
}
export function Chip({ title, selected = false, onPress, icon }: { title: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityState={{ selected }}
    style={[styles.chip, selected && styles.chipSelected]}>
    {icon && <Icon name={icon} size={15} color={selected ? '#fff' : colors.primary} />}
    <Txt style={[styles.chipText, selected && { color: '#fff' }]}>{title}</Txt>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8 }}><Txt style={styles.label}>{label}</Txt><TextInput {...props} accessibilityLabel={label}
    placeholderTextColor="#77857E" style={[styles.input, props.multiline && { minHeight: 120, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Card({ children, style }: React.PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }
export function Title({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return <View style={{ gap: 10 }}>{eyebrow && <Txt style={styles.eyebrow}>{eyebrow}</Txt>}<Txt accessibilityRole="header" style={styles.title}>{title}</Txt>{subtitle && <Txt style={styles.subtitle}>{subtitle}</Txt>}</View>;
}
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.section}><Txt accessibilityRole="header" style={styles.sectionTitle}>{title}</Txt>{action && <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Txt style={styles.link}>{action}</Txt></Pressable>}</View>;
}
export function Empty({ title, body, icon = 'sun' }: { title: string; body: string; icon?: IconName }) {
  return <Card style={{ alignItems: 'center', gap: 14, paddingVertical: 36 }}><Icon name={icon} size={32} /><Txt style={styles.sectionTitle}>{title}</Txt><Txt style={[styles.subtitle, { textAlign: 'center' }]}>{body}</Txt></Card>;
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useTranslation();
  return <View accessibilityRole="alert" style={styles.error}><Icon name="alert-circle" color={colors.danger} /><Txt style={{ color: colors.danger, flex: 1 }}>{t(`errors.${error instanceof AppError ? error.code : 'server'}`)}</Txt>{retry && <Button variant="ghost" title={t('retry')} onPress={retry} />}</View>;
}
export function Loading() { const { t } = useTranslation(); return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Txt>{t('loading')}</Txt></View>; }
export function BackButton() { const { t } = useTranslation(); return <View style={{ alignSelf: 'flex-start' }}><Button variant="ghost" icon="arrow-left" title={t('back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /></View>; }
export const contentIcons: Record<Content['area'], IconName> = { discovery: 'compass', nature: 'sun', movement: 'activity', language: 'book-open', connection: 'heart' };
export function ContentCard({ item, featured = false }: { item: Content; featured?: boolean }) {
  const { t, i18n } = useTranslation();
  const text = item.translations[i18n.resolvedLanguage as Language] ?? item.translations.en;
  return <Pressable accessibilityRole="button" accessibilityLabel={text.title} onPress={() => router.push({ pathname: '/content/[id]', params: { id: item.id } })}
    style={({ pressed }) => [styles.contentCard, { backgroundColor: featured ? areaColors[item.area] : colors.surface, opacity: pressed ? 0.8 : 1 }]}>
    <View style={[styles.contentArt, { backgroundColor: areaColors[item.area] }]}><Icon name={contentIcons[item.area]} size={featured ? 56 : 32} />
      {featured && <View style={styles.artCircle} />}</View>
    <View style={{ gap: 12, flex: 1 }}><View style={styles.row}><Txt style={styles.eyebrow}>{t(item.area)}</Txt><Txt style={styles.meta}>{t('minutes', { count: item.durationMinutes })}</Txt></View>
      <Txt style={[styles.contentTitle, featured && { fontSize: 27 }]}>{text.title}</Txt><Txt style={styles.subtitle}>{text.summary}</Txt>
      <View style={[styles.row, { marginTop: 6 }]}><Txt style={styles.meta}>{t('ages', { min: Math.floor(item.minAgeMonths / 12), max: Math.floor(item.maxAgeMonths / 12) })}</Txt><Icon name="arrow-up-right" /></View>
    </View>
  </Pressable>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, scroll: { flexGrow: 1, paddingBottom: 40 },
  page: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20, gap: 24 },
  text: { fontSize: 16, lineHeight: 24, color: colors.ink }, title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  subtitle: { fontSize: 15, lineHeight: 24, color: colors.muted }, eyebrow: { fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: '600', letterSpacing: -0.3 }, link: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 24, gap: 16 },
  button: { backgroundColor: colors.primary, minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center', flexShrink: 1 }, secondary: { backgroundColor: colors.primarySoft }, ghost: { backgroundColor: 'transparent' },
  chip: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { fontSize: 14, fontWeight: '500' },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#C8D4CA', backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink },
  label: { fontSize: 14, fontWeight: '600' }, error: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 16 },
  loading: { padding: 40, gap: 18, alignItems: 'center' }, meta: { fontSize: 13, lineHeight: 20, color: colors.muted },
  contentCard: { borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 20, flexGrow: 1 },
  contentArt: { minHeight: 90, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF45', position: 'absolute', right: -15, top: -25 },
  contentTitle: { fontSize: 21, lineHeight: 29, fontWeight: '600', letterSpacing: -0.5 },
});
