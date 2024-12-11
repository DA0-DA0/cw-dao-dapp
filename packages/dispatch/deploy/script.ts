import path from 'path'

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { stringToPath as stringToHdPath } from '@cosmjs/crypto'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import chalk from 'chalk'
import { Command } from 'commander'

import {
  chainQueries,
  makeGetSignerOptions,
  makeReactQueryClient,
} from '@dao-dao/state'
import { StarshipSuite } from '@dao-dao/tests'
import { ContractVersion, SupportedChainConfig } from '@dao-dao/types'
import { getChainForChainId, getRpcForChainId } from '@dao-dao/utils'

import { getDispatchConfig } from '../config'
import { instantiateContract } from '../utils'
import { CodeIdConfig } from './CodeIdConfig'
import { chainIdToDeploymentArgs } from './config'
import { DeploySet, deploySets } from './DeploySet'

const { log } = console

let config
try {
  config = getDispatchConfig()
} catch (err) {
  log(chalk.red(`Error getting config: ${err}`))
  process.exit(1)
}

const {
  default: {
    contract_dirs: contractDirs,
    indexer_ansible_group_vars_path: indexerAnsibleGroupVarsPath,
  },
  mnemonics,
} = config

if (!indexerAnsibleGroupVarsPath) {
  log(chalk.red('indexer_ansible_group_vars_path not set'))
  process.exit(1)
}

if (
  !contractDirs ||
  !Array.isArray(contractDirs) ||
  contractDirs.length === 0
) {
  log(chalk.red('contract_dirs not set'))
  process.exit(1)
}

enum Mode {
  Dao = 'dao',
  Polytone = 'polytone',
  Factory = 'factory',
}

const program = new Command()
program.requiredOption('-c, --chain <ID>', 'chain ID')
program.option(
  '-m, --mode <mode>',
  'deploy mode (dao = deploy DAO contracts and instantiate admin factory, polytone = deploy Polytone contracts, factory = instantiate admin factory)',
  'dao'
)
program.option(
  '-v, --version <version>',
  'contract version to save code IDs under in the config when deploying DAO contracts (e.g. 1.0.0)'
)
program.option(
  '-a, --authz <granter>',
  'upload contracts via authz exec as this granter'
)
program.option(
  '-r, --restrict-instantiation',
  'restrict instantiation to only the uploader; this must be used on some chains to upload contracts, like Kujira'
)
program.option(
  '-p, --mnemonic <name>',
  'use this configured mnemonic name for signing transactions',
  'default'
)
program.option(
  '-s, --starship',
  'load chains from starship config in @dao-dao/tests (and the chain ID option should be the chain name instead)'
)
program.option('--no-indexer', 'do not set the code ID in the indexer config')
program.option(
  '--no-instantiate-admin-factory',
  'do not instantiate the admin factory'
)

program.parse(process.argv)
let {
  chain: chainId,
  mode,
  version,
  authz,
  restrictInstantiation,
  mnemonic: mnemonicName,
  instantiateAdminFactory,
  indexer,
  starship,
} = program.opts()

// Add deployment arguments if they exist.
const deploymentArgs = chainIdToDeploymentArgs[chainId]
if (deploymentArgs) {
  if (deploymentArgs.mode !== undefined) {
    mode = deploymentArgs.mode
  }
  if (deploymentArgs.authz !== undefined) {
    authz = deploymentArgs.authz
  }
  if (deploymentArgs.restrictInstantiation !== undefined) {
    restrictInstantiation = deploymentArgs.restrictInstantiation
  }
  if (deploymentArgs.mnemonic !== undefined) {
    mnemonicName = deploymentArgs.mnemonic
  }
  if (deploymentArgs.instantiateAdminFactory !== undefined) {
    instantiateAdminFactory = deploymentArgs.instantiateAdminFactory
  }
  if (deploymentArgs.indexer !== undefined) {
    indexer = deploymentArgs.indexer
  }
}

