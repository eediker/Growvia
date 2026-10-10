# V25.0.1 integration

Reference: `Downloads/kids-guide-structured-v25.0.1(1)/v25_0_1`. Its manifests describe a V24.3.9 → V25 guide CMS and visual update; the older `DIFF_MANIFEST.md` is retained in that reference and is not the current version contract. The master requirements file describes the wider product roadmap, including features the V25 manifest explicitly defers.

## Applied

- Six bilingual guide categories, shown before category content lists.
- Compact guide rows with title, summary and optional snapshot icon, without large covers in lists.
- Long-form guide details: optional hero cover, headings, subheadings, paragraphs with bold text, bullet/numbered lists, horizontally scrollable tables and inline images. Legacy body text still renders. Related activity CTA opens a real published activity.
- Guide repository methods on the existing gateway: scoped catalog RPCs, category/search filters, ordering and pagination. Online errors are shown, not replaced with demo content.
- `kg_guide_categories`, `kg_guide_icons`, guide metadata on `kg_content`, server-enforced icon snapshots, editor RLS, structured-block validation and the public editorial image bucket.
- Web admin in `apps/admin`: editor sign-in, bilingual guide editing, direct publication, confirmed deletion, copying, category/icon management, media upload and numeric ordering.
- New attached child/class hub and splash PNGs. Turkish shows the full hub artwork; English crops its embedded Turkish labels and uses translated text. Version `0.25.1`, Android/iOS build `37`.
- Child selection and editing are separate actions. Add/edit returns to the originating profile or classroom area; updates validate real dates and retain guardian-only access. Navigating between content IDs resets activity completion state.

## Compatibility

The repository's Expo 57, React Native 0.86, Expo Router, pnpm and standalone Android setup remain in use. The reference's manual router, Expo 54 dependencies, password fallback and separate `profiles`/`guides` schema were not substituted for the existing application. Existing uncommitted V24 integration was preserved.

The bilingual 1–7 catalog remains authoritative. The reference's Turkish-only seed and wider health/age catalog were not automatically published. Demo guides map to Parenting approaches; other categories initially show an empty state. Existing hosted guides receive that initial category in the migration, and new-project sample seeds include it too.

Teacher/school administration and Story/Activity CMS are deferred in the supplied V25 manifest. They are not implemented by this guide integration. Existing prototype classroom tools retain their demo-only boundaries.

## Deployment and verification

No hosted database writes, publication, Git commit or push were performed. The guide CMS and child-edit migrations are ready for the configured project; its foundation must already exist. Applying them enables the new online guide screens and child editing. See [admin setup](../apps/admin/README.md) and [Supabase setup](../supabase/README.md).

Verified: TypeScript check, 30 mobile tests, 13 database/admin/Android packaging tests, and production web export. SQL tests run all migrations and the generated seed against PGlite, with authenticated/anonymous roles, simulated JWT subjects and a minimal Storage schema. They cover guide authorizations, block validation, activity linkage, icon snapshot persistence, media write restrictions and guardian-only child editing. Browser checks verified category navigation, ordered guide rows, the related activity CTA, admin sign-in rendering and child editing's return to the profile. Read-only hosted Supabase checks timed out; no hosted schema verification was possible. Hosted Auth/Storage and physical Android/iOS builds are separate deployment checks.
