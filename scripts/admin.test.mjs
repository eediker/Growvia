import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloneGuide, esc, guidePayload, newGuide } from '../apps/admin/model.mjs';

test('admin escapes imported content and rejects unsafe image URLs', () => {
  assert.equal(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  const draft = newGuide();
  draft.category_id = 'daily-life';
  for (const text of Object.values(draft.translations)) {
    text.title = 'Title'; text.summary = 'Summary'; text.contentBlocks = [{ type: 'paragraph', html: 'Hello <strong>world</strong>' }];
  }
  draft.icon_image_url_snapshot = 'https://fake.example/icon.png';
  const payload = guidePayload(draft, () => 'test-id');
  assert.equal(payload.status, 'published');
  assert.equal(payload.translations.en.body, 'Hello world');
  assert.equal(payload.icon_image_url_snapshot, undefined);
  assert.equal(draft.id, '');
  assert.equal(cloneGuide({ ...payload, id: 'original' }).id, '');
  assert.equal(cloneGuide(payload).status, 'draft');
  draft.cover_image_url = 'javascript:alert(1)';
  assert.throws(() => guidePayload(draft), /HTTPS/);
});
test('direct publishing requires both translations', () => {
  const draft = newGuide(); draft.category_id = 'daily-life';
  draft.translations.tr.title = 'Başlık';
  assert.throws(() => guidePayload(draft), /Her iki dilde/);
});
