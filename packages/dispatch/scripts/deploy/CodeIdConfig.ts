import fs from 'fs'
import path from 'path'

import lockfile from 'proper-lockfile'
import semverCompare from 'semver/functions/compare'

import { chainIdToIndexerGroupVarsName } from './config'

type CodeIds = Record<string, Record<string, Record<string, number>>>

/**
 * A class that manages the code ID config.
 */
export class CodeIdConfig {
  private _codeIds: CodeIds = {}

  /**
   * Path to all uploaded code IDs.
   */
  public readonly codeIdsPath: string

  constructor(
    private indexerAnsibleGroupVarsPath: string,
    /**
     * Whether to set the code ID in the indexer config.
     */
    private setIndexer = true,
    /**
     * Whether or not to use the test codeIds.
     */
    useTestCodeIds = false
  ) {
    this.codeIdsPath = path.join(
      __dirname,
      `../../../utils/constants/codeIds.${
        useTestCodeIds ? 'test.json' : 'json'
      }`
    )

    if (!fs.existsSync(this.codeIdsPath)) {
      fs.writeFileSync(this.codeIdsPath, '{}')
    }
  }

  get codeIds() {
    return this._codeIds
  }

  private load() {
    this._codeIds = JSON.parse(fs.readFileSync(this.codeIdsPath, 'utf8'))
  }

  private save() {
    fs.writeFileSync(
      this.codeIdsPath,
      JSON.stringify(this._codeIds, null, 2) + '\n'
    )
  }

  /**
   * Set code ID in the frontend config and the indexer config.
   */
  async setCodeId(options: {
    /**
     * The chain ID.
     */
    chainId: string
    /**
     * The contract version being deployed.
     */
    version: string
    /**
     * The contract name being deployed.
     */
    name: string
    /**
     * The code ID being set.
     */
    codeId: number
  }) {
    await Promise.all([
      this.setCodeIdUiConfig(options),
      this.setIndexer && this.setCodeIdIndexerConfig(options),
    ])
  }

  /**
   * Set code ID in the frontend config.
   */
  private async setCodeIdUiConfig({
    chainId,
    version,
    name,
    codeId,
  }: {
    /**
     * The chain ID.
     */
    chainId: string
    /**
     * The contract version being deployed.
     */
    version: string
    /**
     * The contract name being deployed.
     */
    name: string
    /**
     * The code ID being set.
     */
    codeId: number
  }) {
    // Establish lock.
    const releaseLock = await lockfile.lock(this.codeIdsPath, {
      retries: {
        forever: true,
        minTimeout: 100,
        factor: 1.1,
        randomize: true,
      },
    })

    try {
      this.load()

      if (!this._codeIds[chainId]) {
        this._codeIds[chainId] = {}
      }
      if (!this._codeIds[chainId][version]) {
        this._codeIds[chainId][version] = {}
      }

      const configName = contractNameToJsonConfigName(name)
      this._codeIds[chainId][version][configName] = codeId

      this.save()
    } finally {
      // Release lock.
      await releaseLock()
    }
  }

