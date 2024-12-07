import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import { ModuleInstantiateInfo } from '@dao-dao/types'
import {
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/NeutronVotingRegistry'
import { NEUTRON_VOTING_REGISTRY_CONTRACT_NAMES } from '@dao-dao/utils'

import { neutronVotingRegistryQueries } from '../../query'
import { CwDao } from '../dao/CwDao'
import { VotingModuleBase } from './base'

export class NeutronVotingRegistryVotingModule extends VotingModuleBase<CwDao> {
  static contractNames: readonly string[] =
    NEUTRON_VOTING_REGISTRY_CONTRACT_NAMES

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

    return neutronVotingRegistryQueries.votingPowerAtHeight({
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        address,
        height,
      },
    })
  }

  getTotalVotingPowerQuery(
    height?: number
  ): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return neutronVotingRegistryQueries.totalPowerAtHeight({
      chainId: this.chainId,
      contractAddress: this.address,
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
