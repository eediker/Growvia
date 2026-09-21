# Managed online setup

Supabase provides managed PostgreSQL and authentication. The application is configured to start online against test project `rkubweunhopblqkduyfg`. Its migration and seed have already been applied by the project owner. Use the instructions below for a new project; do not rerun the foundation migration on the existing one. Switch `dataMode` to `offline` for the local demo.

1. Create a new Supabase project. In its SQL editor, execute `migrations/202609180001_foundation.sql`, then `seed.sql`, in that order. The migration is applied once; the content seed can be rerun without overwriting existing content.
2. Create confirmed pilot users through the Authentication dashboard. Choose private passwords there. The auth trigger creates their profiles. There are no shared cloud demo credentials or public registration screens.
3. Copy the project HTTPS URL and **publishable** key (`sb_publishable_...`) into `apps/mobile/appsettings.json`. Set `dataMode` to `online`. Restart Expo after editing configuration; rebuild installed APKs to include new connection settings.
4. Sign in as a parent and add a child in the app. For the teacher/classroom demonstration, provision membership using `provision-pilot.sql`: replace its two UUID placeholders with the teacher's Auth user ID and the child's `kg_children.id`, then execute it in the trusted SQL editor. It creates a pilot school/class and links the existing records. Run it once per intended new pilot classroom.
5. Sign in as the teacher, share an activity, then sign in as the parent to continue it at home. Online personas are determined by database relationships, not the demo selector.

```json
{
  "dataMode": "online",
  "supabase": {
    "url": "https://YOUR_PROJECT.supabase.co",
    "publishableKey": "sb_publishable_YOUR_KEY"
  }
}
```

Merge those fields into the existing configuration; retain its other fields. This adapter deliberately requires a new publishable key rather than a legacy anon JWT key. Never place secret/service-role keys in the app. Supabase documents the distinction in [API keys](https://supabase.com/docs/guides/getting-started/api-keys) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

All `kg_` tables use RLS. Anonymous access is denied. Guardians see their own children's records, teachers share only to assigned classes, and publishing permission cannot be granted through profile updates or signup metadata. A trusted administrator may explicitly set `kg_profiles.can_publish` for an authorized editor. There is no editor UI yet. Creating users or assigning relationships through admin tools is privileged work.

The sample library comes from `shared/demo-content.json`; run `pnpm seed:generate` after intentional sample changes. Seed content is for demonstrations and needs editorial review before release. The original prototype SQL is archived and must not be applied on top of this foundation.

Run `pnpm test:cloud` for PostgreSQL policy tests using PGlite, with no hosted account required. These execute the actual migration and seed with authenticated/anonymous database roles and simulated JWT claims. They do not test Supabase's hosted authentication service, email delivery, or project configuration. Those need a real project smoke test before a pilot.

Cloud storage persists independently of local demo resets. Changing the configured Supabase project does not migrate data or users. Select a hosting plan according to its current limits and availability requirements; this implementation makes no promise of permanently free hosting.
