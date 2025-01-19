import fs from 'fs'
import path from 'path'

import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'
import { stringToPath as stringToHdPath } from '@cosmjs/crypto'
import { DirectSecp256k1HdWallet, coins } from '@cosmjs/proto-signing'
import { GasPrice, calculateFee } from '@cosmjs/stargate'
import { QueryClient } from '@tanstack/react-query'
import dotenv from 'dotenv'
import jsYaml from 'js-yaml'
import lockfile from 'proper-lockfile'
import {
  ChainConfig,
  ConfigContext,
  generateMnemonic,
  useChain,
} from 'starshipjs'
import { expect } from 'vitest'

import { CodeIdConfig, DeploySet, getDispatchConfig } from '@dao-dao/dispatch'
import { HugeDecimal } from '@dao-dao/math'
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
import { MsgSend } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/tx'
import { TxRaw } from '@dao-dao/types/protobuf/codegen/cosmos/tx/v1beta1/tx'
import {
  CHAIN_GAS_MULTIPLIER,
  _addChain,
  _addSupportedChain,
  batch,
  getChainForChainId,
  getChainForChainName,
  getLcdForChainId,
  getNativeTokenForChainId,
  getRpcForChainId,
  instantiateSmartContract,
  isErrorWithSubstring,
} from '@dao-dao/utils'

const SUITE_LOCK_PATH = path.join(__dirname, 'suite.ts')
const MNEMONIC_FILE_PATH = path.join(__dirname, '../mnemonics')

export type TestSuiteSigner = {
  mnemonic: string
  signer: DirectSecp256k1HdWallet
  address: string
  /**
   * Ensure the signer has tokens, tapping the faucet if necessary.
   */
  ensureHasTokens: (
    /**
     * Amount of tokens to ensure are available.
     */
    amount: number,
    /**
     * Denom of the token. Defaults to the chain's native denom.
     */
    denom?: string
  ) => Promise<void>
  /**
   * Get token balance.
   */
  getBalance: (
    /**
     * Denom of the token. Defaults to the chain's native denom.
     */
    denom?: string
  ) => Promise<HugeDecimal>
  /**
   * Get a signing client.
   */
  getSigningClient: () => Promise<SigningCosmWasmClient>
}

export class TestSuite {
  public readonly queryClient: QueryClient
  public readonly codeIdConfig: CodeIdConfig

  /**
   * The index of the mnemonic to use next when making signers from the
   * mnemonics file.
   */
  private nextMnemonicIndex: number = 0

