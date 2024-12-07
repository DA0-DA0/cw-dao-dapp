import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { EncodeObject } from '@cosmjs/proto-signing'
import { FetchQueryOptions, QueryClient } from '@tanstack/react-query'

import {
  CheckedDepositInfo,
  Coin,
  ContractVersion,
  Duration,
  Feature,
  IDaoBase,
  IProposalModuleBase,
  PreProposeModule,
} from '@dao-dao/types'
import { VetoConfig } from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import { isFeatureSupportedByVersion } from '@dao-dao/utils'

export abstract class ProposalModuleBase<
  Dao extends IDaoBase = IDaoBase,
  Proposal = any,
  ProposalResponse = any,
  VoteResponse = any,
  VoteInfo = any,
  Vote = any,
  Config = any
> implements
    IProposalModuleBase<
      Dao,
      Proposal,
      ProposalResponse,
      VoteResponse,
      VoteInfo,
      Vote,
      Config
    >
{
  /**
   * The contract names that this module supports.
   */
  static contractNames: readonly string[]

  /**
   * Whether or not the client has been initialized. This only matters for some
   * functions, depending on the implementation.
   */
  protected _initialized: boolean = false

  /**
   * Contract version.
   */
  protected _version: ContractVersion = ContractVersion.Unknown

  /**
   * Contract name.
   */
  protected _contractName: string = ''

  /**
   * Pre-propose module, or null if none.
   */
  protected _prePropose: PreProposeModule | null = null

  /**
   * Veto config, or null if disabled.
   */
  protected _veto: VetoConfig | null = null

  constructor(
    /**
     * Query client.
     */
    protected readonly queryClient: QueryClient,
    /**
     * DAO this module belongs to.
     */
    public readonly dao: Dao,
    /**
     * Chain ID of the proposal module.
     */
    public readonly chainId: string,
    /**
     * Contract address.
     */
    public readonly address: string,
    /**
     * Proposal module prefix in the DAO.
     */
    public readonly prefix: string
  ) {}

  /**
   * Initialize the client. This only matters for some functions, depending on
   * the implementation.
   */
  init() {
    this._initialized = true
  }

  /**
   * Whether or not the client has been initialized. This only matters for some
   * functions, depending on the implementation.
   */
  get initialized(): boolean {
    return this._initialized
  }

  /**
   * Contract version.
   */
  get version(): ContractVersion {
    if (!this.initialized) {
      throw new Error('Not initialized')
    }
    return this._version
  }

  /**
   * Contract name.
   */
  get contractName(): string {
    if (!this.initialized) {
      throw new Error('Not initialized')
    }
    return this._contractName
  }

  /**
   * Pre-propose module, or null if none.
   */
  get prePropose(): PreProposeModule | null {
    if (!this.initialized) {
      throw new Error('Not initialized')
    }
    return this._prePropose
  }

  /**
   * Veto config, or null if not enabled.
   */
  get veto(): VetoConfig | null {
    if (!this.initialized) {
      throw new Error('Not initialized')
    }
    return this._veto
  }

  /**
   * Check whether or not the proposal module supports a given feature.
   */
  supports(feature: Feature): boolean {
    return isFeatureSupportedByVersion(feature, this.version)
  }

  /**
   * Make a proposal.
   */
  abstract propose(options: {
    data: Proposal
    /**
     * Cast a vote with the proposal.
     */
    vote?: Vote
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
    funds?: Coin[]
  }): Promise<{
    proposalNumber: number
    proposalId: string
  }>

  /**
   * Vote on a proposal.
   */
  abstract vote(options: {
    proposalId: number
    vote: Vote
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
  }): Promise<void>

  /**
   * Execute a passed proposal.
   */
  abstract execute(options: {
    proposalId: number
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
    memo?: string
    nonCriticalExtensionOptions?: EncodeObject[]
  }): Promise<void>

  /**
   * Close a rejected proposal.
   */
  abstract close(options: {
    proposalId: number
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
  }): Promise<void>

  /**
   * Query options to fetch a proposal.
   */
  abstract getProposalQuery(options: {
    proposalId: number
  }): FetchQueryOptions<ProposalResponse>

  /**
   * Fetch a proposal.
   */
  abstract getProposal(options: {
    proposalId: number
  }): Promise<ProposalResponse>

  /**
   * Query options to fetch the vote on a proposal by a given address. If voter
   * is undefined, will return query in loading state.
   */
  abstract getVoteQuery(options: {
    proposalId: number
    voter?: string
  }): FetchQueryOptions<VoteResponse>

  /**
   * Fetch the vote on a proposal by a given address. If the address has not
   * voted, it will return null.
   */
  abstract getVote(options: {
    proposalId: number
    voter: string
  }): Promise<VoteInfo | null>

  /**
   * Query options to fetch the total number of proposals.
   */
  abstract getProposalCountQuery(): FetchQueryOptions<number>

  /**
   * Fetch the total number of proposals.
   */
  async getProposalCount(
    ...params: Parameters<ProposalModuleBase['getProposalCountQuery']>
  ): Promise<number> {
    return await this.queryClient.fetchQuery(
      this.getProposalCountQuery(...params)
    )
  }

  /**
   * Query options to fetch the config.
   */
  abstract getConfigQuery(): Pick<
    FetchQueryOptions<Config>,
    'queryKey' | 'queryFn'
  >

  /**
   * Query options to fetch configured deposit info, if any.
   */
  abstract getDepositInfoQuery(): Pick<
    FetchQueryOptions<CheckedDepositInfo | null>,
    'queryKey' | 'queryFn'
  >

  /**
   * Fetch the max voting period.
   */
  abstract getMaxVotingPeriod(): Promise<Duration>
}
