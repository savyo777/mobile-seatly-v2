/**
 * Custom Expo config plugin that injects the Google Maps SDK keys into
 * the native projects at prebuild time WITHOUT routing them through
 * plugin props (which would persist in `expo config --type public` and
 * end up readable at runtime via Constants.expoConfig).
 *
 * Reads `process.env.GOOGLE_MAPS_API_KEY_ANDROID` and
 * `process.env.GOOGLE_MAPS_API_KEY_IOS` directly during the prebuild
 * mod phase, so the keys appear only in:
 *   - AndroidManifest.xml (com.google.android.geo.API_KEY meta-data)
 *   - Info.plist (GMSApiKey) and AppDelegate (GMSServices.provideAPIKey)
 *
 * Google Maps SDK keys are expected to live in the native binary by
 * design — the security boundary is the per-platform key restriction
 * configured in Google Cloud Console (package name + SHA-1 for Android,
 * bundle id for iOS). Keeping them out of the JS-readable manifest just
 * removes one extra exposure surface beyond what's already required.
 */

const {
  withAndroidManifest,
  withInfoPlist,
  withAppDelegate,
  AndroidConfig,
} = require('@expo/config-plugins');

const ANDROID_META_DATA_NAME = 'com.google.android.geo.API_KEY';
const APP_DELEGATE_MARKER = 'GMSServices.provideAPIKey';

function withAndroidMapsApiKey(config, apiKey) {
  return withAndroidManifest(config, (cfg) => {
    if (!apiKey) return cfg;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      ANDROID_META_DATA_NAME,
      apiKey,
    );
    return cfg;
  });
}

function withIosMapsApiKey(config, apiKey) {
  let next = config;
  if (!apiKey) return next;

  next = withInfoPlist(next, (cfg) => {
    cfg.modResults.GMSApiKey = apiKey;
    return cfg;
  });

  next = withAppDelegate(next, (cfg) => {
    if (cfg.modResults.contents.includes(APP_DELEGATE_MARKER)) {
      return cfg;
    }

    const lang = cfg.modResults.language;
    if (lang === 'swift') {
      // Swift AppDelegate: insert just after `import` block, before the
      // class declaration. RN-CLI templates use `import UIKit` and
      // `import Expo`; we add `import GoogleMaps` + the provideAPIKey
      // call at didFinishLaunchingWithOptions entry.
      cfg.modResults.contents = cfg.modResults.contents
        .replace(
          /(import UIKit\n)/,
          `$1import GoogleMaps\n`,
        )
        .replace(
          /(func application\([^)]*didFinishLaunchingWithOptions[^)]*\)[^\{]*\{\n)/,
          `$1    GMSServices.provideAPIKey("${apiKey}")\n`,
        );
    } else {
      // Objective-C AppDelegate: traditional Expo template.
      cfg.modResults.contents = cfg.modResults.contents
        .replace(
          /(#import "AppDelegate\.h"\n)/,
          `$1#import <GoogleMaps/GoogleMaps.h>\n`,
        )
        .replace(
          /(didFinishLaunchingWithOptions:\(NSDictionary \*\)launchOptions\n\{\n)/,
          `$1    [GMSServices provideAPIKey:@"${apiKey}"];\n`,
        );
    }

    return cfg;
  });

  return next;
}

module.exports = function withMapsApiKey(config) {
  const androidKey = (process.env.GOOGLE_MAPS_API_KEY_ANDROID || '').trim();
  const iosKey = (process.env.GOOGLE_MAPS_API_KEY_IOS || '').trim();

  let next = config;
  next = withAndroidMapsApiKey(next, androidKey);
  next = withIosMapsApiKey(next, iosKey);
  return next;
};
