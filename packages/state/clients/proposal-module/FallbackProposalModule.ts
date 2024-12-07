import { FetchQueryOptions } from '@tanstack/react-query'

import {
  CheckedDepositInfo,
  Duration,
  ModuleInstantiateInfo,
} from '@dao-dao/types'

import { CwDao } from '../dao/CwDao'
import { ProposalModuleBase } from './base'

export class FallbackProposalModule extends ProposalModuleBase<CwDao> {
  static contractNames: readonly string[] = []

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(): ModuleInstantiateInfo {
    throw new Error('Not implemented')
  }

  /**
   * Query options to fetch the DAO address.
   */
  static getDaoAddressQuery() {
    throw new Error('Not implemented')
  }

  async propose(): Promise<{
    proposalNumber: number
    proposalId: string
  }> {
    throw new Error('Not implemented')
  }

  async vote(): Promise<void> {
    throw new Error('Not implemented')
  }

  async execute(): Promise<void> {
    throw new Error('Not implemented')
  }

  async close(): Promise<void> {
    throw new Error('Not implemented')
  }

  getProposalQuery(): FetchQueryOptions {
    throw new Error('Not implemented')
  }

  async getProposal() {
    throw new Error('Not implemented')
  }

  getVoteQuery(): FetchQueryOptions {
    throw new Error('Not implemented')
  }

  async getVote() {
    throw new Error('Not implemented')
  }

  getProposalCountQuery(): FetchQueryOptions<number> {
    throw new Error('Not implemented')
  }

  getConfigQuery(): FetchQueryOptions {
    throw new Error('Not implemented')
  }

  getDepositInfoQuery(): Pick<
    FetchQueryOptions<CheckedDepositInfo | null>,
    'queryKey' | 'queryFn'
  > {
    throw new Error('Not implemented')
  }

  async getMaxVotingPeriod(): Promise<Duration> {
    throw new Error('Not implemented')
  }
}
