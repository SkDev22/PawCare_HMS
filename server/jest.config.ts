import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@pawcare/shared$': '<rootDir>/../packages/shared/src/index.ts',
  },
  globalSetup: undefined,
  globalTeardown: undefined,
};

export default config;
