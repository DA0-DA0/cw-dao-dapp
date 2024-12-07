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
import { ConfigContext, generateMnemonic, useChain } from 'starshipjs'

import { makeGetSignerOptions, makeReactQueryClient } from '@dao-dao/state'
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
    public readonly chain: Chain,
    public readonly chainInfo: ChainInfo,
    public readonly coin: Asset,
    public readonly rpcEndpoint: string,
    public readonly restEndpoint: string,
    public readonly genesisMnemonic: string,
    public readonly creditFromFaucet: (
      address: string,
      denom?: string
    ) => Promise<void>,
    public readonly client: CosmWasmClient,
    /**
     * The version of the contracts deployed to the chain.
     */
    public readonly contractVersion: ContractVersion
  ) {
    this.queryClient = makeReactQueryClient()
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
      creditFromFaucet,
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

    const suite = new StarshipSuite(
      chain,
      chainInfo,
      coin,
      rpcEndpoint,
      restEndpoint,
      genesisMnemonic,
      creditFromFaucet,
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

  async makeSigner({
    mnemonic,
  }: {
    /**
     * If undefined, will generate a random mnemonic.
     */
    mnemonic?: string
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

    await this.creditFromFaucet(address)

    return {
      mnemonic,
      signer,
      address,
      signingClient,
    }
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
}
