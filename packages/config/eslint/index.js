// @ts-check

// Disable type-aware linting for performance reasons.
// const fs = require('fs')
// const path = require('path')
// const tsConfig = fs.existsSync('tsconfig.json')
//   ? path.resolve('tsconfig.json')
//   : undefined
const tsConfig = undefined

/** @type {import("eslint").Linter.Config} */
const eslintConfig = {
  ignorePatterns: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/.next/**',
    '**/storybook-static/**',
  ],
  extends: ['next/core-web-vitals', 'plugin:prettier/recommended'],
  plugins: ['tailwindcss'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'no-unused-vars': ['off'],
    'react/jsx-sort-props': ['warn', { reservedFirst: ['key'] }],
    'tailwindcss/classnames-order': ['warn'],
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    eqeqeq: ['error'],
  },
  overrides: [
    {
      files: ['**/*.d.ts', '**/*.ts', '**/*.tsx'],
      excludedFiles: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/storybook-static/**',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: tsConfig,
      },
      plugins: ['@typescript-eslint', 'import', 'unused-imports', 'regex'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['off'],
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal'],
            pathGroups: [
              {
                pattern: '@dao-dao/**',
                group: 'external',
                position: 'after',
              },
            ],
            pathGroupsExcludedImportTypes: ['@dao-dao/**'],
            'newlines-between': 'always',
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
          },
        ],
        'import/no-duplicates': 'error',
        'sort-imports': [
          'error',
          {
            // Let eslint-plugin-import handle declaration groups above.
            ignoreDeclarationSort: true,
            // Sort within import statements.
            ignoreMemberSort: false,
          },
        ],
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],
        'regex/invalid': [
          'error',
          [
            {
              regex: '\\@\\/\\.\\.\\/\\.\\.\\/packages',
              replacement: '@dao-dao',
              message:
                'Import from @dao-dao/* instead of a relative path (i.e. replace "../../packages" with "@dao-dao").',
            },
            {
              regex: '\\@dao\\-dao\\/stateless\\/(components|theme)[^\'"]*',
              replacement: '@dao-dao/stateless',
              files: {
                // Let storybook files (stories and files within the storybook
                // package like decorators) import specific stateless files,
                // like other storybook files.
                ignore: '.*\\.stories\\.tsx|packages/storybook',
              },
              message:
                'Import from root @dao-dao/stateless instead of a direct path. Ensure the export has been added to its sibling index.',
            },
            {
              regex: '(\\bt\\(\\s*\'[^\\.\']+\'|i18nKey="[^\\."]+")',
              message:
                'No top-level i18n keys allowed. Organize top-level keys into a nested object.',
            },
            {
              regex: 'dangerouslySetInnerHTML',
              message: 'dangerouslySetInnerHTML is not allowed.',
            },
            {
              regex: 'eval\\(',
              message: 'eval is not allowed.',
            },
            {
              regex: 'animate-spin([^-])',
              replacement: {
                function: '"animate-spin-medium" + $[1]',
              },
              message:
                '`animate-spin` is too fast. Use `animate-spin-medium` for a chiller vibe.',
            },
            {
              regex: '\\b(FC|FunctionComponent)\\b',
              message:
                "Using React's FunctionComponent is discouraged. Type the props explicitly: `export const Component = (props: ComponentProps) => { ... }`",
            },
            // Make sure GNU AGPLv3 header is not in the packages. This may
            // happen if code gets copied from an app to a package. The packages
            // use a different license than the apps.
            {
              regex:
                '// GNU AFFERO GENERAL PUBLIC LICENSE Version 3\\. Copyright \\(C\\) 2022 DAO DAO Contributors\\.\n// See the "LICENSE" file in the root directory of this package for more copyright information\\.\n?\n?',
              replacement: '',
              files: {
                // Only in packages.
                inspect: 'packages\\/.+',
              },
              message: 'Do not include the GNU AGPLv3 header in package files.',
            },
          ],
        ],
      },
    },
    // i18n linting
    {
      files: ['**/*.d.ts', '**/*.ts', '**/*.tsx'],
      excludedFiles: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/storybook-static/**',
        // Don't care about i18n in storybook files.
        '**/*.stories.tsx',
      ],
      extends: ['plugin:react-i18n/recommended', 'plugin:i18next/recommended'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: tsConfig,
      },
      rules: {
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
              ],
            },
            'object-properties': {
              exclude: [
                // inline Number.toLocaleString, notation: 'compact'
                'notation',
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
      },
    },
  ],
}

module.exports = eslintConfig
