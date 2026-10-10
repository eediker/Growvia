import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const parent = 'a1000000-0000-4000-8000-000000000001';
const otherParent = 'a1000000-0000-4000-8000-000000000002';
const teacher = 'a1000000-0000-4000-8000-000000000003';
const otherTeacher = 'a1000000-0000-4000-8000-000000000004';
const editor = 'a1000000-0000-4000-8000-000000000005';
const child = '10000000-0000-4000-8000-000000000001';
const otherChild = '10000000-0000-4000-8000-000000000002';
const classroom = '20000000-0000-4000-8000-000000000001';
const otherClass = '20000000-0000-4000-8000-000000000002';

async function asUser(id, action) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await action(); }
  finally { await db.exec('reset role'); }
}
async function scalar(sql, args = []) { return (await db.query(sql, args)).rows[0].value; }

before(async () => {
  // A minimal Auth boundary for SQL tests. It models Supabase's signed subject;
  // it does not claim to test the hosted Auth service or its JWT verification.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', 'fixture@example.test') $$;
    grant usage on schema auth, public to authenticated, anon;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant select on storage.objects to anon;
  `);
  await db.exec(await readFile(new URL('../migrations/202609180001_foundation.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../migrations/20261010193837_guide_cms.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../migrations/20261010194836_child_edit.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../seed.sql', import.meta.url), 'utf8'));
  for (const [id, name] of [[parent, 'Deniz'], [otherParent, 'Alex'], [teacher, 'Elif'], [otherTeacher, 'Sam'], [editor, 'Editor']])
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [id, `${name}@example.test`, JSON.stringify({ name, can_publish: true })]);
  await db.query('update public.kg_profiles set can_publish = true where id = $1', [editor]);
  await db.exec(`
    insert into public.kg_schools values ('30000000-0000-4000-8000-000000000001', 'School A'), ('30000000-0000-4000-8000-000000000002', 'School B');
    insert into public.kg_classes values ('${classroom}', '30000000-0000-4000-8000-000000000001', 'Sunflowers'), ('${otherClass}', '30000000-0000-4000-8000-000000000002', 'Stars');
    insert into public.kg_class_teachers values ('${classroom}', '${teacher}'), ('${otherClass}', '${otherTeacher}');
    insert into public.kg_children values ('${child}', 'Ada', (current_date - interval '42 months')::date), ('${otherChild}', 'Robin', (current_date - interval '60 months')::date);
    insert into public.kg_guardians values ('${child}', '${parent}'), ('${otherChild}', '${otherParent}');
    insert into public.kg_enrollments values ('${classroom}', '${child}'), ('${otherClass}', '${otherChild}');
  `);
});
after(async () => { await db.close(); });

test('child editing is guardian-only and validates age on direct updates too', async () => {
  await asUser(parent, async () => {
    const before = (await scalar('select public.kg_children() as value'))[0];
    const result = await scalar('select public.kg_update_child($1,$2,$3) as value', [child, ' Ada edited ', before.dateOfBirth]);
    assert.equal(result.name, 'Ada edited');
    await assert.rejects(db.query('select public.kg_update_child($1,$2,$3)', [otherChild, 'Forbidden', before.dateOfBirth]), /notFound/);
    await assert.rejects(db.query("update public.kg_children set date_of_birth = current_date where id = $1", [child]), /invalid/);
    await db.query('select public.kg_update_child($1,$2,$3)', [child, before.name, before.dateOfBirth]);
  });
  await asUser(teacher, async () => {
    await assert.rejects(db.query("select public.kg_update_child($1,'Forbidden',(current_date - interval '3 years')::date)", [child]), /notFound/);
  });
});

test('guide CMS permissions, bilingual blocks, ordering, and immutable icon snapshots', async () => {
  const guide = 'guide-cms-test';
  const category = 'cms-test-category';
  const icon = 'cms-test-icon';
  const translations = Object.fromEntries(['tr', 'en'].map(language => [language, {
    title: `CMS ${language}`, summary: 'Structured guide', body: 'Body', materials: [], steps: [], parentTip: '', safetyNote: '',
    contentBlocks: [{ type: 'heading', text: 'Heading' }, { type: 'paragraph', html: '<strong>Bold</strong>' },
      { type: 'list', ordered: true, items: ['One'] }, { type: 'table', headers: ['Title'], rows: [['Cell']] },
      { type: 'image', url: 'https://example.test/image.png', alt: 'Image' }],
  }]));
  await asUser(parent, async () => {
    assert.equal((await scalar('select public.kg_guide_categories() as value')).length, 6);
    await assert.rejects(db.query("insert into public.kg_guide_categories(id,names) values('forbidden','{\"tr\":\"Test\",\"en\":\"Test\"}')"), /row-level security/);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('guide-media','forbidden.png')"), /row-level security/);
    assert.deepEqual((await db.query("delete from public.kg_content where id = 'guide-five' returning id")).rows, []);
  });
  await asUser(editor, async () => {
    await db.query('insert into public.kg_guide_categories(id,names,sort_order) values($1,$2,5)', [category, JSON.stringify({ tr: 'Test', en: 'Test' })]);
    await db.query('insert into public.kg_guide_icons(id,name,image_url) values($1,$2,$3)', [icon, 'Test', 'https://example.test/old.png']);
    await db.query(`insert into public.kg_content(id,kind,status,area,min_age_months,max_age_months,duration_minutes,translations,category_id,icon_id,related_activity_id)
      values($1,'guide','published','connection',12,95,5,$2,$3,$4,'activity-colors')`, [guide, JSON.stringify(translations), category, icon]);
    await db.query('update public.kg_guide_icons set image_url = $1 where id = $2', ['https://example.test/new.png', icon]);
    await db.query('update public.kg_content set sort_order = 3, icon_image_url_snapshot = $1 where id = $2', ['https://example.test/forged.png', guide]);
    assert.equal((await scalar('select public.kg_content_by_id($1) as value', [guide])).iconUrl, 'https://example.test/old.png');
    await assert.rejects(db.query('delete from public.kg_guide_icons where id = $1', [icon]), /permission denied/);
    await assert.rejects(db.query('update public.kg_content set related_activity_id = $1 where id = $2', ['guide-five', guide]), /invalid/);
    const invalid = structuredClone(translations); invalid.en.contentBlocks = [{ type: 'image', url: 'javascript:alert(1)' }];
    await assert.rejects(db.query('update public.kg_content set translations = $1 where id = $2', [JSON.stringify(invalid), guide]), /kg_content_valid_blocks/);
    await db.query("insert into storage.objects(bucket_id,name) values('guide-media','allowed.png')");
  });
  await asUser(parent, async () => {
    const result = await scalar('select public.kg_guide_list($1) as value', [category]);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, guide);
    assert.equal(result.items[0].translations.en.contentBlocks.length, 5);
    assert.equal(result.items[0].relatedActivityId, 'activity-colors');
    assert.deepEqual((await db.query('update public.kg_guide_icons set name = $1 where id = $2 returning id', ['Forged', icon])).rows, []);
  });
  await db.exec('set role anon');
  try {
    await assert.rejects(db.query('select public.kg_guide_categories()'), /permission denied/);
    assert.equal((await db.query("select * from storage.objects where bucket_id = 'guide-media'")).rows.length, 1);
  } finally { await db.exec('reset role'); }
  await asUser(editor, async () => {
    assert.deepEqual((await db.query("delete from public.kg_content where id = 'activity-colors' returning id")).rows, []);
    await db.query('delete from public.kg_content where id = $1', [guide]);
    await db.query('delete from public.kg_guide_categories where id = $1', [category]);
  });
});

test('anonymous users cannot access tables or application RPCs', async () => {
  await db.exec('set role anon');
  try {
    await assert.rejects(db.query('select * from public.kg_children'), /permission denied/);
    await assert.rejects(db.query('select public.kg_children()'), /permission denied/);
    await assert.rejects(db.query('select public.kg_content_list()'), /permission denied/);
  } finally { await db.exec('reset role'); }
});

test('parents see only their children, school and class', async () => asUser(parent, async () => {
  assert.deepEqual((await scalar('select public.kg_children() as value')).map(c => c.id), [child]);
  const classes = await scalar('select public.kg_classes() as value');
  assert.equal(classes.length, 1);
  assert.equal(classes[0].id, classroom);
  assert.equal(classes[0].canPost, false);
  assert.equal((await db.query('select * from public.kg_schools')).rows.length, 1);
  await assert.rejects(db.query('select public.kg_posts($1)', [otherClass]), /notFound/);
  await assert.rejects(db.query('select public.kg_completions($1)', [otherChild]), /notFound/);
}));

test('metadata and profile updates cannot grant publishing or classroom membership', async () => asUser(parent, async () => {
  const me = await scalar('select public.kg_me() as value');
  assert.equal(me.canEditContent, false);
  await assert.rejects(db.query('update public.kg_profiles set can_publish = true where id = $1', [parent]), /permission denied/);
  await assert.rejects(db.query('insert into public.kg_class_teachers values($1,$2)', [otherClass, parent]), /permission denied/);
  await assert.rejects(db.query('insert into public.kg_guardians values($1,$2)', [otherChild, parent]), /permission denied/);
}));

test('teacher shares once, parent follows the linked activity, another class is inaccessible', async () => {
  const id = randomUUID();
  await asUser(teacher, async () => {
    assert.equal((await scalar('select public.kg_me() as value')).isTeacher, true);
    assert.deepEqual(await scalar('select public.kg_children() as value'), []);
    const args = [classroom, id, 'activity-colors', 'We explored colors today.', 'en'];
    await db.query('select public.kg_share_activity($1,$2,$3,$4,$5)', args);
    await db.query('select public.kg_share_activity($1,$2,$3,$4,$5)', args);
    await assert.rejects(db.query('select public.kg_share_activity($1,$2,$3,$4,$5)', [otherClass, randomUUID(), ...args.slice(2)]), /notFound/);
    await assert.rejects(db.query('select public.kg_completions($1)', [child]), /notFound/);
  });
  await asUser(parent, async () => {
    const posts = await scalar('select public.kg_posts($1) as value', [classroom]);
    assert.equal(posts.items.filter(p => p.id === id).length, 1);
    assert.equal(posts.items.find(p => p.id === id).teacherName, 'Elif');
    const item = await scalar('select public.kg_content_by_id($1) as value', ['activity-colors']);
    assert.equal(item.translations.en.title, 'A little color hunt');
    await assert.rejects(db.query('select public.kg_share_activity($1,$2,$3,$4,$5)', [classroom, randomUUID(), 'activity-colors', 'Hello', 'en']), /notFound/);
  });
});

test('completion retries are idempotent, repeat attempts are preserved and undo is scoped', async () => {
  const id = randomUUID(), repeat = randomUUID();
  await asUser(parent, async () => {
    for (const attempt of [id, id, repeat]) await db.query('select public.kg_complete($1,$2,$3)', [child, 'activity-colors', attempt]);
    const history = await scalar('select public.kg_completions($1) as value', [child]);
    assert.equal(history.filter(c => c.id === id).length, 1);
    assert.equal(history.filter(c => c.id === repeat).length, 1);
    await assert.rejects(db.query('select public.kg_complete($1,$2,$3)', [child, 'activity-leaves', id]), /conflict/);
    await db.query('select public.kg_remove_completion($1,$2)', [child, id]);
    assert.ok(!(await scalar('select public.kg_completions($1) as value', [child])).some(c => c.id === id));
  });
  await asUser(otherParent, async () => {
    await assert.rejects(db.query('select public.kg_remove_completion($1,$2)', [child, repeat]), /notFound/);
    await assert.rejects(db.query('select public.kg_complete($1,$2,$3)', [child, 'activity-colors', randomUUID()]), /notFound/);
  });
});

test('published content is bilingual; drafts stay private; filtering precedes pagination', async () => {
  await asUser(editor, async () => {
    await db.exec("insert into public.kg_content select 'draft-example', kind, 'draft', area, min_age_months, max_age_months, duration_minutes, translations from public.kg_content where id = 'activity-colors'");
    await assert.rejects(db.exec("insert into public.kg_content select 'incomplete-example', kind, 'published', area, min_age_months, max_age_months, duration_minutes, translations - 'tr' from public.kg_content where id = 'activity-colors'"), /kg_content_complete_translations/);
  });
  await asUser(parent, async () => {
    assert.equal((await db.query("select * from public.kg_content where id = 'draft-example'")).rows.length, 0);
    await assert.rejects(db.query("select public.kg_content_by_id('draft-example')"), /notFound/);
    const page = await scalar("select public.kg_content_list('activity',12,null,'en',0,1) as value");
    assert.equal(page.total, 2);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].minAgeMonths, 12);
    const search = await scalar("select public.kg_content_list(null,null,'yaprak','tr',0,10) as value");
    assert.ok(search.items.some(c => c.id === 'activity-leaves'));
    await assert.rejects(db.exec("update public.kg_content set status='published' where id='draft-example'"), /row-level security|permission denied/).catch(async error => {
      // UPDATE can also safely affect zero rows when SELECT RLS hides the draft.
      assert.equal((await db.query("select * from public.kg_content where id='draft-example'")).rows.length, 0);
      if (!String(error).includes('Missing expected rejection')) throw error;
    });
  });
});

test('child creation atomically attaches only the caller and validates the age range', async () => {
  let created;
  await asUser(parent, async () => {
    await assert.rejects(db.query("select public.kg_create_child('Baby',current_date)"), /invalid/);
    created = await scalar("select public.kg_create_child('New explorer',(current_date - interval '2 years')::date) as value");
    assert.ok((await scalar('select public.kg_children() as value')).some(c => c.id === created.id));
  });
  await asUser(otherParent, async () => assert.ok(!(await scalar('select public.kg_children() as value')).some(c => c.id === created.id)));
});
