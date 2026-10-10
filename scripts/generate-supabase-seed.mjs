import { readFile, writeFile } from 'node:fs/promises';

const content = JSON.parse(await readFile(new URL('../shared/demo-content.json', import.meta.url), 'utf8'));
const json = JSON.stringify(content.map(item => ({ ...item,
  categoryId: item.kind === 'guide' ? 'parenting-approach' : null,
  sortOrder: item.id === 'guide-repeat' ? 20 : 10,
})), null, 2);
if (json.includes('$kgseed$')) throw new Error('Unexpected SQL delimiter in content');
const sql = `-- Generated from shared/demo-content.json; run pnpm seed:generate to update.\n-- Sample content only. Existing content is never overwritten. No users or credentials.\ninsert into public.kg_content(id, kind, status, area, min_age_months, max_age_months, duration_minutes, translations, category_id, sort_order)\nselect id, kind, status, area, "minAgeMonths", "maxAgeMonths", "durationMinutes", translations, "categoryId", "sortOrder"\nfrom jsonb_to_recordset($kgseed$${json}$kgseed$::jsonb) as c(\n  id text, kind text, status text, area text, "minAgeMonths" integer, "maxAgeMonths" integer, "durationMinutes" integer, translations jsonb, "categoryId" text, "sortOrder" integer\n) on conflict(id) do nothing;\n`;
await writeFile(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log(`Generated ${content.length} bilingual content records.`);
