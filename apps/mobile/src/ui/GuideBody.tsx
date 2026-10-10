import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import type { GuideBlock } from '../domain/guides';
import { richTextParts } from '../domain/guides';
import { Txt, styles } from './components';
import { colors } from './theme';

function RichText({ html }: { html: string }) {
  return <Txt style={{ fontSize: 18, lineHeight: 30, flexShrink: 1 }}>{richTextParts(html).map((part, index) =>
    <Txt key={index} style={{ fontSize: 18, lineHeight: 30, fontWeight: part.bold ? '700' : '400' }}>{part.text}</Txt>)}</Txt>;
}
export function GuideBody({ blocks, body }: { blocks?: GuideBlock[]; body: string }) {
  const content: GuideBlock[] = blocks?.length ? blocks : body.split(/\n\n+/).filter(Boolean).map(html => ({ type: 'paragraph', html }));
  return <View style={{ gap: 20 }}>{content.map((block, index) => {
    if (block.type === 'heading' || block.type === 'subheading') return <Txt key={index} accessibilityRole="header"
      style={{ ...styles.sectionTitle, fontSize: block.type === 'heading' ? 25 : 21 }}>{block.text}</Txt>;
    if (block.type === 'paragraph') return <RichText key={index} html={block.html} />;
    if (block.type === 'image') return <Image key={index} source={{ uri: block.url }} accessibilityLabel={block.alt}
      style={{ width: '100%', height: 220, borderRadius: 18 }} resizeMode="contain" />;
    if (block.type === 'list') return <View key={index} style={{ gap: 10 }}>{block.items.map((item, i) =>
      <View key={i} style={{ flexDirection: 'row', gap: 12 }}><Txt>{block.ordered ? `${i + 1}.` : '•'}</Txt><RichText html={item} /></View>)}</View>;
    return <ScrollView key={index} horizontal accessibilityLabel={block.headers.join(', ')}><View>
      {[block.headers, ...block.rows].map((row, ri) => <View key={ri} style={{ flexDirection: 'row' }}>{block.headers.map((_, ci) =>
        <View key={ci} style={{ width: 170, padding: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: ri === 0 ? colors.primarySoft : colors.surface }}>
          <Txt style={{ fontWeight: ri === 0 ? '700' : '400' }}>{row[ci] ?? ''}</Txt></View>)}</View>)}
    </View></ScrollView>;
  })}</View>;
}
