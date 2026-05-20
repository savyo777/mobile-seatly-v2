/**
 * Dynamic Expo config. Reads the static base from app.json then layers
 * environment-driven values that should never be committed.
 *
 * Why this file exists: Google Maps SDK keys (Android + iOS) must be
 * baked into AndroidManifest.xml / Info.plist at native build time, but
 * cannot live in app.json (committed) or as plugin props (visible at
 * runtime via Constants.expoConfig). The custom withMapsApiKey plugin
 * at plugins/withMapsApiKey.js reads them straight from process.env
 * during prebuild and writes only the native files — the JS-readable
 * manifest never sees the keys.
 *
 * Local values live in .env (gitignored). EAS Build cloud jobs read
 * them from the build environment configured via `eas secret:create`.
 *
 * iOS Google Maps support requires the `GoogleMaps` CocoaPod to be
 * linked into the .xcworkspace. react-native-maps' bundled config
 * plugin handles that linking when `iosGoogleMapsApiKey` is set on
 * the plugin props. We pass a non-secret placeholder to trigger the
 * pod include + AppDelegate scaffolding; our withMapsApiKey plugin
 * then runs AFTER and overwrites the Info.plist + AppDelegate values
 * with the real env-driven key, so the placeholder never ships to a
 * device. Same trick keeps the Android side clean — react-native-maps'
 * plugin handles meta-data registration, and our plugin overwrites
 * with the real value.
 */

const appJson = require('./app.json');
const withMapsApiKey = require('./plugins/withMapsApiKey');

const baseExpo = appJson.expo;
const basePlugins = Array.isArray(baseExpo.plugins) ? baseExpo.plugins : [];

// Non-secret placeholder. Replaced by withMapsApiKey (which reads
// process.env.GOOGLE_MAPS_API_KEY_IOS / _ANDROID) during prebuild. If
// the env vars are missing the placeholder remains, which the Google
// Maps SDK will reject at runtime with a clean "invalid key" error
// rather than silently rendering broken tiles.
const MAPS_KEY_PLACEHOLDER = 'PLACEHOLDER_OVERWRITTEN_BY_WITHMAPSAPIKEY';

module.exports = () => {
  let config = {
    ...baseExpo,
    plugins: [
      ...basePlugins,
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: MAPS_KEY_PLACEHOLDER,
          androidGoogleMapsApiKey: MAPS_KEY_PLACEHOLDER,
        },
      ],
    ],
  };

  // Apply the env-driven Maps key plugin last so it overwrites
  // whatever react-native-maps wrote with the real key from .env.
  config = withMapsApiKey(config);

  return config;
};
