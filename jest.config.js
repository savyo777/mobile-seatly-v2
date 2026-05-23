// Tests are Node-only logic checks (no React rendering, no native modules).
// We use babel-jest with babel-preset-expo to parse ESM from expo-* + react-native
// packages, then ts-jest for our TS source. This is lighter than the full
// jest-expo preset (which tries to mock UIManager / NativeUnimoduleProxy on a
// jsdom-style environment we don't need + collides with our local
// __tests__/mocks/react-native.js override).
// Audit fix 2026-05-22 item #14.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    // .ts/.tsx → ts-jest (typechecked transform)
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', allowJs: true } }],
    // .js/.mjs (the ESM expo + RN deps) → babel-jest with babel-preset-expo.
    // This is what unblocks `import Constants from 'expo-constants'` etc.
    '^.+\\.(js|mjs)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  // Whitelist the Expo / RN ESM packages so they're transformed instead of
  // skipped (Jest default skips ALL node_modules). Anything not matching
  // the `(?!...)` block stays untouched.
  transformIgnorePatterns: [
    'node_modules/(?!(?:expo|@expo|expo-modules-core|expo-.*|expo-router|expo-secure-store|expo-notifications|expo-linking|expo-constants|expo-application|expo-crypto|react-native|@react-native|@react-native-async-storage|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^react-native$': '<rootDir>/__tests__/mocks/react-native.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^@cenaiva/assistant$': '<rootDir>/packages/assistant/src/index.ts',
    '^@cenaiva/types$': '<rootDir>/packages/types/index.ts',
  },
  // expo-modules-core references the React-Native global `__DEV__` which
  // doesn't exist in Node test env. Define it as a runtime global so the
  // require chain (lib/auth/AuthContext → lib/notifications/pushToken →
  // expo-constants → expo-modules-core) doesn't throw ReferenceError.
  // Audit fix 2026-05-22 item #14.
  globals: {
    __DEV__: false,
  },
};
