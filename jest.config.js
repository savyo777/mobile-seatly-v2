module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    // Also transform .mjs/.js so ESM-only deps (expo-*, @expo/*, react-native)
    // can be parsed. Without `allowJs: true` ts-jest would skip them, and
    // without listing them in transformIgnorePatterns below Jest would feed
    // raw ESM to Node's CommonJS loader → "Cannot use import statement
    // outside a module". Audit fix 2026-05-22 item #14.
    '^.+\\.(ts|tsx|mjs|js)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', allowJs: true } }],
  },
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
};
