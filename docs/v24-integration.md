# V24.3.5 prototype integration

Source: `kids-guide-structured-v24.3.5.zip`. The extracted reference is kept under ignored `.local/reference/v24.3.5`.

## Integrated

- Opening illustration and short fade; existing session restoration and email registration retained.
- Illustrated My child / My class hub using the current account's display name.
- Separate navigation for each area; My class is not a child-area tab.
- Child home with child selection, daily suggestion and four colourful feature cards.
- Separate activity, story and guide lists, illustrated details and existing search/age filtering.
- Child profile and account settings, retaining existing child creation.
- Development reflection screen and weekly activity count, without scores or diagnoses.
- Classroom feed connected to the existing gateway, including teacher publishing permissions.
- Class-to-home transition with the activity ID and classroom return destination preserved.
- Completion screen shown only after a successful save, including undo.
- Demo announcements, teacher notes and gallery, with a full-image viewer.
- Device-local demo medication records and story-read markers; reset with the demo.
- Turkish and English labels throughout the new screens. Turkish lettering embedded in the supplied hub images is cropped out of the displayed illustration, and translated labels are rendered separately.

## Compatibility decisions

This is an adaptation into the current application, not replacement with the older standalone project. Expo 57, React Native 0.86, Expo Router, pnpm and the Android build setup remain unchanged. The ZIP's Expo 54 dependencies, EAS configuration and manual screen router were not copied.

The existing `kg_*` Supabase schema and bilingual 1–7 catalog remain authoritative. The ZIP's separate database migrations were not applied, and its Turkish-only catalog (including wider age ranges and health guidance) was not substituted for the existing catalog. No live database writes were performed by this integration.

The ZIP's classroom extras are prototypes. Online accounts see an explicit unavailable state for these tools; they never see fictional classroom records presented as real. Demo medication records do not schedule notifications, provide medical advice, or sync to a school. Story-read markers are demo-only. The next backend phase needs scoped tables/RPCs and access-policy tests for these features.

The ZIP's nonfunctional social-login buttons, forgot-password control, remember-me checkbox, likes and comment counts were not copied as working features. Existing secure mobile session persistence remains enabled; Google/Apple and password recovery still need their actual integrations. No local password-storage fallback was imported.

## Validation

Type checking, 32 tests and a production web export passed during integration. Browser checks verified the hub, classroom navigation, linked activity transition, successful completion, return to classroom and gallery viewer. Physical Android/iOS testing and hosted authenticated signup remain separate checks. No APK was built or GitHub push made for this change.

## Android development

Android debug and release builds now include their JavaScript. Open the generated Android project in Android Studio, select your emulator and click Run. See [Windows setup](windows-android-setup.md) for the standalone build configuration. Rebuild after source changes; Metro is no longer required by the installed Android app.
