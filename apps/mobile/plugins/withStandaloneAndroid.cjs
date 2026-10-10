// Android Studio's default debug APK must launch without a running Metro server.
// Keep this in a config plugin because android/ is generated and git-ignored.
function bundleAllVariants(source) {
  const marker = '// Kids Guide: bundle JavaScript in Android Studio debug builds.';
  if (source.includes(marker)) return source;
  if (!/^react \{/m.test(source)) throw new Error('Standalone Android: React Gradle block was not found.');
  return source.replace(/^react \{/m, `react {\n    ${marker}\n    debuggableVariants = []`);
}

function usePackagedBundle(source) {
  const marker = '// Kids Guide: load the packaged bundle, without Metro.';
  if (source.includes(marker)) return source;
  const anchor = 'context = applicationContext,';
  if (!source.includes('ExpoReactHostFactory.getDefaultReactHost(') || !source.includes(anchor)) {
    throw new Error('Standalone Android: unsupported MainApplication template.');
  }
  return source.replace(anchor, `${anchor}\n      ${marker}\n      useDevSupport = false,`);
}

function withStandaloneAndroid(config) {
  const { withAppBuildGradle, withMainApplication, withDangerousMod } = require('expo/config-plugins');
  config = withDangerousMod(config, ['android', async mod => {
    const fs = require('node:fs/promises');
    const path = require('node:path');
    // Preserve the project's Java 17 requirement after regenerating android/.
    const directory = path.join(mod.modRequest.platformProjectRoot, 'gradle');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'gradle-daemon-jvm.properties'), 'toolchainVersion=17\n');
    return mod;
  }]);
  config = withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') throw new Error('Standalone Android requires the Expo Groovy template.');
    mod.modResults.contents = bundleAllVariants(mod.modResults.contents);
    return mod;
  });
  return withMainApplication(config, mod => {
    if (mod.modResults.language !== 'kt') throw new Error('Standalone Android requires the Expo Kotlin template.');
    mod.modResults.contents = usePackagedBundle(mod.modResults.contents);
    return mod;
  });
}
module.exports = withStandaloneAndroid;
module.exports.bundleAllVariants = bundleAllVariants;
module.exports.usePackagedBundle = usePackagedBundle;