  constructor(
    public readonly chain: AnyChain,
    /**
     * Native denom for the chain.
     */
    public readonly denom: string,
    public readonly rpcEndpoint: string,
    public readonly restEndpoint: string,
    public readonly tapFaucet: (
      /**
       * Address to send tokens to.
       */
      address: string,
      /**
       * Denom to send tokens in. Defaults to the chain's native denom.
       */
      denom?: string,
      /**
       * Amount of tokens to send. Defaults to at least 10,000 in microunits
       * (more if the faucet sends more than that at minimum).
       */
      amount?: number
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

    this.codeIdConfig = new CodeIdConfig(
      undefined,
      path.join(__dirname, '../../utils/constants/codeIds.test.json')
    )

    // Ensure mnemonics file exists.
    if (!fs.existsSync(MNEMONIC_FILE_PATH)) {
      fs.writeFileSync(MNEMONIC_FILE_PATH, '')
    }
  }

  /**
   * Initialize the test suite for a local chain powered by Starship.
   */
  static async initStarship(
    chainName: string,
    contractVersion: ContractVersion
  ) {
    // Initialize the starshipjs config.
    await ConfigContext.init(path.join(__dirname, '../starship.config.yml'))

    const {
      chain: _chain,
      getCoin,
      getRpcEndpoint,
      getRestEndpoint,
    } = useChain(chainName)

    // Parallelize all the async calls.
    const [{ base: denom }, { rpcEndpoint, client }, restEndpoint] =
      await Promise.all([
        getCoin(),
        getRpcEndpoint().then(async (rpcEndpoint) => ({
          rpcEndpoint,
          client: await CosmWasmClient.connect(rpcEndpoint),
        })),
        getRestEndpoint(),
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

    const tapFaucet = async (
      address: string,
      denom?: string,
      // The Starship faucet sends 10,000 tokens (in macrounits) by default.
      amount = 10_000_000_000
    ) => {
      const chainConfig = config.chains.find((c) => c.id === chain.chainId)
      if (!chainConfig) {
        throw new Error(`Chain config not found for ${chain.chainId}`)
      }
      const faucetEndpoint = `http://localhost:${chainConfig.ports.faucet}/credit`

      if (!denom) {
        denom = suite.denom
      }

      // How much the Starship faucet sends in one request.
      const faucetAmount = 10_000_000_000

      while (amount > 0) {
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

        amount -= faucetAmount
      }
    }

    const suite = new TestSuite(
      chain,
      denom,
      rpcEndpoint,
      restEndpoint,
      tapFaucet,
      client,
      contractVersion
    )

    return suite
  }

  /**
   * Initialize the test suite for an existing chain.
   */
  static async initExisting(chainId: string, contractVersion: ContractVersion) {
    const { parsed: { WALLET_FAUCET_MNEMONIC: faucetMnemonic } = {} } =
      dotenv.config()
    if (!faucetMnemonic) {
      throw new Error(
        'WALLET_FAUCET_MNEMONIC is not set. Please set it in the .env file.'
      )
    }

    const chain = getChainForChainId(chainId)
    const nativeToken = getNativeTokenForChainId(chainId)
    const rpcEndpoint = getRpcForChainId(chainId)
    const restEndpoint = getLcdForChainId(chainId)
    const client = await CosmWasmClient.connect(rpcEndpoint)

    // Send tokens to the address from the configured address. Most chains don't
    // have public faucet APIs, so instead we'll just send tokens from an
    // existing signer with tokens.
    const tapFaucet = async (
      address: string,
      denom = nativeToken.denomOrAddress,
      amount = 10_000
    ) => {
      const faucetSigner = await DirectSecp256k1HdWallet.fromMnemonic(
        faucetMnemonic,
        { prefix: chain.bech32Prefix }
      )
      const faucetSignerAddress = (await faucetSigner.getAccounts())[0].address
      const signingClient = await SigningCosmWasmClient.connectWithSigner(
        rpcEndpoint,
        faucetSigner,
        makeGetSignerOptions(suite.queryClient)(chain.chainName)
      )

      await signingClient.sendTokens(
        faucetSignerAddress,
        address,
        coins(amount, denom),
        CHAIN_GAS_MULTIPLIER
      )
    }

    const suite = new TestSuite(
      chain,
      nativeToken.denomOrAddress,
      rpcEndpoint,
      restEndpoint,
      tapFaucet,
      client,
      contractVersion
    )

    return suite
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
      this.chain.chainRegistry?.fees?.fee_tokens?.[0].fixed_min_gas_price || 0
    return GasPrice.fromString(`${price}${this.denom}`)
  }

  /**
   * Ensure an address has tokens, tapping the faucet if necessary.
   */
  async ensureHasTokens(
    /**
     * The address to ensure has tokens.
     */
    address: string,
    /**
     * The amount of tokens to ensure are available.
     */
    amount: number,
    /**
     * Denom of the token. Defaults to the chain's native denom.
     */
    denom = this.denom
  ) {
    const balance = await this.getBalance(address, denom)
    if (balance.lt(amount)) {
      await this.tapFaucet(address, denom, amount - balance.toNumber())
    }
  }

  /**
   * Generate a signer and potentially provide it with at least 10,000 tokens
   * (in microunits) from the faucet.
   */
  async makeSigner({
    mnemonic,
    noFaucet = false,
    balance = 10_000,
  }: {
    /**
     * If undefined, will generate a random mnemonic.
     */
    mnemonic?: string
    /**
     * If true, will not tap the faucet. Defaults to false.
     */
    noFaucet?: boolean
    /**
     * Amount of tokens to ensure are available. Defaults to 10,000 in
     * microunits.
     */
    balance?: number
  } = {}): Promise<TestSuiteSigner> {
    // If no mnemonic provided, reuse if possible, or generate a new one. This
    // reuse mechanic is primarily conserve fees when testing on existing
    // chains. It can be difficult to acquire lots of test tokens, so we want to
    // conserve tokens where possible across tests.
    if (!mnemonic) {
      // Establish lock before reading and writing mnemonics.
      const releaseLock = await lockfile.lock(MNEMONIC_FILE_PATH, {
        retries: {
          forever: true,
          minTimeout: 100,
          factor: 1.1,
          randomize: true,
        },
      })

      try {
        // Read the mnemonics file.
        const mnemonics = fs
          .readFileSync(MNEMONIC_FILE_PATH, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)

        // If no mnemonic is available, generate a new one and save it. Otherwise
        // reuse the next available mnemonic.
        if (this.nextMnemonicIndex >= mnemonics.length) {
          mnemonic = generateMnemonic()
          mnemonics.push(mnemonic)
          fs.writeFileSync(MNEMONIC_FILE_PATH, mnemonics.join('\n'))
        } else {
          mnemonic = mnemonics[this.nextMnemonicIndex]
        }

        // Increment the index to avoid using the same mnemonic next time.
        this.nextMnemonicIndex++
      } finally {
        // Release lock.
        await releaseLock()
      }
    }

    const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: this.bech32Prefix,
      hdPaths: [
        stringToHdPath(`m/44'/${this.chain.chainRegistry?.slip44}'/0'/0/0`),
      ],
    })

    const address = (await signer.getAccounts())[0].address

    const getSigningClient = () =>
      SigningCosmWasmClient.connectWithSigner(
        this.rpcEndpoint,
        signer,
        makeGetSignerOptions(this.queryClient)(this.chainName)
      )

    const ensureHasTokens: TestSuiteSigner['ensureHasTokens'] = (...params) =>
      this.ensureHasTokens(address, ...params)

    const getBalance: TestSuiteSigner['getBalance'] = async (...params) =>
      this.getBalance(address, ...params)

    if (!noFaucet) {
      await ensureHasTokens(balance)
    }

    return {
      mnemonic,
      signer,
      address,
      ensureHasTokens,
      getBalance,
      getSigningClient,
    }
  }

  /**
   * Generate many signers and provide them with tokens from the faucet.
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
      amount = 10_000,
      noLock = false,
    }: {
      /**
       * Amount of tokens to send to each signer. If zero, no tokens will be
       * sent.
       */
      amount?: number
      /**
       * If true, will not establish a lock. This should only be used if the
       * caller already has a lock, like in `ensureChainSetUp`.
       */
      noLock?: boolean
    } = {}
  ): Promise<TestSuiteSigner[]> {
    // Make signers in parallel.
    const signers = await Promise.all(
      [...new Array(count)].map(() => this.makeSigner({ noFaucet: true }))
    )

    if (amount > 0) {
      // Establish lock before tapping the faucet for a bunch of signers since
      // this function is designed to fund signers as fast as the chain node can
      // handle, and parallelized execution may cause the node to crash.
      const releaseLock = noLock
        ? () => {}
        : await lockfile.lock(SUITE_LOCK_PATH, {
            retries: {
              forever: true,
              minTimeout: 100,
              factor: 1.1,
              randomize: true,
            },
          })

      try {
        // Get the signers with insufficient balance.
        const insufficientBalanceSigners: {
          signer: TestSuiteSigner
          missing: number
        }[] = []

        // Parallelize balance checks in batches of 100.
        await batch({
          list: signers,
          batchSize: 100,
          grouped: true,
          task: (group) =>
            Promise.all(
              group.map(async (signer) => {
                const balance = await signer.getBalance()
                if (balance.lt(amount)) {
                  insufficientBalanceSigners.push({
                    signer,
                    missing: amount - balance.toNumber(),
                  })
                }
              })
            ),
          tries: 3,
          delayMs: 1_000,
        })

        if (insufficientBalanceSigners.length === 0) {
          return signers
        }

        const totalMissing = insufficientBalanceSigners.reduce(
          (sum, signer) => sum + signer.missing,
          0
        )

        const faucetSigner = await this.makeSigner({
          // 100,000 tokens for own gas, and then tokens for each signer.
          balance: 100_000 + totalMissing,
        })
        const faucetSignerClient = await faucetSigner.getSigningClient()

        // Send tokens to each signer, batched by 200.
        const batchSize = 200
        const batches = Math.ceil(insufficientBalanceSigners.length / batchSize)
        const getMessagesForBatch = (batch: number) =>
          insufficientBalanceSigners
            .slice(batch * batchSize, (batch + 1) * batchSize)
            .map(({ signer, missing }) => ({
              typeUrl: MsgSend.typeUrl,
              value: MsgSend.fromPartial({
                fromAddress: faucetSigner.address,
                toAddress: signer.address,
                amount: coins(missing, this.denom),
              }),
            }))

        // Retrieve account number, sequence, and fee only once to avoid redundant
        // queries. Use first batch to estimate gas.
        const { accountNumber, sequence } =
          await faucetSignerClient.getSequence(faucetSigner.address)
        const gasEstimation = await faucetSignerClient.simulate(
          faucetSigner.address,
          getMessagesForBatch(0),
          undefined
        )
        const fee = calculateFee(
          Math.round(gasEstimation * 2),
          faucetSignerClient['gasPrice']
        )

        // Broadcast the transactions in sequence.
        for (let i = 0; i < batches; i++) {
          const txRaw = await faucetSignerClient.sign(
            faucetSigner.address,
            getMessagesForBatch(i),
            fee,
            '',
            {
              accountNumber,
              sequence: sequence + i,
              chainId: this.chainId,
            }
          )
          const txBytes = TxRaw.encode(txRaw).finish()
          await faucetSignerClient.broadcastTx(txBytes)
        }
      } finally {
        // Release lock.
        await releaseLock()
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
    // Establish lock before potentially uploading contracts/instantiating the
    // factory so that parallelized tests do not perform redundant operations.
    const releaseLock = await lockfile.lock(SUITE_LOCK_PATH, {
      retries: {
        forever: true,
        minTimeout: 100,
        factor: 1.1,
        randomize: true,
      },
    })

    let config = _addSupportedChain({
      chain: this.chain,
      version: this.contractVersion,
      factoryContractAddress: '',
      explorerUrl: this.chain.chainRegistry?.explorers?.[0]?.url!,
    })

    // Ensure the contracts are deployed. Upload them if not.
    const deploySets = DeploySet.getAutoDeploySets(this.chainId)
    const deployContracts = deploySets.flatMap(
      (deploySet) => deploySet.contracts
    )

    try {
      // Ensure code ID exists in the config for every contract.
      const allCodeIds = await Promise.all(
        deployContracts.map((contract) =>
          this.codeIdConfig
            .getCodeId({
              chainId: this.chainId,
              name: contract.name,
              version: this.contractVersion,
            })
            .then((codeId) =>
              codeId === null
                ? Promise.reject(new Error('no such code'))
                : codeId
            )
        )
      )

      // Ensure all code IDs exist on-chain.
      for (const codeId of allCodeIds) {
        await this.client.getCodeDetails(codeId)
      }
    } catch (err) {
      // If any code ID is missing, upload the contracts.
      if (isErrorWithSubstring(err, 'no such code')) {
        console.log('Contracts not uploaded. Uploading... (eta <1 min)')
        await this.uploadContracts()
        console.log('Uploaded contracts.')

        // Add again now that the contracts are uploaded.
        config = _addSupportedChain({
          chain: this.chain,
          version: this.contractVersion,
          factoryContractAddress: '',
          explorerUrl: this.chain.chainRegistry?.explorers?.[0]?.url!,
        })
      } else {
        throw err
      }
    }

    if (!config.codeIds.CwAdminFactory) {
      console.log(config)
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
    if (deployContracts.length > 0) {
      config.factoryContractAddress = contracts[0]
    } else {
      console.log('Deploying new factory contract...')
      const { address, getSigningClient } = await this.makeSigner()
      config.factoryContractAddress = await instantiateSmartContract(
        getSigningClient,
        address,
        config.codeIds.CwAdminFactory,
        'CwAdminFactory',
        {}
      )
    }

    // Release lock.
    await releaseLock()
  }

  private async uploadContracts() {
    const contractDirs = getDispatchConfig().default.contract_dirs

    const deploySets = DeploySet.getAutoDeploySets(this.chainId)
    const contracts = deploySets.flatMap((deploySet) => deploySet.contracts)

    // Make a signer for each contract so we can parallelize the uploads.
    const signers = await this.makeSigners(contracts.length, {
      amount: 100_000,
      noLock: true,
    })

    await Promise.all(
      contracts.map(async (contract, index) => {
        const signer = signers[index]

        // Upload the contract.
        const codeId = await contract.upload({
          client: await signer.getSigningClient(),
          sender: signer.address,
          contractDirs,
        })

        // Save the code ID.
        await this.codeIdConfig.setCodeId({
          chainId: this.chainId,
          version: this.contractVersion,
          name: contract.name,
          codeId,
        })
      })
    )
  }

  /**
   * Get the balance of an address.
   */
  async getBalance(
    /**
     * The address to get the balance of.
     */
    address: string,
    /**
     * Denom of the token. Defaults to the chain's native denom.
     */
    denom = this.denom
  ) {
    return HugeDecimal.from(
      (await this.client.getBalance(address, denom)).amount
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
   * Create a single-choice proposal in a DAO.
   */
  async createSingleChoiceProposal(
    dao: CwDao,
    proposer: TestSuiteSigner,
    title: string,
    msgs: UnifiedCosmosMsg[] = []
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
      signingClient: proposer.getSigningClient,
      sender: proposer.address,
    })

    const { proposal } = await proposalModule.getProposal({
      proposalId: proposalNumber,
    })

    return {
      proposalModule,
      proposalNumber,
      proposal,
    }
  }

  /**
   * Vote on a single-choice proposal in a DAO.
   */
  async voteOnSingleChoiceProposal(
    proposalModule: SingleChoiceProposalModule,
    proposalNumber: number,
    voters: TestSuiteSigner | TestSuiteSigner[],
    vote: 'yes' | 'no' | 'abstain'
  ) {
    // Vote on the proposal in batches of 100.
    await batch({
      list: [voters].flat(),
      batchSize: 100,
      task: (voter) =>
        proposalModule.vote({
          proposalId: proposalNumber,
          signingClient: voter.getSigningClient,
          sender: voter.address,
          vote,
        }),
      tries: 3,
      delayMs: 1000,
    })

    const { proposal } = await proposalModule.getProposal({
      proposalId: proposalNumber,
    })

    return proposal
  }

  /**
   * Execute a single-choice proposal in a DAO.
   */
  async executeSingleChoiceProposal(
    proposalModule: SingleChoiceProposalModule,
    proposalNumber: number,
    proposer: TestSuiteSigner
  ) {
    await proposalModule.execute({
      proposalId: proposalNumber,
      signingClient: proposer.getSigningClient,
      sender: proposer.address,
    })

    const { proposal } = await proposalModule.getProposal({
      proposalId: proposalNumber,
    })

    return proposal
  }

  /**
   * Create, pass, and execute a single-choice proposal in a DAO.
   */
  async createAndExecuteSingleChoiceProposal(
    dao: CwDao,
    proposer: TestSuiteSigner,
    voters: TestSuiteSigner[],
    title: string,
    msgs?: UnifiedCosmosMsg[],
    expectExecutionResult: 'success' | 'failure' | 'any' = 'success'
  ) {
    const { proposalModule, proposalNumber } =
      await this.createSingleChoiceProposal(dao, proposer, title, msgs)

    await this.voteOnSingleChoiceProposal(
      proposalModule,
      proposalNumber,
      voters,
      'yes'
    )

    const proposal = await this.executeSingleChoiceProposal(
      proposalModule,
      proposalNumber,
      proposer
    )

    // Ensure the proposal execution succeeded.
    if (expectExecutionResult !== 'any') {
      expect(proposal.status).toBe(
        expectExecutionResult === 'success' ? 'executed' : 'execution_failed'
      )
    }

    return {
      proposalModule,
      proposalNumber,
      proposal,
    }
  }

  /**
   * Stake native tokens.
   */
  async stakeNativeTokens(
    contract: string,
    signer: TestSuiteSigner,
    amount: number | string,
    denom: string
  ) {
    await new DaoVotingTokenStakedClient(
      await signer.getSigningClient(),
      signer.address,
      contract
    ).stake(undefined, undefined, coins(amount, denom))
  }

  /**
   * Unstake native tokens.
   */
  async unstakeNativeTokens(
    contract: string,
    signer: TestSuiteSigner,
    amount: number | string
  ) {
    await new DaoVotingTokenStakedClient(
      await signer.getSigningClient(),
      signer.address,
      contract
    ).unstake({
      amount: BigInt(amount).toString(),
    })
  }

  /**
   * Register as a delegate.
   */
  async registerAsDelegate(contract: string, delegate: TestSuiteSigner) {
    await new DaoVoteDelegationClient(
      await delegate.getSigningClient(),
      delegate.address,
      contract
    ).register()
  }

  /**
   * Unregister as a delegate.
   */
  async unregisterAsDelegate(contract: string, delegate: TestSuiteSigner) {
    await new DaoVoteDelegationClient(
      await delegate.getSigningClient(),
      delegate.address,
      contract
    ).unregister()
  }

  /**
   * Delegate voting power to a given address.
   */
  async delegate(
    contract: string,
    delegator: TestSuiteSigner,
    delegate: string,
    percent: string
  ) {
    await new DaoVoteDelegationClient(
      await delegator.getSigningClient(),
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
    delegator: TestSuiteSigner,
    delegate: string
  ) {
    await new DaoVoteDelegationClient(
      await delegator.getSigningClient(),
      delegator.address,
      contract
    ).undelegate({
      delegate,
    })
  }
}
