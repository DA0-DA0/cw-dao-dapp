import fs from 'fs'
import path from 'path'

import { ChainInfo } from '@chain-registry/client'
import { Asset } from '@chain-registry/types'
import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'
import { stringToPath as stringToHdPath } from '@cosmjs/crypto'
import { DirectSecp256k1HdWallet, coins } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { QueryClient } from '@tanstack/react-query'
import jsYaml from 'js-yaml'
import {
  ChainConfig,
  ConfigContext,
  generateMnemonic,
  useChain,
} from 'starshipjs'

import { CodeIdConfig, DeploySet, getDispatchConfig } from '@dao-dao/dispatch'
import {
  CwDao,
  DaoVoteDelegationClient,
  DaoVotingTokenStakedClient,
  SingleChoiceProposalModule,
  chainQueries,
  makeGetSignerOptions,
  makeReactQueryClient,
} from '@dao-dao/state'
import { AnyChain, ContractVersion, UnifiedCosmosMsg } from '@dao-dao/types'
import {
  _addChain,
  _addSupportedChain,
  getChainForChainName,
  instantiateSmartContract,
  isErrorWithSubstring,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

export type StarshipSuiteSigner = {
  mnemonic: string
  signer: DirectSecp256k1HdWallet
  address: string
  signingClient: SigningCosmWasmClient
}

export class StarshipSuite {
  public readonly queryClient: QueryClient

  constructor(
    public readonly starshipConfig: ChainConfig,
    public readonly chain: AnyChain,
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
      chain: _chain,
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
      chain: _chain,
      rpcEndpoint,
      restEndpoint,
    })

    const chain = getChainForChainName(chainName)

    const config = jsYaml.load(
      fs.readFileSync(ConfigContext.configFile, 'utf8')
    ) as ChainConfig

    const tapFaucet = async (address: string, denom?: string) => {
      const chainConfig = config.chains.find((c) => c.id === chain.chainId)
      if (!chainConfig) {
        throw new Error(`Chain config not found for ${chain.chainId}`)
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
    return this.chain.bech32Prefix
  }

  get chainId() {
    return this.chain.chainId
  }

  get chainName() {
    return this.chain.chainName
  }

  get gasPrice() {
    const price =
      this.chainInfo.chain.fees?.fee_tokens?.[0].fixed_min_gas_price || 0
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
  } = {}): Promise<StarshipSuiteSigner> {
    mnemonic ||= generateMnemonic()

    const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: this.bech32Prefix,
      hdPaths: [stringToHdPath(`m/44'/${this.chainInfo.chain.slip44}'/0'/0/0`)],
    })

    const address = (await signer.getAccounts())[0].address

    const signingClient = await SigningCosmWasmClient.connectWithSigner(
      this.rpcEndpoint,
      signer,
      makeGetSignerOptions(this.queryClient)(this.chainName)
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
  ): Promise<StarshipSuiteSigner[]> {
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
    // Ensure the contracts are deployed. Upload them if not.
    try {
      await this.client.getCodeDetails(1)
    } catch (err) {
      if (isErrorWithSubstring(err, 'no such code')) {
        console.log(
          'Contracts not uploaded. Uploading... (may take a few minutes)'
        )
        await this.uploadContracts()
        console.log('Uploaded contracts.')
      } else {
        throw err
      }
    }

    _addSupportedChain({
      chain: this.chain,
      version: this.contractVersion,
      factoryContractAddress: '',
      explorerUrl: this.chainInfo.chain.explorers?.[0]?.url!,
    })

    let config = mustGetSupportedChainConfig(this.chainId)
    if (!config.codeIds.CwAdminFactory) {
      console.log(
        'Contracts not configured. Uploading... (may take a few minutes)'
      )
      await this.uploadContracts()
      console.log('Uploaded contracts.')

      // Add again now that the contracts are uploaded.
      _addSupportedChain({
        chain: this.chain,
        version: this.contractVersion,
        factoryContractAddress: '',
        explorerUrl: this.chainInfo.chain.explorers?.[0]?.url!,
      })

      config = mustGetSupportedChainConfig(this.chainId)
    }

    if (!config.codeIds.CwAdminFactory) {
      throw new Error(
        `CwAdminFactory code ID still not found for chain ${this.chainId}`
      )
    }

    // Ensure the code is deployed. This will error if it is not.
    try {
      await this.client.getCodeDetails(config.codeIds.CwAdminFactory)
    } catch (err) {
      if (isErrorWithSubstring(err, 'no such code')) {
        throw new Error(
          `Configured CwAdminFactory code ID (${config.codeIds.CwAdminFactory}) not deployed. Are you sure you deployed the contracts?`
        )
      }

      throw err
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

  private async uploadContracts() {
    const contractDirs = getDispatchConfig().default.contract_dirs

    const codeIds = new CodeIdConfig(
      undefined,
      path.join(__dirname, '../../../utils/constants/codeIds.test.json')
    )

    const deploySets = DeploySet.getAutoDeploySets(this.chainId)

    const contracts = deploySets.flatMap((deploySet) => deploySet.contracts)
    // Make a signer for each contract so we can parallelize the uploads.
    const signers = await this.makeSigners(contracts.length)

    await Promise.all(
      contracts.map(async (contract, index) => {
        const signer = signers[index]

        // Upload the contract.
        const codeId = await contract.upload({
          client: signer.signingClient,
          sender: signer.address,
          contractDirs,
        })

        // Save the code ID.
        await codeIds.setCodeId({
          chainId: this.chainId,
          version: this.contractVersion,
          name: contract.name,
          codeId,
        })
      })
    )
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

  /**
   * Create, pass, and execute a single-choice proposal in a DAO.
   */
  async createAndExecuteSingleChoiceProposal(
    dao: CwDao,
    proposer: StarshipSuiteSigner,
    voters: StarshipSuiteSigner[],
    title: string,
    msgs: UnifiedCosmosMsg[]
  ) {
    const proposalModule = dao.proposalModules.find(
      (m) => m instanceof SingleChoiceProposalModule
    ) as SingleChoiceProposalModule

    if (!proposalModule) {
      throw new Error('Single choice proposal module not found')
    }

    // Create the proposal.
    const { proposalNumber } = await proposalModule.propose({
      data: {
        title,
        description: title,
        msgs,
      },
      signingClient: proposer.signingClient,
      sender: proposer.address,
    })

    // Vote on the proposal.
    await Promise.all(
      voters.map((voter) =>
        proposalModule.vote({
          proposalId: proposalNumber,
          signingClient: voter.signingClient,
          sender: voter.address,
          vote: 'yes',
        })
      )
    )

    // Execute the proposal.
    await proposalModule.execute({
      proposalId: proposalNumber,
      signingClient: proposer.signingClient,
      sender: proposer.address,
    })
  }

  /**
   * Stake native tokens.
   */
  async stakeNativeTokens(
    contract: string,
    signer: StarshipSuiteSigner,
    amount: number | string,
    denom: string
  ) {
    await new DaoVotingTokenStakedClient(
      signer.signingClient,
      signer.address,
      contract
    ).stake(undefined, undefined, coins(amount, denom))
  }

  /**
   * Register as a delegate.
   */
  async registerAsDelegate(contract: string, delegate: StarshipSuiteSigner) {
    await new DaoVoteDelegationClient(
      delegate.signingClient,
      delegate.address,
      contract
    ).register()
  }

  /**
   * Unregister as a delegate.
   */
  async unregisterAsDelegate(contract: string, delegate: StarshipSuiteSigner) {
    await new DaoVoteDelegationClient(
      delegate.signingClient,
      delegate.address,
      contract
    ).unregister()
  }

  /**
   * Delegate voting power to a given address.
   */
  async delegate(
    contract: string,
    delegator: StarshipSuiteSigner,
    delegate: string,
    percent: string
  ) {
    await new DaoVoteDelegationClient(
      delegator.signingClient,
      delegator.address,
      contract
    ).delegate({
      delegate,
      percent,
    })
  }

  /**
   * Undelegate voting power from a given address.
   */
  async undelegate(
    contract: string,
    delegator: StarshipSuiteSigner,
    delegate: string
  ) {
    await new DaoVoteDelegationClient(
      delegator.signingClient,
      delegator.address,
      contract
    ).undelegate({
      delegate,
    })
  }
}