  /**
   * Set code ID in the indexer config.
   */
  private async setCodeIdIndexerConfig({
    chainId,
    name,
    codeId,
  }: {
    /**
     * The chain ID.
     */
    chainId: string
    /**
     * The contract name being deployed.
     */
    name: string
    /**
     * The code ID being set.
     */
    codeId: number
  }) {
    const indexerGroupVarsName = chainIdToIndexerGroupVarsName[chainId]
    if (!indexerGroupVarsName) {
      throw new Error(
        `No indexer group vars name found for chain ID ${chainId}`
      )
    }

    const indexerGroupVarsPath = path.join(
      this.indexerAnsibleGroupVarsPath,
      indexerGroupVarsName + '.yml'
    )

    // Establish lock.
    const releaseLock = await lockfile.lock(indexerGroupVarsPath, {
      retries: {
        forever: true,
        minTimeout: 100,
        factor: 1.1,
        randomize: true,
      },
    })

    try {
      const configName = contractNameToIndexerGroupVarsName(name)

      const fileContents = fs
        .readFileSync(indexerGroupVarsPath, 'utf8')
        .trimEnd()
      const lines = fileContents.split('\n')

      // Get line index of the start of the `indexer_code_ids:` map.
      const indexerCodeIdsMapKeyLineIndex = lines.findIndex(
        (line) => line === 'indexer_code_ids:'
      )
      if (indexerCodeIdsMapKeyLineIndex === -1) {
        throw new Error('indexer_code_ids map not found in indexer group vars')
      }

      const codeIdMapStartIndex = indexerCodeIdsMapKeyLineIndex + 1
      // Get last line of the `indexer_code_ids:` map by finding the first
      // non-indented line.
      let codeIdMapEndIndex = lines.findIndex(
        (line, index) => index >= codeIdMapStartIndex && !line.startsWith('  ')
      )
      // If none found, all lines are indented and we're at the end.
      if (codeIdMapEndIndex === -1) {
        codeIdMapEndIndex = lines.length
      }

      const entries = lines.slice(codeIdMapStartIndex, codeIdMapEndIndex)

      // Find the line with this contract name.
      const contractIndex = entries.findIndex((line) =>
        line.startsWith(`  ${configName}:`)
      )

      // If not found, add it to the end.
      if (contractIndex === -1) {
        entries.push(`  ${configName}: [${codeId}]`)
      } else {
        // If found, add code ID to the end, unless it already exists.
        const entry = entries[contractIndex]
        if (!new RegExp(`\\b${codeId}\\b`).test(entry)) {
          entries[contractIndex] = entry.endsWith('[]')
            ? entry.replace(/\[\]$/, `[${codeId}]`)
            : entry.replace(/\]$/, `, ${codeId}]`)
        }
      }

      // Sort entries.
      entries.sort()

      // Replace old entries with new set.
      lines.splice(codeIdMapStartIndex, entries.length, ...entries)

      // Write changes to file.
      fs.writeFileSync(indexerGroupVarsPath, lines.join('\n') + '\n')
    } finally {
      // Release lock.
      await releaseLock()
    }
  }

  /**
   * Get the most recent code ID and version for this chain, or null if code ID
   * has not been set for this chain.
   */
  async getLatestCodeId({
    chainId,
    name: _name,
  }: {
    /**
     * The chain ID.
     */
    chainId: string
    /**
     * The contract name.
     */
    name: string
  }): Promise<{
    /**
     * The latest version of the contract found.
     */
    version: string
    /**
     * The code ID.
     */
    codeId: number
  } | null> {
    // Establish lock.
    const releaseLock = await lockfile.lock(this.codeIdsPath, {
      retries: {
        forever: true,
        minTimeout: 100,
        factor: 1.1,
        randomize: true,
      },
    })

    try {
      this.load()

      const versionsDescending = this._codeIds[chainId]
        ? Object.keys(this._codeIds[chainId]).sort(semverCompare).reverse()
        : []

      const name = contractNameToJsonConfigName(_name)
      for (const version of versionsDescending) {
        if (typeof this._codeIds[chainId]?.[version]?.[name] === 'number') {
          return {
            version,
            codeId: this._codeIds[chainId][version][name],
          }
        }
      }

      return null
    } finally {
      // Release lock.
      await releaseLock()
    }
  }

  /**
   * Return the code ID for this chain and version, or null if not set.
   */
  async getCodeId({
    chainId,
    name: _name,
    version,
  }: {
    /**
     * The chain ID.
     */
    chainId: string
    /**
     * The contract name.
     */
    name: string
    /**
     * The version of the contract.
     */
    version: string
  }): Promise<number | null> {
    // Establish lock.
    const releaseLock = await lockfile.lock(this.codeIdsPath, {
      retries: {
        forever: true,
        minTimeout: 100,
        factor: 1.1,
        randomize: true,
      },
    })

    try {
      const name = contractNameToJsonConfigName(_name)

      this.load()

      if (typeof this._codeIds[chainId]?.[version]?.[name] === 'number') {
        return this._codeIds[chainId][version][name]
      }

      return null
    } finally {
      // Release lock.
      await releaseLock()
    }
  }
}

/**
 * Convert snake case contract name to title case codeIds.json config name.
 */
export const contractNameToJsonConfigName = (name: string) =>
  name
    .split(/[_\-]/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

/**
 * Convert snake case contract name to escaped indexer group vars name.
 *
 * Replace underscore with double underscore.
 */
export const contractNameToIndexerGroupVarsName = (name: string) =>
  name.replace(/_/g, '__')
