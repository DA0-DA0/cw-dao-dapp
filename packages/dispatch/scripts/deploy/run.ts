import fs from 'fs'
import path from 'path'

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { stringToPath as stringToHdPath } from '@cosmjs/crypto'
import { DirectSecp256k1HdWallet, EncodeObject } from '@cosmjs/proto-signing'
import chalk from 'chalk'
import { Command } from 'commander'
import toml from 'toml'

import {
  chainQueries,
  makeGetSignerOptions,
  makeReactQueryClient,
} from '@dao-dao/state'
import { StarshipSuite } from '@dao-dao/tests'
import { ContractVersion, SupportedChainConfig } from '@dao-dao/types'
import { MsgExec } from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/tx'
import { MsgStoreCode } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/tx'
import { AccessType } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/types'
import {
  CHAIN_GAS_MULTIPLIER,
  findEventsAttributeValue,
  getChainForChainId,
  getRpcForChainId,
  gzipCompress,
} from '@dao-dao/utils'

import { instantiateContract } from '../utils'
import { CodeIdConfig } from './CodeIdConfig'
import {
  DeploySetContract,
  chainIdToDeploymentArgs,
  deploySets,
} from './config'

const { log } = console

/**
 * Path to the config file.
 */
const configPath = path.join(__dirname, '../../config.toml')

if (!fs.existsSync(configPath)) {
  log(chalk.red(`Config file not found at ${configPath}`))
  process.exit(1)
}