let mnemonic = mnemonics[mnemonicName]

if (!Object.values(Mode).includes(mode)) {
  log(
    chalk.red('Invalid mode. Must be one of: ' + Object.values(Mode).join(', '))
  )
  process.exit(1)
}

const main = async () => {
  const queryClient = await makeReactQueryClient()

  // Set up Starship stuff and load chain info.
  if (starship) {
    const suite = await StarshipSuite.init(chainId, version)
    const signer = await suite.makeSigner()
    mnemonic = signer.mnemonic
    indexer = false
    chainId = suite.chainId
  }

  if (!mnemonic) {
    log(chalk.red(`Mnemonic with name "${mnemonicName}" not found in config.`))
    process.exit(1)
  }

  const {
    chainName,
    bech32Prefix,
    chainRegistry: { network_type: networkType, slip44 } = {},
  } = getChainForChainId(chainId)

  const codeIds = new CodeIdConfig(
    indexer ? indexerAnsibleGroupVarsPath : undefined,
    starship
      ? path.join(__dirname, '../../../utils/constants/codeIds.test.json')
      : undefined
  )

  await queryClient.prefetchQuery(chainQueries.dynamicGasPrice({ chainId }))

  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: bech32Prefix,
    hdPaths: [stringToHdPath(`m/44'/${slip44}'/0'/0/0`)],
  })
  const sender = (await signer.getAccounts())[0].address

  log()
  log(
    chalk.underline(
      `Deploying on ${chainName} from ${sender}${
        authz ? ` as ${authz}` : ''
      }...`
    )
  )

  const client = await SigningCosmWasmClient.connectWithSigner(
    getRpcForChainId(chainId),
    signer,
    makeGetSignerOptions(queryClient)(chainName)
  )

  log()

  // Upload polytone contracts only.
  if (mode === Mode.Polytone) {
    const polytoneContracts = deploySets.find(
      (s) => s.name === 'polytone'
    )?.contracts
    if (!polytoneContracts) {
      log(chalk.red('polytone deploy set not found'))
      process.exit(1)
    }

    for (const contract of polytoneContracts) {
      await contract.upload({
        client,
        sender,
        authz,
        logPrefixLength: 32,
        restrictInstantiation,
        contractDirs,
      })
    }

    log()
    process.exit(0)
  }

  let consolePrefixLength = 32

  // Upload DAO contracts.
  if (mode === Mode.Dao) {
    if (!version) {
      log(chalk.red('-v/--version is required when deploying DAO contracts'))
      process.exit(1)
    }

    // Get automatic deploy sets for this chain.
    const chainDeploySets = DeploySet.getAutoDeploySets(chainId)

    // Set console prefix length to the max contract name length plus space for
    // brackets and longest ID suffix (CONTRACT).
    consolePrefixLength =
      Math.max(
        ...chainDeploySets.flatMap((s) => s.contracts.map((c) => c.name.length))
      ) + 14

    try {
      // For one-time deploy sets, only deploy if the code ID is not already
      // set. Otherwise, copy over the code ID from an earlier version if
      // available.
      const oneTimeDeploySets = chainDeploySets.filter((s) => s.type === 'once')
      for (const { contracts } of oneTimeDeploySets) {
        for (const contract of contracts) {
          // If exists, skip.
          const existingCodeId = await codeIds.getCodeId({
            chainId,
            name: contract.name,
            version,
          })

          if (existingCodeId !== null) {
            log(
              chalk.green(
                `[${contract.name}]${' '.repeat(
                  consolePrefixLength - contract.name.length - 5
                )}${existingCodeId} (already set)`
              )
            )

            continue
          } else {
            const latest = await codeIds.getLatestCodeId({
              chainId,
              name: contract.name,
            })

            // Copy over the code ID from an earlier version if available.
            if (latest) {
              log(
                chalk.green(
                  `[${contract.name}]${' '.repeat(
                    consolePrefixLength - contract.name.length - 5
                  )}${latest.codeId} (set from version ${latest.version})`
                )
              )

              await codeIds.setCodeId({
                chainId,
                name: contract.name,
                version,
                codeId: latest.codeId,
              })
            } else {
              // Otherwise, upload the contract.
              const codeId = await contract.upload({
                client,
                sender,
                authz,
                logPrefixLength: consolePrefixLength,
                restrictInstantiation,
                contractDirs,
              })

              await codeIds.setCodeId({
                chainId,
                name: contract.name,
                version,
                codeId,
              })
            }
          }
        }
      }

      // For always deploy sets, upload all contracts.
      const alwaysDeploySets = chainDeploySets.filter(
        (s) => s.type === 'always'
      )
      for (const { contracts } of alwaysDeploySets) {
        for (const contract of contracts) {
          // If exists, skip.
          const existingCodeId = await codeIds.getCodeId({
            chainId,
            name: contract.name,
            version,
          })

          if (existingCodeId !== null) {
            log(
              chalk.green(
                `[${contract.name}]${' '.repeat(
                  consolePrefixLength - contract.name.length - 5
                )}${existingCodeId} (already set)`
              )
            )
            continue
          } else {
            // Otherwise, upload the contract.
            const codeId = await contract.upload({
              client,
              sender,
              authz,
              logPrefixLength: consolePrefixLength,
              restrictInstantiation,
              contractDirs,
            })

            await codeIds.setCodeId({
              chainId,
              name: contract.name,
              version,
              codeId,
            })
          }
        }
      }
    } catch (err) {
      log(chalk.red('Error uploading contracts.'))

      throw err
    }
  }

  // Instantiate admin factory.
  const cwAdminFactoryCodeId = await codeIds.getCodeId({
    chainId,
    name: 'cw_admin_factory',
    version,
  })

  if (cwAdminFactoryCodeId === null) {
    if (mode === Mode.Factory) {
      log()
      log(
        chalk.red(
          `cw_admin_factory code ID not found for version ${version} but is needed`
        )
      )
      process.exit(1)
    } else {
      log()
      log(chalk.blueBright('cw_admin_factory not found, not instantiating'))
    }
  }

  const adminFactoryAddress =
    instantiateAdminFactory && cwAdminFactoryCodeId !== null
      ? await instantiateContract({
          client,
          sender,
          chainId,
          id: 'cw_admin_factory',
          codeId: cwAdminFactoryCodeId,
          msg: {},
          label: 'daodao_admin_factory',
          logPrefixLength: consolePrefixLength,
        })
      : ''

  if (mode === Mode.Factory) {
    log()
    log(chalk.green('Done! Instantiated admin factory:'))
    log(adminFactoryAddress)
  } else {
    log()
    log(chalk.green('Done! Config entries:'))

    const mainnet = networkType === 'mainnet'
    const explorerUrlDomain = mainnet ? 'ping.pub' : 'testnet.ping.pub'

    const config: Omit<SupportedChainConfig, 'codeIds' | 'allCodeIds'> = {
      chainId,
      name: chainName,
      mainnet,
      accentColor: 'ACCENT_COLOR',
      factoryContractAddress: adminFactoryAddress,
      explorerUrlTemplates: {
        tx: `https://${explorerUrlDomain}/${chainName}/tx/REPLACE`,
        gov: `https://${explorerUrlDomain}/${chainName}/gov`,
        govProp: `https://${explorerUrlDomain}/${chainName}/gov/REPLACE`,
        wallet: `https://${explorerUrlDomain}/${chainName}/account/REPLACE`,
      },
      latestVersion: version || ContractVersion.Unknown,
    }

    log(JSON.stringify(config, null, 2))
  }

  log()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

process.on('SIGINT', () => {
  process.exit(0)
})
