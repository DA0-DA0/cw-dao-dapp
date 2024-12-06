/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
module.exports = {
  ...require('../../jest.config'),

  // custom transpiler for nanoid that supports JS
  preset: 'ts-jest/presets/js-with-ts',
  transformIgnorePatterns: ['node_modules/(?!nanoid|react-markdown|vfile)/'],
  moduleNameMapper: {
    '^nanoid(/(.*)|$)': 'nanoid$1',
    '^react-markdown(/(.*)|$)': 'react-markdown$1',
    '^vfile(/(.*)|$)': 'vfile$1',
    '^.+\\.css$': 'identity-obj-proxy',
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
