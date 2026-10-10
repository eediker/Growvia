# Windows setup and a phone-test APK

This path builds on your own computer. It needs no Expo cloud account, EAS subscription, Docker, .NET SDK, or local PostgreSQL installation. The app continues to use the configured Supabase test project.

## Install

| Tool | Selection | Purpose |
| --- | --- | --- |
| [Node.js](https://nodejs.org/en/download) | Version 24, Windows installer | JavaScript tools; includes npm |
| [Temurin JDK](https://adoptium.net/temurin/releases/?version=17) | JDK 17, Windows x64 MSI for a standard Intel/AMD PC | Java toolchain for Android builds |
| [Android Studio](https://developer.android.com/studio) | Stable Windows installer | SDK manager, emulator, native debugging |
| [VS Code](https://code.visualstudio.com/download) | Windows installer, if not already installed | Main TypeScript/React editor |
| [Git for Windows](https://git-scm.com/downloads/win) | If not already installed | Version control and later GitHub publishing |

After Node installation, open a new PowerShell window and install the project's package manager:

```powershell
npm install --global pnpm@11.19.0
```

Node, pnpm, Git, JDK 17, and the Android SDK are installed on this workstation. On another computer, check that they are also available in your normal PowerShell.

## Android Studio components

Finish the initial setup wizard. Open **More Actions → SDK Manager**, or **Settings → Languages & Frameworks → Android SDK**.

Install Android SDK Platform 36 (Android 16) under SDK Platforms. Under SDK Tools install Platform-Tools, Build-Tools 36.0.0, and Command-line Tools (latest). Enable Show Package Details if necessary to select a particular version. Install Android Emulator only if you want a virtual phone; it is not required to build an APK for your physical phone.

These SDK versions match the installed React Native dependency defaults and [Expo's Android setup guide](https://docs.expo.dev/workflow/android-studio-emulator/). The generated Gradle project is authoritative if it requests additional SDK/NDK/CMake components during the first build. Android Studio/Gradle may download those after their licenses are accepted; you do not need a separate system-wide Gradle installation.

## Environment variables

In Windows **Edit environment variables for your account**:

| Variable | Value |
| --- | --- |
| `JAVA_HOME` | Your JDK 17 installation directory, without `bin` |
| `ANDROID_HOME` | Android Studio's SDK Location, usually `C:\Users\eedik\AppData\Local\Android\Sdk` |

Add `%JAVA_HOME%\bin`, `%ANDROID_HOME%\platform-tools`, and optionally `%ANDROID_HOME%\emulator` to your user Path. Open a new terminal afterward. If building from Android Studio, select the same JDK 17 in its Gradle JDK settings.

```powershell
node --version
pnpm --version
git --version
java -version
adb --version
```

Expected major versions are Node 24 and Java 17; pnpm is pinned to 11.19.0. If `adb` or `java` is not recognized, fix installation/Path before attempting a build. See [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).

## Run and check the project

```powershell
cd C:\Users\eedik\source\Growvia
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm web
```

Use `pnpm start` for a compatible Expo Go session. After prebuild, `pnpm android` compiles and installs a standalone debug app without starting Metro. Android Studio Run provides the same terminal-free workflow. Browser DevTools help inspect JavaScript and Supabase requests; React Native DevTools and Android Studio Logcat help with native sessions.

## Build a standalone APK after tools are installed

From the repository root:

```powershell
pnpm android:prebuild
cd apps/mobile/android
.\gradlew.bat :app:assembleRelease
```

Stop if either command fails. `android:prebuild` generates the native Android project from Expo configuration without compiling it. Gradle then bundles the JavaScript and compiles the APK. The expected output is `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` relative to the repository root. The first build downloads native dependencies and can take substantially longer than subsequent builds.

Expo's generated Android template normally signs local release builds with its development key. Verify the generated signing configuration before distributing a build. This is suitable only for the phone-test prototype, not a Play Store release; production needs a private signing key and release setup. Do not commit signing keys. See [Android command-line builds](https://developer.android.com/build/building-cmdline).

Transfer the APK to your phone and open it, allowing installation from that specific file source when Android asks. Alternatively, enable USB debugging, authorize your computer on the phone, then run `adb install -r <path-to-apk>`.

The installed APK does not need Expo running on your computer. Supabase features need internet and a confirmed account; the offline demo works without either. Changing `appsettings.json` requires rebuilding the APK.

The release build completed successfully and was installed and launched on the Android emulator. Sign-in screen rendering, offline home, activity details, and saving activity completion were checked without a logged crash. The tested APK is copied to `artifacts/kids-guide-0.1.0-universal.apk`. It declares Android 7.0 (API 24) or newer and includes ARM64, ARMv7, x86, and x86_64 native libraries. Signature verification passed. Physical-phone installation and hosted authenticated flows still need verification.

## Open in Android Studio — no terminal required

1. Open `apps/mobile/android` in Android Studio and let Gradle sync finish.
2. Start your virtual phone from Device Manager, or select your connected phone.
3. Select the `app` run configuration and the `debug` build variant.
4. Click **Run ▶**. Once installed, you can also open **Kids Guide** directly from the device's app launcher.

Both debug and release builds now package their JavaScript and images. Neither needs a running Metro server, a terminal, or `adb reverse`. Supabase features still need internet; the offline demo does not.

After editing JavaScript, TypeScript, images or settings, click **Run** again to rebuild and install the updated app. Live JavaScript refresh and the React Native developer menu are disabled in this standalone Android configuration. Native Android debugging remains available because the APK is still an Android debug build.

The checked-in Expo plugin `apps/mobile/plugins/withStandaloneAndroid.cjs` configures both Gradle bundling and the native host, so the setting survives prebuild. Do not remove just one half: packaging without changing the host can still leave the debug app looking for Metro.

Previously installed APKs are not changed by editing the source. Run once from Android Studio to replace an older Metro-dependent debug installation. Metro commands remain available for browser/Expo workflows, but are not required by this Android app.

## Windows native-build troubleshooting

Three separate issues were identified during the first build:

1. **Mixed dependency layouts.** The root resolved flattened packages, but old links in `apps/mobile/node_modules` still pointed into `.pnpm`. The committed `nodeLinker: hoisted` setting requires a fresh installation when switching from an existing isolated layout. Stop build processes and remove both root and app `node_modules` before reinstalling with the unchanged lockfile. Verify package resolution from `apps/mobile`, not just the repository root. Generated Android autolinking output and CMake caches must also be regenerated after changing dependency paths.
2. **Java selection overridden.** Android Studio generated `android/gradle/gradle-daemon-jvm.properties` requesting Java 25. This takes precedence over `JAVA_HOME`. The local file now requests `toolchainVersion=17`; verify Launcher JVM and Daemon JVM with `gradlew.bat --version`. Do not retain Java 25 download URLs when changing these criteria to 17.
3. **Old Ninja executable.** The SDK's CMake 3.22.1 bundled Ninja 1.10.2, which failed with `Filename longer than 260 characters` even after dependency paths were corrected. On this workstation, `Sdk/cmake/3.22.1/bin/ninja.exe` was updated to official Ninja 1.13.2. The old executable is backed up in ignored `.local/ninja-1.10.2.exe`. An SDK reinstall may replace it, so check the exact executable named in the failed command, not a different Ninja on PATH.

The downloaded [official Ninja 1.13.2 Windows archive](https://github.com/ninja-build/ninja/releases/tag/v1.13.2) was verified against the release's SHA-256 digest: `07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65`. Neither the downloaded executable nor the backup belongs in Git. For another machine, use the official release and verify its checksum before installing. Reanimated's [Windows build guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/) recommends Ninja 1.12 or newer.

Gradle's warning about future Gradle 10 compatibility is not itself a build failure. Diagnose the failing task and its first native error instead of upgrading Gradle speculatively.

## GitHub

The source repository is `eediker/Growvia`. Dependencies, generated Android/iOS directories, APKs, local archives/tools, environment secrets, and signing keys are ignored. GitHub Actions runs type checking, tests, and a web export; it does not publish the app or modify Supabase.

After cloning, follow the setup and prebuild steps above to regenerate the native Android project locally.
