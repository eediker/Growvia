# Kids Guide

A bilingual mobile pre-prototype for parents and kindergarten teachers supporting children aged 1–7. Discover activities, stories, and practical parenting guides; share a classroom activity and continue it at home. Completion records represent time together, not developmental scores or diagnoses.

## Stack

React Native 0.86, Expo SDK 57, React 19, TypeScript 6, Expo Router, TanStack Query, Zod, and i18next. Supabase provides authentication and PostgreSQL with row-level access controls. The offline demo uses AsyncStorage; native authentication sessions use SecureStore. There is no separately hosted application server.

## Start

Install Node.js 24 and pnpm 11.19.0, then run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm web
```

For Android tools and APK instructions, follow [Windows setup](docs/windows-android-setup.md). Android Studio is only needed for native Android work; the browser preview works without it.

## Connection settings

Edit `apps/mobile/appsettings.json`:

| Setting | Meaning |
| --- | --- |
| `dataMode` | `online` for Supabase; `offline` for fictional local data |
| `supabase.url` | Supabase project HTTPS URL |
| `supabase.publishableKey` | Public client key beginning `sb_publishable_` |
| `network.timeoutMs` | Request timeout |
| `defaultLanguage` | `tr`, `en`, or `system`; saved user choice takes precedence |
| `demo.defaultPersona` | `parent` or `teacher` in the offline demo |

The current settings point to the owner's test Supabase project. Restart Expo after editing settings; rebuild an APK to change its bundled settings. Changing projects does not move accounts or records. A publishable key is public client configuration; database passwords, secret/service-role keys, and signing credentials must never be committed or bundled.

The owner has applied the schema and sample-content seed. Authentication connectivity and anonymous-access denial have been checked. Real authenticated reads and writes still need verification with a pilot account. See [Supabase setup](supabase/README.md) for creating confirmed users and assigning classroom membership.

## Try the demo

Choose the offline demo on the sign-in screen. In Settings, switch Turkish/English or Parent/Teacher. As Teacher, share an activity from My class. Switch to Parent, open the post, continue at home, and save or undo completion. Ten bilingual sample entries are included. Teacher-written messages retain their original language.

Demo records stay on the device. Resetting the demo does not affect Supabase. An online request failure does not silently fall back to fictional data.

## Repository

```text
apps/mobile/                  Screens, translations, configuration, data adapters
shared/demo-content.json      Bilingual sample library
supabase/                     Migrations, seed, access-policy tests, setup
scripts/                      Sample-seed generation
docs/                         Architecture and Windows/Android setup
.github/workflows/checks.yml   Automated checks for pushes and pull requests
```

The previous prototype is preserved locally under ignored `.local/reference/`; it is not part of the new GitHub project. Generated native projects, dependencies, local tooling, APKs, credentials, and build output are also excluded from Git.

## Verify

```sh
pnpm typecheck
pnpm test
pnpm export:web
```

Tests cover domain rules, offline persistence, Supabase adapter behavior, native session-storage chunking, and PostgreSQL access policies. Database tests use PGlite without a cloud account. They do not exercise hosted Supabase login or native device behavior.

## Pre-prototype boundaries

This is ready for further prototype development, not public production deployment. The release APK builds successfully and emulator checks cover startup, offline navigation, and saving activity completion. Physical-phone installation and authenticated cloud testing remain pending. Pilot accounts and classroom membership are administered through Supabase; onboarding, recovery, invitations, content-authoring UI, account deletion/export, media, notifications, offline synchronization of real accounts, and AI are not included. Sample content needs qualified editorial review before a public release.

See [architecture decisions](docs/architecture.md). Pushing source code runs the foundation checks; it does not deploy the app or apply database migrations.
