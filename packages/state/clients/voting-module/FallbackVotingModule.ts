import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import { ModuleInstantiateInfo } from '@dao-dao/types'
import {
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoVotingCw4'

import { daoDaoCoreQueries } from '../../query'
import { CwDao } from '../dao/CwDao'
import { VotingModuleBase } from './base'

export class FallbackVotingModule extends VotingModuleBase<CwDao> {
  static contractNames: readonly string[] = []

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(): ModuleInstantiateInfo {
    throw new Error('Not implemented')
  }

  getVotingPowerQuery(
    address?: string,
    height?: number
  ): FetchQueryOptions<VotingPowerAtHeightResponse> {
    // If no address, return query in loading state.
    if (!address) {
      return {
        queryKey: [],
        queryFn: skipToken,
      }
    }

    return daoDaoCoreQueries.votingPowerAtHeight(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.dao.coreAddress,
      args: {
        address,
        height,
      },
    })
  }

  getTotalVotingPowerQuery(
    height?: number
  ): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return daoDaoCoreQueries.totalPowerAtHeight(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.dao.coreAddress,
      args: {
        height,
      },
    })
  }

  getHookCaller(): string {
    throw new Error('Not implemented')
  }

  getHooks(): Promise<string[]> {
    throw new Error('Not implemented')
  }
}
