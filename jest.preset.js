const nxPreset = require('@nx/jest/preset').default;
const { resolve } = require('node:path');
const { createDefaultPreset } = require('ts-jest');

/** @type {import('jest').Config} */
module.exports = {
  ...createDefaultPreset(),
  ...nxPreset,
  displayName: process.env.NX_TASK_TARGET_PROJECT,
  silent: true,
  clearMocks: true,
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '.*/main.ts',
    '.*/index.ts',
    'yaml/.*',
    '.*\\.yaml',
    'tests/.*',
    'config/.*',
    '.*\\.(config|provider|module|mock|secret|enum|dto|decorator|spec)\\.ts',
  ],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'node'],
  collectCoverage: true,
  reporters: ['default', 'jest-sonar'],
  coverageReporters: ['lcov', 'cobertura', 'text', 'text-summary'],
  testResultsProcessor: 'jest-sonar-reporter',
  coverageDirectory: resolve(__dirname, 'coverage', process.env.NX_TASK_TARGET_PROJECT),
};
