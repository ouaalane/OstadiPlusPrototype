const {
  withAndroidManifest,
  withMainActivity,
} = require('expo/config-plugins');

const MARKER = '// oustadi: secure window before React mounts';
function secureMainActivity(source, language) {
  if (source.includes(MARKER)) return source;
  const kotlin = language === 'kt' || language === 'kotlin';
  const statement = kotlin
    ? 'window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)'
    : 'getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);';
  const match = /(^[\t ]*)super\.onCreate\([^\n]*\)[;]?/m;
  if (!match.test(source))
    throw new Error(
      'Capture protection: MainActivity.onCreate not found; refusing an unprotected build',
    );
  return source.replace(
    match,
    (_, indent) => `${indent}${MARKER}\n${indent}${statement}\n${_}`,
  );
}
function withCaptureProtection(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application)
      throw new Error('Capture protection: Android application missing');
    application.$['android:allowAudioPlaybackCapture'] = 'false';
    return mod;
  });
  return withMainActivity(config, (mod) => {
    mod.modResults.contents = secureMainActivity(
      mod.modResults.contents,
      mod.modResults.language,
    );
    return mod;
  });
}
module.exports = withCaptureProtection;
module.exports.secureMainActivity = secureMainActivity;
