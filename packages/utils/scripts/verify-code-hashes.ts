/**
 * Validate that the code hashes in the codeHashes.json file are correct by
 * comparing with their on-chain hashes. This is only needed for Secret Network.
 */

import chalk from 'chalk'

import { ContractVersion } from '@dao-dao/types'

import { getCosmWasmClientForChainId } from '../client'
import { SUPPORTED_CHAINS } from '../constants/chains'
import { retry } from '../misc'

const errors: Record<string, any> = {}
const successes: Record<string, any> = {}

const main = async () => {
  try {
    for (const { chainId, allCodeIds, allCodeHashes } of SUPPORTED_CHAINS) {
      if (!allCodeHashes) {
        continue
      }

      const client = await getCosmWasmClientForChainId(chainId)

      for (const [version, codeHashes] of Object.entries(allCodeHashes)) {
        const codeIds = allCodeIds[version as ContractVersion]
        if (!codeIds) {
          continue
        }

        for (const [key, codeHash] of Object.entries(codeHashes)) {
          const id = `${chainId}:${key}:${version}`

          const codeId = codeIds[key as keyof typeof codeIds]
          if (!codeId) {
            console.log(chalk.red(`${id} no code ID found`))
            continue
          }

          if (successes[id]) {
            console.log(chalk.green(`${id} already verified`))
            continue
          }

          await retry(5, async () => {
            const { checksum } = await client.getCodeDetails(codeId)

            if (checksum !== codeHash) {
              errors[id] = {
                error: 'incorrect checksum',
                actual: checksum,
                expected: codeHash,
              }

              console.log(chalk.red(`${id} incorrect checksum`))
            } else {
              successes[id] = 1
              console.log(chalk.green(`${id} correct`))
            }
          })
        }
      }
    }
  } catch (err) {
    console.error('FAILED', err)
  } finally {
    console.log('ERRORS', JSON.stringify(errors, null, 2))
    console.log('SUCCESSES', JSON.stringify(successes, null, 2))
  }

  process.exit(0)
}

main()

process.addListener('SIGINT', () => {
  console.log()

  console.log('ERRORS', JSON.stringify(errors, null, 2))
  console.log('SUCCESSES', JSON.stringify(successes, null, 2))

  process.exit(0)
})
