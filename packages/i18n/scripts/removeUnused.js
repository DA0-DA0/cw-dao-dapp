// `yarn remove-unused` to remove all i18n translation keys from the JSON locale
// files that don't exist in the code. Config options are below.

const path = require('path')
const fs = require('fs')
const { collectUnusedTranslations, generateFilesPaths } = require('i18n-unused')

// Paths
const localesPath = path.resolve(__dirname, '../locales')
const sources = [
  path.resolve(__dirname, '../../../apps/dapp'),
  path.resolve(__dirname, '../../../packages/state'),
  path.resolve(__dirname, '../../../packages/stateful'),
  path.resolve(__dirname, '../../../packages/stateless'),
  path.resolve(__dirname, '../../../packages/utils'),
]

// Config
const ignorePathsFromSource = [
  'node_modules',
  '.next',
  '.storybook-static',
  '.cache',
]
// Dynamically interpolated at runtime. These do not show up statically
// (likely enums and/or chain data).
const ignoredTranslationRoots = [
  'depositRefundPolicy',
  'proposalModuleLabel',
  'proposalStatusTitle',
  'proposalVoteTitle',
  'unit',
]
const SRC_EXTS = ['ts', 'tsx', 'js', 'jsx']
const KEY_SEPARATOR = '.'
const CONTEXT_SEPARATOR = '_'

const getUnusedTranslationsForLocalePaths = async (localePaths) => {
  const allSourcePaths = (
    await Promise.all(
      sources.map((source) =>
        generateFilesPaths(source, {
          srcExtensions: SRC_EXTS,
          ignorePaths: ignorePathsFromSource.map((ignore) =>
            path.resolve(source, ignore)
          ),
        })
      )
    )
  ).flat()

  const unusedTranslations = await collectUnusedTranslations(
    localePaths,
    allSourcePaths,
    {
      context: true,
      ignoreComments: false,
      translationSeparator: KEY_SEPARATOR,
      contextSeparator: CONTEXT_SEPARATOR,
      translationKeyMatcher: /.*/gi,
      localeFileParser: (m) => m.default || m,
    }
  )

  const filteredUnusedTranslations = unusedTranslations.translations.map(
    ({ localePath, keys }) => {
      const filteredKeys = keys.filter(
        (key) =>
          !ignoredTranslationRoots.some((ignoredRoot) =>
            key.startsWith(ignoredRoot)
          )
      )

      return {
        localePath,
        keys: filteredKeys,
        count: filteredKeys.length,
      }
    }
  )

  const allKeys = [
    ...new Set(filteredUnusedTranslations.flatMap(({ keys }) => keys)),
  ]

  const result = {
    translations: filteredUnusedTranslations,
    totalCount: filteredUnusedTranslations.reduce(
      (acc, { keys }) => acc + keys.length,
      0
    ),
    allKeys,
  }

  return result
}

// Adapted from applyToFlatKey @ i18n-unused/dist/i18n-unused.cjs line 404
const deleteFlatKeys = (source, flatKeys) => {
  const locale = require(source)
  flatKeys.forEach((key) => {
    const separatedKey = key.split(KEY_SEPARATOR)
    const keyLength = separatedKey.length - 1
    separatedKey.reduce((acc, _k, i) => {
      if (i === keyLength) {
        if (_k in acc) {
          delete acc[_k]
        } else {
          // If key does not exist, try to delete context keys.
          const contextKeys = Object.keys(acc).filter((key) =>
            key.startsWith(_k + CONTEXT_SEPARATOR)
          )
          if (contextKeys.length) {
            contextKeys.forEach((contextKey) => {
              delete acc[contextKey]
            })
          }
        }
      } else {
        acc = acc[_k]
      }

      return acc
    }, locale)
  })
  fs.writeFileSync(source, JSON.stringify(locale, null, 2))
}

const main = async () => {
  const localePaths = await generateFilesPaths(localesPath, {
    srcExtensions: ['json'],
  })

  const unusedTranslations =
    await getUnusedTranslationsForLocalePaths(localePaths)

  console.log(
    `Total unused translations count: ${
      unusedTranslations.totalCount
    }. Unique: ${
      unusedTranslations.allKeys.length
    }. Per locale: ${unusedTranslations.translations
      .map(({ count }) => count)
      .join(', ')}`
  )

  unusedTranslations.translations.forEach(({ localePath, keys }) =>
    deleteFlatKeys(localePath, keys)
  )
}

main().catch((e) => console.error('Error', e))
