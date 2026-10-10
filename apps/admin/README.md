# Guide CMS admin

This adapts the V25.0.1 admin to Growvia's existing `kg_*` schema and bilingual catalog.

1. Apply `supabase/migrations/20261010193837_guide_cms.sql` and `supabase/migrations/20261010194836_child_edit.sql` after the foundation migration. For a fresh project, apply all migrations in filename order, then `supabase/seed.sql`.
2. A trusted database administrator grants an editor permission with `update public.kg_profiles set can_publish = true where id = '<editor Auth UUID>';`. Registration metadata cannot grant this permission.
3. Local development uses the project's HTTPS URL and **publishable** key (`sb_publishable_...`) from `apps/mobile/appsettings.json`. These are public settings; never put a secret/service-role key in browser code.
4. Run `pnpm admin` (or `node scripts/serve-admin.mjs`) and open <http://127.0.0.1:4174>. Sign in with the authorized editor account.

The admin uses the pinned Supabase browser module `2.116.0` from jsDelivr. Internet access is required to load it. To host the admin, edit `apps/admin/config.js` with the public connection settings and serve the five files in this folder over HTTPS. The local development server generates that configuration response from the mobile settings instead of serving the placeholder file. There are no shared editor credentials.

## Editing

- Guides open from categories in the mobile app. Categories require Turkish and English names and support illustration upload and numeric ordering.
- Select a guide category, icon, optional cover and related activity. Give both languages a title, summary and content. Language switching and adding/removing blocks preserve unsaved fields. Copying opens an unsaved draft; it is published only when saved.
- Blocks support headings, subheadings, paragraphs, bold selection, bullet/numbered lists, tables and inline HTTPS images. Lists use one item per line. Table cells use `|` separators and one row per line. Upload an inline image through the icon/category/cover upload tools, then use its public URL in the image block.
- Save publishes directly. Guide/category deletion requires confirmation. Categories in use cannot be deleted. Icons have no delete permission or control.
- Category and guide numeric order sort ascending, with ID as a deterministic tie breaker. Guide order applies within its selected category.
- The database captures the icon image URL when selected and keeps it on later guide edits. Library uploads use unique object URLs; updating an icon does not overwrite old media. Do not overwrite snapshot media through privileged tools.

`guide-media` is a public editorial image bucket, limited to PNG/JPEG/WebP and 5 MB. Upload, replace and delete access requires `kg_profiles.can_publish`. Do not put classroom/child media in this bucket. Inline and cover imagery are automatically placed by the app; the editor does not design layouts.

Run `node --test scripts/admin.test.mjs supabase/tests/rls.test.mjs` from the repository root for editor payload and database authorization checks. Hosted Auth, Storage uploads and physical devices require a deployment smoke test; local SQL tests emulate the Storage schema and signed subjects.
