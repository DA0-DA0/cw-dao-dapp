/**
 * Validate that versions and code IDs in the codeIds.json file are correct by
 * finding contracts that currently exist on-chain for each code ID and checking
 * their version info.
 */

import { QueryClient } from '@tanstack/react-query'
import chalk from 'chalk'

import { contractQueries } from '@dao-dao/state'
import { ChainId } from '@dao-dao/types'

import { getCosmWasmClientForChainId } from '../client'
import { SUPPORTED_CHAINS } from '../constants/chains'
import { retry } from '../network'

const errors: Record<string, any> = {}
const successes: Record<string, any> = {}

// Ignore non-DAO DAO contracts with separate versioning.
const ignore = [
  'Cw1Whitelist',
  'Cw20Base',
  'Cw4Group',
  'Cw721Base',
  'ValenceAccount',
]

const ignoreChainIds = [
  // Secret Network does not let you query contracts by code ID.
  ChainId.SecretMainnet,
  ChainId.SecretTestnet,
]

const main = async () => {
  const queryClient = new QueryClient()

  try {
    for (const { chainId, allCodeIds } of SUPPORTED_CHAINS) {
      if (ignoreChainIds.includes(chainId)) {
        console.log(chalk.gray(`${chainId} ignored`))
        continue
      }

      const client = await getCosmWasmClientForChainId(chainId)

      for (const [version, codeIds] of Object.entries(allCodeIds)) {
        for (const [key, codeId] of Object.entries(codeIds)) {
          const id = `${chainId}:${key}:${version}`

          if (ignore.includes(key)) {
            console.log(chalk.gray(`${id} ignored`))
            continue
          }

          if (successes[id]) {
            console.log(chalk.green(`${id} already verified`))
            continue
          }

          await retry(5, async () => {
            const { contracts } =
              await client['forceGetQueryClient']().wasm.listContractsByCodeId(
                codeId
              )
            if (contracts.length === 0) {
              successes[id] = 1
              console.log(
                chalk.yellow(`${id} no contracts found for code ID ${codeId}`)
              )

              return
            }

            const { info } = await queryClient.fetchQuery(
              contractQueries.info(queryClient, {
                chainId,
                address: contracts[0],
              })
            )

            if (info.version !== version) {
              errors[id] = {
                error: 'incorrect version',
                ...info,
              }

              console.log(
                chalk.red(
                  `${id} (${info.contract}) incorrect version. got ${info.version}`
                )
              )
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
