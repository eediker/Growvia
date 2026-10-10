import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';
import { esc, httpsUrl, newGuide, cloneGuide, freshBlock, legacyBlocks, guidePayload } from './model.mjs';

const cfg = window.KIDS_GUIDE_ADMIN_CONFIG || {};
const configured = /^https:\/\//.test(cfg.supabaseUrl || '') && cfg.supabasePublishableKey?.startsWith('sb_publishable_');
const supabase = configured ? createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
const app = document.querySelector('#app');
const state = { tab: 'guides', categories: [], icons: [], guides: [], activities: [], draft: null, language: 'tr', search: '', busy: false };
const $ = selector => app.querySelector(selector);
const $$ = selector => [...app.querySelectorAll(selector)];

async function run(action) {
  if (state.busy) return;
  state.busy = true;
  $$('button').forEach(button => { button.disabled = true; });
  try { await action(); }
  catch (error) { alert(error.message || 'İşlem tamamlanamadı.'); }
  finally { state.busy = false; $$('button').forEach(button => { button.disabled = false; }); }
}
async function checked(query) { const result = await query; if (result.error) throw result.error; return result.data; }
async function load() {
  const [categories, icons, guides, activities] = await Promise.all([
    checked(supabase.from('kg_guide_categories').select('*').order('sort_order').order('id')),
    checked(supabase.from('kg_guide_icons').select('*').order('name')),
    checked(supabase.from('kg_content').select('*').eq('kind', 'guide').order('sort_order').order('id')),
    checked(supabase.from('kg_content').select('id,translations').eq('kind', 'activity').eq('status', 'published').order('id')),
  ]);
  Object.assign(state, { categories, icons, guides, activities });
}
async function boot() {
  if (!configured) { app.innerHTML = '<main class="auth"><h1>Kids Guide Admin</h1><p>config.js dosyasına Supabase HTTPS adresini ve publishable anahtarını ekleyin.</p></main>'; return; }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return login();
  const me = await checked(supabase.rpc('kg_me'));
  if (!me.canEditContent) { app.innerHTML = '<main class="auth"><h1>Editör erişimi gerekli</h1><p>Bu hesaba içerik yayınlama izni verilmemiş.</p><button id="logout">Çıkış Yap</button></main>'; $('#logout').onclick = () => run(logout); return; }
  await load(); render();
}
async function logout() { await checked(supabase.auth.signOut()); state.draft = null; login(); }
function login() {
  app.innerHTML = '<main class="auth"><h1>Kids Guide Admin</h1><form id="login"><label>E-posta<input name="email" type="email" autocomplete="username" required></label><label>Şifre<input name="password" type="password" autocomplete="current-password" required></label><button class="primary">Giriş Yap</button></form></main>';
  $('#login').onsubmit = event => { event.preventDefault(); const data = new FormData(event.currentTarget); run(async () => {
    await checked(supabase.auth.signInWithPassword({ email: data.get('email').trim(), password: data.get('password') })); await boot();
  }); };
}
function render() {
  const titles = { guides: 'Rehber İçerikleri', categories: 'Kategoriler', icons: 'İkon Kütüphanesi' };
  app.innerHTML = `<main class="shell"><aside><div class="brand"><strong>Kids Guide</strong><small>Admin</small></div><nav>${Object.entries(titles).map(([key, title]) => `<button data-tab="${key}" class="nav ${state.tab === key ? 'active' : ''}">${title}</button>`).join('')}</nav><button id="logout" class="logout">Çıkış Yap</button></aside><section class="main"><header><h1>${titles[state.tab]}</h1><button id="new" class="primary">+ Yeni ${state.tab === 'guides' ? 'içerik' : state.tab === 'categories' ? 'kategori' : 'ikon'}</button></header><div id="content"></div></section></main>`;
  $('#logout').onclick = () => run(logout);
  $$('[data-tab]').forEach(button => { button.onclick = () => { if (state.draft && !confirm('Kaydedilmemiş değişikliklerden çıkılsın mı?')) return; state.draft = null; state.tab = button.dataset.tab; render(); }; });
  $('#new').onclick = () => state.tab === 'guides' ? edit(newGuide()) : catalogForm();
  if (state.tab === 'guides') renderGuides(); else renderCatalog();
}
function edit(guide) {
  state.draft = structuredClone(guide); state.language = 'tr';
  for (const text of Object.values(state.draft.translations)) text.contentBlocks = legacyBlocks(text);
  editor();
}
function renderGuides() {
  $('#content').innerHTML = '<label>Başlığa göre ara<input id="search"></label><div id="list"></div>';
  $('#search').value = state.search;
  $('#search').oninput = event => { state.search = event.target.value; guideList(); };
  guideList();
}
function guideList() {
  const guides = state.guides.filter(guide => Object.values(guide.translations).some(text => text.title.toLocaleLowerCase('tr').includes(state.search.toLocaleLowerCase('tr'))));
  $('#list').innerHTML = guides.map(g => `<article class="card"><div class="card-main"><h3>${esc(g.translations.tr.title)}</h3><p>${esc(state.categories.find(c => c.id === g.category_id)?.names.tr || 'Kategori yok')}</p><small>${esc(g.status)} · ${g.sort_order}</small></div><div class="card-actions"><button data-edit="${esc(g.id)}">Düzenle</button><button data-copy="${esc(g.id)}">Kopyala</button><button data-delete="${esc(g.id)}" class="danger">Sil</button></div></article>`).join('') || '<p>Henüz içerik yok.</p>';
  $$('[data-edit]').forEach(b => { b.onclick = () => edit(state.guides.find(g => g.id === b.dataset.edit)); });
  $$('[data-copy]').forEach(b => { b.onclick = () => edit(cloneGuide(state.guides.find(g => g.id === b.dataset.copy))); });
  $$('[data-delete]').forEach(b => { b.onclick = () => { if (confirm('Bu rehber içeriği silinsin mi?')) run(async () => {
    await checked(supabase.from('kg_content').delete().eq('id', b.dataset.delete).eq('kind', 'guide').select('id').single()); await load(); render();
  }); }; });
}
function options(items, selected, label) { return items.map(item => `<option value="${esc(item.id)}" ${item.id === selected ? 'selected' : ''}>${esc(label(item))}</option>`).join(''); }
function editor() {
  const g = state.draft, text = g.translations[state.language];
  $('#content').innerHTML = `<div class="panel"><div class="panel-head"><h2>${g.id ? 'İçeriği Düzenle' : 'Yeni Rehber İçeriği'}</h2><button id="close">Kapat</button></div>
    <label>Kategori<select data-guide="category_id"><option value="">Kategori seç</option>${options(state.categories, g.category_id, c => c.names.tr)}</select></label>
    <label>Kategori içi sıra<input data-guide="sort_order" type="number" step="1" value="${g.sort_order}"></label>
    <label>İkon<select data-guide="icon_id"><option value="">İkon yok</option>${options(state.icons, g.icon_id, i => i.name)}</select></label>
    <label>Kapak görseli (HTTPS)<input data-guide="cover_image_url" value="${esc(g.cover_image_url)}" type="url"></label>
    <label>Kapak yükle<input id="coverUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <label>İlgili etkinlik<select data-guide="related_activity_id"><option value="">Etkinlik bağlama</option>${options(state.activities, g.related_activity_id, a => a.translations.tr.title)}</select></label>
    <label>Dil<select id="language"><option value="tr" ${state.language === 'tr' ? 'selected' : ''}>Türkçe</option><option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option></select></label>
    <label>Başlık<input data-text="title" maxlength="150" value="${esc(text.title)}"></label>
    <label>Özet<textarea data-text="summary" maxlength="1000">${esc(text.summary)}</textarea></label>
    <div class="editor-blocks">${text.contentBlocks.map(blockEditor).join('')}</div>
    <div class="block-toolbar">${[['heading','Başlık'],['subheading','Alt başlık'],['paragraph','Paragraf'],['list','Madde listesi'],['ordered','Numaralı liste'],['table','Tablo'],['image','Görsel']].map(([type, label]) => `<button data-add="${type}">${label}</button>`).join('')}</div>
    <p class="muted">Her iki dilde başlık, özet ve içerik gereklidir. Sıra küçükten büyüğe uygulanır. İkon görseli ilk seçimde sabitlenir.</p><button id="save" class="primary wide">Kaydet ve Yayınla</button></div>`;
  $('#close').onclick = () => { if (confirm('Kaydedilmemiş değişikliklerden çıkılsın mı?')) { state.draft = null; renderGuides(); } };
  $('#language').onchange = event => { state.language = event.target.value; editor(); };
  $$('[data-guide]').forEach(input => { input.oninput = () => { g[input.dataset.guide] = input.type === 'number' ? Number(input.value) : input.value || null; }; });
  $$('[data-text]').forEach(input => { input.oninput = () => { text[input.dataset.text] = input.value; }; });
  $$('[data-block-field]').forEach(input => { input.oninput = () => {
    const b = text.contentBlocks[Number(input.dataset.index)], field = input.dataset.blockField;
    b[field] = field === 'items' ? input.value.split('\n') : field === 'headers' ? input.value.split('|').map(v => v.trim()) : field === 'rows' ? input.value.split('\n').filter(Boolean).map(row => row.split('|').map(v => v.trim())) : input.value;
  }; });
  $$('[data-add]').forEach(b => { b.onclick = () => { text.contentBlocks.push(freshBlock(b.dataset.add)); editor(); }; });
  $$('[data-remove]').forEach(b => { b.onclick = () => { text.contentBlocks.splice(Number(b.dataset.remove), 1); editor(); }; });
  $$('[data-bold]').forEach(b => { b.onclick = () => {
    const input = $(`[data-index="${b.dataset.bold}"][data-block-field="html"]`), start = input.selectionStart, end = input.selectionEnd;
    input.setRangeText(`<strong>${input.value.slice(start, end)}</strong>`, start, end, 'select'); input.oninput(); input.focus();
  }; });
  $('#coverUpload').onchange = event => { const file = event.target.files[0]; if (file) run(async () => { g.cover_image_url = await upload(file); editor(); }); };
  $('#save').onclick = () => run(async () => {
    const payload = guidePayload(g); await checked(supabase.from('kg_content').upsert(payload).select('id').single());
    state.draft = null; await load(); render();
  });
}
function blockEditor(b, index) {
  const input = (field, value, multiline = false) => `<label>${esc(field)}${multiline ? `<textarea data-index="${index}" data-block-field="${field}">${esc(value)}</textarea>` : `<input data-index="${index}" data-block-field="${field}" value="${esc(value)}">`}</label>`;
  const fields = b.type === 'paragraph' ? `<button data-bold="${index}" type="button">Kalın (seçili metin)</button>${input('html', b.html, true)}` :
    b.type === 'heading' || b.type === 'subheading' ? input('text', b.text) : b.type === 'list' ? input('items', b.items.join('\n'), true) :
    b.type === 'image' ? input('url', b.url) + input('alt', b.alt || '') : input('headers', b.headers.join(' | ')) + input('rows', b.rows.map(row => row.join(' | ')).join('\n'), true);
  return `<div class="block"><div class="block-head"><strong>${esc(b.type)}</strong><button data-remove="${index}">Kaldır</button></div>${fields}</div>`;
}
function renderCatalog() {
  const categories = state.tab === 'categories', items = categories ? state.categories : state.icons;
  $('#content').innerHTML = items.map(item => `<article class="card"><div class="card-main"><h3>${esc(categories ? item.names.tr : item.name)}</h3><p>${esc(categories ? item.names.en : item.image_url || '')}</p>${categories ? `<small>Sıra: ${item.sort_order}</small>` : ''}</div><button data-edit="${esc(item.id)}">Düzenle</button>${categories ? `<button data-delete="${esc(item.id)}" class="danger">Sil</button>` : ''}</article>`).join('');
  $$('[data-edit]').forEach(b => { b.onclick = () => catalogForm(items.find(i => i.id === b.dataset.edit)); });
  $$('[data-delete]').forEach(b => { b.onclick = () => { if (confirm('Kategori silinsin mi? Kullanılan kategoriler silinemez.')) run(async () => {
    await checked(supabase.from('kg_guide_categories').delete().eq('id', b.dataset.delete).select('id').single()); await load(); render();
  }); }; });
}
function catalogForm(item) {
  const categories = state.tab === 'categories';
  $('#content').innerHTML = `<form class="panel" id="catalogForm"><label>${categories ? 'Türkçe ad' : 'Ad'}<input name="name" required maxlength="150" value="${esc(categories ? item?.names.tr : item?.name)}"></label>${categories ? `<label>English name<input name="en" required maxlength="150" value="${esc(item?.names.en)}"></label><label>Sıra<input name="order" type="number" step="1" value="${item?.sort_order ?? 10}"></label>` : ''}<label>Görsel URL (HTTPS)<input name="url" type="url" value="${esc(categories ? item?.illustration_url : item?.image_url)}"></label><label>Görsel yükle<input name="file" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="primary">Kaydet</button><button type="button" id="cancel">İptal</button></form>`;
  $('#cancel').onclick = render;
  $('#catalogForm').onsubmit = event => { event.preventDefault(); const data = new FormData(event.currentTarget); run(async () => {
    let url = httpsUrl(data.get('url')); const file = data.get('file'); if (file?.size) url = await upload(file);
    const payload = categories ? { id: item?.id || `category-${crypto.randomUUID()}`, names: { tr: data.get('name').trim(), en: data.get('en').trim() }, sort_order: Number(data.get('order')), illustration_url: url } : { id: item?.id || `icon-${crypto.randomUUID()}`, name: data.get('name').trim(), image_url: url };
    await checked(supabase.from(categories ? 'kg_guide_categories' : 'kg_guide_icons').upsert(payload).select('id').single()); await load(); render();
  }); };
}
async function upload(file) {
  const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  if (!extensions[file.type] || file.size > 5242880) throw new Error('PNG, JPEG veya WebP seçin (en fazla 5 MB).');
  // Unique, immutable object URLs keep existing guide snapshots stable.
  const path = `${crypto.randomUUID()}.${extensions[file.type]}`;
  await checked(supabase.storage.from('guide-media').upload(path, file, { contentType: file.type, upsert: false }));
  return supabase.storage.from('guide-media').getPublicUrl(path).data.publicUrl;
}
run(boot);
