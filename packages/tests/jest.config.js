/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
module.exports = {
  ...require('../../jest.config'),

  testTimeout: 90_000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  transformIgnorePatterns: ['node_modules/(?!nanoid)/'],
  moduleNameMapper: {
    '^nanoid(/(.*)|$)': 'nanoid$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
      },
    ],
  },
}
