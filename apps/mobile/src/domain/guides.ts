import { z } from 'zod';

export const mediaUrlSchema = z.string().url().refine(value => value.startsWith('https://'), 'HTTPS image required');
export const guideBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string().max(2000) }),
  z.object({ type: z.literal('subheading'), text: z.string().max(2000) }),
  z.object({ type: z.literal('paragraph'), html: z.string().max(20000) }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(z.string().max(2000)).max(100) }),
  z.object({ type: z.literal('table'), headers: z.array(z.string().max(2000)).min(1).max(20), rows: z.array(z.array(z.string().max(2000)).max(20)).max(100) }),
  z.object({ type: z.literal('image'), url: mediaUrlSchema, alt: z.string().max(1000).optional() }),
]);
export type GuideBlock = z.infer<typeof guideBlockSchema>;
export const guideCategorySchema = z.object({
  id: z.string(), names: z.object({ tr: z.string(), en: z.string() }),
  illustrationUrl: mediaUrlSchema.nullish(), sortOrder: z.number().int(),
});
export type GuideCategory = z.infer<typeof guideCategorySchema>;
export const defaultGuideCategories: GuideCategory[] = [
  ['development-periods', 'Gelişim Dönemleri', 'Development stages'],
  ['behavior-guide', 'Davranış Rehberi', 'Understanding behavior'],
  ['parenting-approach', 'Ebeveynlik ve Yaklaşım', 'Parenting approaches'],
  ['daily-life', 'Günlük Yaşam', 'Everyday life'],
  ['emotional-social', 'Duygusal ve Sosyal Gelişim', 'Emotional and social development'],
  ['cognitive-language-motor', 'Bilişsel, Dil ve Motor Gelişim', 'Thinking, language and movement'],
].map(([id, tr, en], index) => ({ id: id!, names: { tr: tr!, en: en! }, sortOrder: (index + 1) * 10 }));

/** Only strong/bold markup is interpreted. All other tags become plain text. */
export function richTextParts(html: string): { text: string; bold: boolean }[] {
  let bold = false;
  return html.split(/(<\/?(?:strong|b)>)/gi).filter(Boolean).flatMap(part => {
    if (/^<(?:strong|b)>$/i.test(part)) { bold = true; return []; }
    if (/^<\/(?:strong|b)>$/i.test(part)) { bold = false; return []; }
    const text = part.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    return [{ text, bold }];
  });
}
