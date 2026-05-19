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
 */

const appJson = require('./app.json');
const withMapsApiKey = require('./plugins/withMapsApiKey');

const baseExpo = appJson.expo;
const basePlugins = Array.isArray(baseExpo.plugins) ? baseExpo.plugins : [];

module.exports = () => {
  let config = {
    ...baseExpo,
    plugins: basePlugins,
  };

  // Apply the env-driven Maps key plugin last so it sees the fully
  // resolved Android/iOS sections from app.json + any earlier plugins.
  config = withMapsApiKey(config);

  return config;
};
