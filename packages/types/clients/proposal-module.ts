import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { EncodeObject } from '@cosmjs/proto-signing'
import { FetchQueryOptions } from '@tanstack/react-query'

import { CheckedDepositInfo, Coin, Duration } from '../contracts/common'
import { PreProposeModule, ProposalModuleInfo } from '../dao'
import { ContractVersion, Feature } from '../features'
import { IDaoBase } from './dao'

export interface IProposalModuleBase<
  Dao extends IDaoBase = IDaoBase,
  Proposal = any,
  ProposalResponse = any,
  VoteResponse = any,
  VoteInfo = any,
  Vote = any,
  Config = any
> {
  /**
   * DAO this module belongs to.
   */
  dao: Dao

  /**
   * Proposal module info.
   */
  info: ProposalModuleInfo

  /**
   * Chain ID of the proposal module.
   */
  chainId: string

  /**
   * Contract address.
   */
  address: string

  /**
   * Contract version.
   */
  version: ContractVersion

  /**
   * Contract name.
   */
  contractName: string

  /**
   * Proposal module prefix in the DAO.
   */
  prefix: string

  /**
   * Pre-propose module, or null if none.
   */
  prePropose: PreProposeModule | null

  /**
   * Check whether or not the proposal module supports a given feature.
   */
  supports(feature: Feature): boolean

  /**
   * Make a proposal.
   */
  propose(options: {
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
  vote(options: {
    proposalId: number
    vote: Vote
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
  }): Promise<void>

  /**
   * Execute a passed proposal.
   */
  execute(options: {
    proposalId: number
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
    memo?: string
    nonCriticalExtensionOptions?: EncodeObject[]
  }): Promise<void>

  /**
   * Close a rejected proposal.
   */
  close(options: {
    proposalId: number
    getSigningClient: () => Promise<SigningCosmWasmClient>
    sender: string
  }): Promise<void>

  /**
   * Query options to fetch a proposal.
   */
  getProposalQuery(options: {
    proposalId: number
  }): FetchQueryOptions<ProposalResponse>

  /**
   * Fetch a proposal.
   */
  getProposal(options: { proposalId: number }): Promise<ProposalResponse>

  /**
   * Query options to fetch the vote on a proposal by a given address. If voter
   * is undefined, will return query in loading state.
   */
  getVoteQuery(options: {
    proposalId: number
    voter?: string
  }): FetchQueryOptions<VoteResponse>

  /**
   * Fetch the vote on a proposal by a given address. If the address has not
   * voted, it will return null.
   */
  getVote(options: {
    proposalId: number
    voter: string
  }): Promise<VoteInfo | null>

  /**
   * Query options to fetch the total number of proposals.
   */
  getProposalCountQuery(): FetchQueryOptions<number>

  /**
   * Fetch the total number of proposals.
   */
  getProposalCount(): Promise<number>

  /**
   * Query options to fetch the config.
   */
  getConfigQuery(): Pick<FetchQueryOptions<Config>, 'queryKey' | 'queryFn'>

  /**
   * Query options to fetch configured deposit info, if any.
   */
  getDepositInfoQuery(): Pick<
    FetchQueryOptions<CheckedDepositInfo | null>,
    'queryKey' | 'queryFn'
  >

  /**
   * Fetch the max voting period.
   */
  getMaxVotingPeriod(): Promise<Duration>
}
