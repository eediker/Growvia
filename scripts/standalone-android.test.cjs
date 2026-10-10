const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bundleAllVariants, usePackagedBundle } = require('../apps/mobile/plugins/withStandaloneAndroid.cjs');

test('prebuild repeatedly keeps both JavaScript packaging and host loading configured', () => {
  const gradle = bundleAllVariants('apply plugin: "com.facebook.react"\nreact {\n    bundleCommand = "export:embed"\n}\n');
  const kotlin = usePackagedBundle('ExpoReactHostFactory.getDefaultReactHost(\n      context = applicationContext,\n      packageList = packages\n)');
  assert.match(gradle, /debuggableVariants = \[\]/);
  assert.match(kotlin, /useDevSupport = false,/);
  assert.equal(bundleAllVariants(gradle), gradle);
  assert.equal(usePackagedBundle(kotlin), kotlin);
});
test('template changes fail visibly instead of silently restoring the Metro dependency', () => {
  assert.throws(() => bundleAllVariants('plugins {}'), /not found/);
  assert.throws(() => usePackagedBundle('DifferentHost()'), /unsupported/);
});
