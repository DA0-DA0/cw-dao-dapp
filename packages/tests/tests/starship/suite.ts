import fs from 'fs'
import path from 'path'

import { ChainInfo } from '@chain-registry/client'
import { Asset, Chain } from '@chain-registry/types'
import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'
import { stringToPath as stringToHdPath } from '@cosmjs/crypto'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { QueryClient } from '@tanstack/react-query'
import jsYaml from 'js-yaml'
import {
  ChainConfig,
  ConfigContext,
  generateMnemonic,
  useChain,
} from 'starshipjs'

import {
  chainQueries,
  makeGetSignerOptions,
  makeReactQueryClient,
} from '@dao-dao/state'
import { ContractVersion } from '@dao-dao/types'
import {
  _addChain,
  _addSupportedChain,
  instantiateSmartContract,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

export class StarshipSuite {
  public readonly queryClient: QueryClient

  constructor(
    public readonly starshipConfig: ChainConfig,
    public readonly chain: Chain,
    public readonly chainInfo: ChainInfo,
    public readonly coin: Asset,
    public readonly rpcEndpoint: string,
    public readonly restEndpoint: string,
    public readonly genesisMnemonic: string,
    public readonly tapFaucet: (
      address: string,
      denom?: string
    ) => Promise<void>,
    public readonly client: CosmWasmClient,
    /**
     * The version of the contracts deployed to the chain.
     */
    public readonly contractVersion: ContractVersion
  ) {
    this.queryClient = makeReactQueryClient(undefined, {
      queries: {
        // Disable caching so all queries are fresh.
        gcTime: 0,
      },
    })
  }

  static async init(chainName: string, contractVersion: ContractVersion) {
    // Initialize the starshipjs config.
    await ConfigContext.init(path.join(__dirname, '../../starship.config.yml'))

    const {
      chain,
      chainInfo,
      getCoin,
      getRpcEndpoint,
      getRestEndpoint,
      getGenesisMnemonic,
    } = useChain(chainName)

    // Parallelize all the async calls.
    const [coin, { rpcEndpoint, client }, restEndpoint, genesisMnemonic] =
      await Promise.all([
        getCoin(),
        getRpcEndpoint().then(async (rpcEndpoint) => ({
          rpcEndpoint,
          client: await CosmWasmClient.connect(rpcEndpoint),
        })),
        getRestEndpoint(),
        getGenesisMnemonic(),
      ])

    // Add to main chain lists.
    _addChain({
      chain,
      rpcEndpoint,
      restEndpoint,
    })

    const config = jsYaml.load(
      fs.readFileSync(ConfigContext.configFile, 'utf8')
    ) as ChainConfig

    const tapFaucet = async (address: string, denom?: string) => {
      const chainConfig = config.chains.find((c) => c.id === chain.chain_id)
      if (!chainConfig) {
        throw new Error(`Chain config not found for ${chain.chain_id}`)
      }
      const faucetEndpoint = `http://localhost:${chainConfig.ports.faucet}/credit`

      if (!denom) {
        denom = (await getCoin()).base
      }

      const res = await fetch(faucetEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          address,
          denom,
        }),
        headers: {
          'Content-type': 'application/json',
        },
      })

      if (!res.ok) {
        throw new Error(
          `Failed to tap faucet for ${address}: ${res.status} ${res.statusText}`
        )
      }

      const data = await res.text()

      if (data !== 'ok') {
        throw new Error(`Failed to tap faucet for ${address}: ${data}`)
      }
    }

    const suite = new StarshipSuite(
      config,
      chain,
      chainInfo,
      coin,
      rpcEndpoint,
      restEndpoint,
      genesisMnemonic,
      tapFaucet,
      client,
      contractVersion
    )

    return suite
  }

  get denom() {
    return this.coin.base
  }

  get bech32Prefix() {
    return this.chain.bech32_prefix
  }

  get chainId() {
    return this.chain.chain_id
  }

  get chainName() {
    return this.chain.chain_name
  }

  get gasPrice() {
    const price = this.chain.fees?.fee_tokens?.[0].fixed_min_gas_price || 0
    return GasPrice.fromString(`${price}${this.denom}`)
  }

  /**
   * Generate a signer and potentially provide it with tokens from the faucet.
   */
  async makeSigner({
    mnemonic,
    noFaucet = false,
  }: {
    /**
     * If undefined, will generate a random mnemonic.
     */
    mnemonic?: string
    /**
     * If true, will not tap the faucet. Defaults to false.
     */
    noFaucet?: boolean
  } = {}) {
    mnemonic ||= generateMnemonic()

    const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: this.bech32Prefix,
      hdPaths: [stringToHdPath(`m/44'/${this.chain.slip44}'/0'/0/0`)],
    })

    const address = (await signer.getAccounts())[0].address

    const signingClient = await SigningCosmWasmClient.connectWithSigner(
      this.rpcEndpoint,
      signer,
      makeGetSignerOptions(this.queryClient)(this.chain)
    )

    if (!noFaucet) {
      await this.tapFaucet(address)
    }

    return {
      mnemonic,
      signer,
      address,
      signingClient,
    }
  }

  /**
   * Generate many signers and potentially provide them with tokens from the
   * faucet.
   *
   * This is preferred when generating multiple signers and tapping the faucet,
   * since the faucet endpoint should not be parallelized.
   */
  async makeSigners(
    /**
     * Number of signers to generate.
     */
    count: number,
    {
      noFaucet = false,
    }: {
      /**
       * If true, will not tap the faucet. Defaults to false.
       */
      noFaucet?: boolean
    } = {}
  ) {
    const signers = await Promise.all(
      [...new Array(count)].map(() => this.makeSigner({ noFaucet: true }))
    )

    if (!noFaucet) {
      // Tap faucet one at a time for each signer.
      for (const signer of signers) {
        await this.tapFaucet(signer.address)
      }
    }

    return signers
  }

  /**
   * Ensure this chain is set up, and register the chain as a supported chain.
   * This can only be done once the contracts are deployed.
   *
   * Once this is complete:
   * - the factory contract will be deployed and saved to the supported chain
   *   config.
   */
  async ensureChainSetUp() {
    _addSupportedChain({
      chain: this.chain,
      version: this.contractVersion,
      factoryContractAddress: '',
      explorerUrl: this.chain.explorers?.[0]?.url!,
    })

    const config = mustGetSupportedChainConfig(this.chainId)
    if (!config.codeIds.CwAdminFactory) {
      throw new Error('CwAdminFactory code ID not found')
    }

    // Find or deploy the CwAdminFactory contract.
    const contracts = await this.client.getContracts(
      config.codeIds.CwAdminFactory
    )
    if (contracts.length > 0) {
      config.factoryContractAddress = contracts[0]
    } else {
      console.log('Deploying new factory contract...')
      const { address, signingClient } = await this.makeSigner()
      config.factoryContractAddress = await instantiateSmartContract(
        signingClient,
        address,
        config.codeIds.CwAdminFactory,
        'CwAdminFactory',
        {}
      )
    }
  }

  /**
   * Wait for one block to pass.
   *
   * Times out after the given number of milliseconds.
   */
  async waitOneBlock(timeout = 10_000) {
    const start = Date.now()

    const currentBlock = await this.queryClient.fetchQuery(
      chainQueries.block({ chainId: this.chainId })
    )

    while (true) {
      const block = await this.queryClient.fetchQuery(
        chainQueries.block({ chainId: this.chainId })
      )

      if (block.header.height > currentBlock.header.height) {
        break
      }

      if (Date.now() - start > timeout) {
        throw new Error(`Timed out after ${timeout}ms waiting for block`)
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}
