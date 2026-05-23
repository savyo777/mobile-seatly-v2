// Jest mock for expo-constants. The real module pulls in
// expo-modules-core which references React-Native runtime globals
// (TurboModuleRegistry, EventEmitter from NativeEventEmitter) that
// don't exist in a Node test environment. Tests that transitively
// import auth/notifications code (which calls Constants.expoConfig
// at module-eval time) hit "Cannot read properties of undefined
// (reading 'EventEmitter')" without this mock.
//
// Returns the minimum surface our app code reads: a default-export
// object with `expoConfig.extra` empty + the helper getters we use.
const stub = {
  expoConfig: {
    extra: {},
    slug: 'cenaiva-test',
    scheme: 'cenaiva',
    version: '1.0.0',
  },
  manifest: null,
  manifest2: null,
  appOwnership: 'standalone',
  executionEnvironment: 'standalone',
  installationId: 'test-install',
  sessionId: 'test-session',
  deviceName: 'jest',
  isDevice: false,
  platform: { ios: { buildNumber: '1' } },
};

module.exports = stub;
module.exports.default = stub;
