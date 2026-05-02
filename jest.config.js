module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^react-native$': '<rootDir>/__tests__/mocks/react-native.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^@cenaiva/assistant$': '<rootDir>/packages/assistant/src/index.ts',
    '^@cenaiva/types$': '<rootDir>/packages/types/index.ts',
  },
};
