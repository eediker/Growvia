export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function httpsUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Görseller HTTPS adresi kullanmalıdır.');
  return url.href;
}
export const emptyTranslation = () => ({ title: '', summary: '', body: '', materials: [], steps: [], parentTip: '', safetyNote: '', contentBlocks: [] });
export function newGuide() {
  return { id: '', kind: 'guide', status: 'published', area: 'connection', category_id: '', sort_order: 10,
    icon_id: null, cover_image_url: null, related_activity_id: null, min_age_months: 12, max_age_months: 95,
    duration_minutes: 5, translations: { tr: emptyTranslation(), en: emptyTranslation() } };
}
export function cloneGuide(guide) { return { ...structuredClone(guide), id: '', status: 'draft' }; }
export function freshBlock(type) {
  if (type === 'heading' || type === 'subheading') return { type, text: '' };
  if (type === 'list' || type === 'ordered') return { type: 'list', ordered: type === 'ordered', items: [] };
  if (type === 'table') return { type, headers: [''], rows: [] };
  if (type === 'image') return { type, url: '', alt: '' };
  return { type: 'paragraph', html: '' };
}
export function legacyBlocks(text) {
  return text.contentBlocks?.length ? text.contentBlocks : text.body.split(/\n\n+/).filter(Boolean).map(html => ({ type: 'paragraph', html }));
}
function plain(html) { return html.replace(/<[^>]*>/g, '').trim(); }
export function validateBlocks(blocks) {
  const string = (v, max) => typeof v === 'string' && v.length <= max;
  if (!Array.isArray(blocks) || blocks.length > 100) throw new Error('En fazla 100 içerik bloğu ekleyin.');
  for (const b of blocks) {
    let valid = false;
    if (b.type === 'heading' || b.type === 'subheading') valid = string(b.text, 2000);
    if (b.type === 'paragraph') valid = string(b.html, 20000);
    if (b.type === 'list') valid = typeof b.ordered === 'boolean' && Array.isArray(b.items) && b.items.length <= 100 && b.items.every(v => string(v, 2000));
    if (b.type === 'image') valid = !!httpsUrl(b.url) && (b.alt === undefined || string(b.alt, 1000));
    if (b.type === 'table') valid = Array.isArray(b.headers) && b.headers.length >= 1 && b.headers.length <= 20 && b.headers.every(v => string(v, 2000)) && Array.isArray(b.rows) && b.rows.length <= 100 && b.rows.every(row => Array.isArray(row) && row.length <= 20 && row.every(v => string(v, 2000)));
    if (!valid) throw new Error('İçerik bloğu geçersiz veya çok uzun.');
  }
}
export function guidePayload(draft, uuid = () => crypto.randomUUID()) {
  const payload = structuredClone(draft);
  payload.id ||= `guide-${uuid()}`;
  payload.kind = 'guide'; payload.status = 'published';
  if (!payload.category_id) throw new Error('Kategori seçin.');
  payload.icon_id ||= null; payload.related_activity_id ||= null;
  payload.cover_image_url = httpsUrl(payload.cover_image_url);
  // The trigger owns snapshot values; clients must not overwrite them.
  delete payload.icon_image_url_snapshot;
  for (const language of ['tr', 'en']) {
    const text = payload.translations[language];
    text.title = text.title.trim(); text.summary = text.summary.trim();
    if (!text.title || text.title.length > 150 || !text.summary || text.summary.length > 1000) throw new Error('Her iki dilde başlık ve özet gereklidir.');
    validateBlocks(text.contentBlocks);
    if (text.contentBlocks.length) text.body = text.contentBlocks.map(block => block.html ? plain(block.html) : block.text || block.items?.map(plain).join('\n') || block.headers?.join(' | ') || block.alt || 'Görsel').join('\n\n');
    if (!text.body.trim() || text.body.length > 20000) throw new Error('Her iki dilde içerik gereklidir (en fazla 20000 karakter).');
  }
  return payload;
}