let config: any
try {
  config = toml.parse(fs.readFileSync(configPath, 'utf8'))
} catch (err) {
  log(chalk.red(`Error parsing ${configPath}: ${err}`))
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
    indexerAnsibleGroupVarsPath,
    !!indexer,
    starship
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

  const uploadContract = async ({
    id,
    file,
    prefixLength,
    restrictInstantiation,
  }: {
    id: string
    file: string
    prefixLength: number
    restrictInstantiation?: boolean
  }) => {
    const wasmData = new Uint8Array(fs.readFileSync(file).buffer)
    const compressedWasmData = await gzipCompress(wasmData)

    const msgStoreCode = MsgStoreCode.fromPartial({
      sender: authz || sender,
      wasmByteCode: compressedWasmData,
      instantiatePermission: restrictInstantiation
        ? {
            permission: AccessType.AnyOfAddresses,
            addresses: [authz || sender],
          }
        : {
            permission: AccessType.Everybody,
            addresses: [],
          },
    })

    const msg: EncodeObject = authz
      ? {
          typeUrl: MsgExec.typeUrl,
          value: MsgExec.fromPartial({
            grantee: sender,
            msgs: [MsgStoreCode.toProtoMsg(msgStoreCode)],
          }),
        }
      : {
          typeUrl: MsgStoreCode.typeUrl,
          value: msgStoreCode,
        }

    let transactionHash
    try {
      transactionHash = await client.signAndBroadcastSync(
        sender,
        [msg],
        CHAIN_GAS_MULTIPLIER
      )
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('authorization not found')
      ) {
        log(
          chalk.red(
            `[${id}]${' '.repeat(
              prefixLength - id.length - 5
            )}no authz permission granted`
          )
        )
        process.exit(1)
      } else {
        log(
          chalk.red(`[${id}]${' '.repeat(prefixLength - id.length - 5)}failed`)
        )
        throw err
      }
    }

    log(
      chalk.greenBright(
        `[${id}]${' '.repeat(prefixLength - id.length - 5)}${transactionHash}`
      )
    )

    // Poll for TX.
    let events
    let tries = 50
    while (tries > 0) {
      try {
        events = (await client.getTx(transactionHash))?.events
        if (events) {
          break
        }
      } catch {}

      tries--
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    if (!events) {
      log(
        chalk.red(
          `[${id}]${' '.repeat(prefixLength - id.length - 5)}TX not found`
        )
      )
      process.exit(1)
    }

    const codeId = findEventsAttributeValue(events, 'store_code', 'code_id')

    if (!codeId) {
      log(
        chalk.red(`[${id}]${' '.repeat(prefixLength - id.length - 5)}not found`)
      )
      process.exit(1)
    }

    log(
      chalk.green(`[${id}]${' '.repeat(prefixLength - id.length - 5)}${codeId}`)
    )

    return Number(codeId)
  }

  log()

  const getContractFile = (contract: DeploySetContract) =>
    typeof contract === 'string' ? contract : contract.file
  const getContractName = (contract: DeploySetContract) =>
    typeof contract === 'string' ? contract : contract.alias

  const getContractPath = (contract: DeploySetContract) => {
    if (
      !contractDirs ||
      !Array.isArray(contractDirs) ||
      contractDirs.length === 0
    ) {
      log(chalk.red('contract_dirs not set'))
      process.exit(1)
    }

    for (const contractDir of contractDirs) {
      const file = path.join(contractDir, `${getContractFile(contract)}.wasm`)
      if (fs.existsSync(file)) {
        return file
      }
    }

    log(
      chalk.red(
        `${getContractFile(contract)}.wasm not found in contract directories`
      )
    )
    process.exit(1)
  }

  // Upload polytone contracts only.
  if (mode === Mode.Polytone) {
    const polytoneContracts = deploySets
      .find((s) => s.name === 'polytone')
      ?.contracts?.map((contract) => ({
        id: getContractName(contract),
        file: getContractPath(contract),
      }))
    if (!polytoneContracts) {
      log(chalk.red('polytone deploy set not found'))
      process.exit(1)
    }

    for (const { id, file } of polytoneContracts) {
      await uploadContract({
        id,
        file,
        prefixLength: 32,
        restrictInstantiation,
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
    const chainDeploySets = deploySets.filter(
      (s) =>
        s.type !== 'manual' &&
        (!s.chainIds || s.chainIds.includes(chainId)) &&
        !s.skipChainIds?.includes(chainId)
    )

    // Set console prefix length to the max contract name length plus space for
    // brackets and longest ID suffix (CONTRACT).
    consolePrefixLength =
      Math.max(
        ...chainDeploySets.flatMap((s) =>
          s.contracts.map((c) => getContractName(c).length)
        )
      ) + 14

    try {
      // For one-time deploy sets, only deploy if the code ID is not already
      // set. Otherwise, copy over the code ID from an earlier version if
      // available.
      const oneTimeDeploySets = chainDeploySets.filter((s) => s.type === 'once')
      for (const { contracts } of oneTimeDeploySets) {
        for (const contract of contracts) {
          const name = getContractName(contract)

          // If exists, skip.
          const existingCodeId = await codeIds.getCodeId({
            chainId,
            name,
            version,
          })

          if (existingCodeId !== null) {
            log(
              chalk.green(
                `[${name}]${' '.repeat(
                  consolePrefixLength - name.length - 5
                )}${existingCodeId} (already set)`
              )
            )

            continue
          } else {
            const latest = await codeIds.getLatestCodeId({
              chainId,
              name,
            })

            // Copy over the code ID from an earlier version if available.
            if (latest) {
              log(
                chalk.green(
                  `[${name}]${' '.repeat(
                    consolePrefixLength - name.length - 5
                  )}${latest.codeId} (set from version ${latest.version})`
                )
              )

              await codeIds.setCodeId({
                chainId,
                name,
                version,
                codeId: latest.codeId,
              })
            } else {
              // Otherwise, upload the contract.
              const codeId = await uploadContract({
                id: name,
                file: getContractPath(contract),
                prefixLength: consolePrefixLength,
                restrictInstantiation,
              })

              await codeIds.setCodeId({
                chainId,
                name,
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
          const name = getContractName(contract)

          // If exists, skip.
          const existingCodeId = await codeIds.getCodeId({
            chainId,
            name,
            version,
          })

          if (existingCodeId !== null) {
            log(
              chalk.green(
                `[${name}]${' '.repeat(
                  consolePrefixLength - name.length - 5
                )}${existingCodeId} (already set)`
              )
            )
            continue
          } else {
            // Otherwise, upload the contract.
            const codeId = await uploadContract({
              id: name,
              file: getContractPath(contract),
              prefixLength: consolePrefixLength,
              restrictInstantiation,
            })

            await codeIds.setCodeId({
              chainId,
              name,
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
          prefixLength: consolePrefixLength,
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
