// @ts-check

const fs = require('fs')
const path = require('path')

const tsConfig = fs.existsSync('tsconfig.json')
  ? path.resolve('tsconfig.json')
  : fs.existsSync('types/tsconfig.json')
  ? path.resolve('types/tsconfig.json')
  : undefined

/** @type {import("eslint").Linter.Config} */
const eslintConfig = {
  extends: [
    'next/core-web-vitals',
    require.resolve('./import'),
    'plugin:prettier/recommended',
  ],
  plugins: ['tailwindcss'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'no-unused-vars': ['off'],
    'react/jsx-sort-props': ['warn', { reservedFirst: ['key'] }],
    'tailwindcss/classnames-order': ['warn'],
  },
  overrides: [
    {
      files: ['**/*.json', '**/*.json5', '**/*.jsonc'],
      extends: ['plugin:jsonc/recommended-with-json', 'plugin:jsonc/prettier'],
    },
    {
      files: ['**/*.d.ts', '**/*.ts', '**/*.tsx'],
      extends: [
        'plugin:prettier/recommended',
        'plugin:react-i18n/recommended',
        'plugin:i18next/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: tsConfig,
      },
      plugins: ['@typescript-eslint', 'regex'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['off'],
        'i18next/no-literal-string': [
          'warn',
          {
            mode: 'jsx-only',
            'jsx-attributes': {
              include: [
                'label',
                'placeholder',
                'alt',
                'title',
                'aria-label',
                'aria-placeholder',
                'name',
                'description',
                'subtitle',
                'emoji',
              ],
            },
            words: {
              exclude: [
                // Defaults wrapped in whitespace.
                '\\s*[0-9!-/:-@[-`{-~]+\\s*',
                '\\s*[A-Z_-]+\\s*',
              ],
            },
          },
        ],
        'regex/invalid': [
          'error',
          [
            {
              regex: '(\\bt\\(\\s*\'[^\\.\']+\'|i18nKey="[^\\."]+")',
              message:
                'No top-level i18n keys allowed. Organize top-level keys into a nested object.',
            },
          ],
        ],
      },
    },
  ],
}

module.exports = eslintConfig
