import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import { ModuleInstantiateInfo } from '@dao-dao/types'
import {
  InstantiateMsg,
  Member,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoVotingCw4'
import {
  DAO_VOTING_CW4_CONTRACT_NAMES,
  encodeJsonToBase64,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { cw4GroupQueries, daoVotingCw4Queries } from '../../query'
import { CwDao } from '../dao/CwDao'
import { VotingModuleBase } from './base'

export class Cw4VotingModule extends VotingModuleBase<CwDao> {
  static contractNames: readonly string[] = DAO_VOTING_CW4_CONTRACT_NAMES

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(
    chainId: string,
    config:
      | {
          /**
           * Use an existing cw4-group contract.
           */
          existingCw4GroupContract: string
        }
      | {
          /**
           * Create a new cw4-group contract.
           */
          new: {
            members: Member[]
          }
        }
  ): ModuleInstantiateInfo {
    const { codeIds } = mustGetSupportedChainConfig(chainId)

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoVotingCw4,
      label: `dao-voting-cw4_${Date.now()}`,
      msg: encodeJsonToBase64({
        group_contract:
          'existingCw4GroupContract' in config
            ? {
                existing: {
                  address: config.existingCw4GroupContract,
                },
              }
            : {
                new: {
                  cw4_group_code_id: codeIds.Cw4Group,
                  initial_members: config.new.members,
                },
              },
      } as InstantiateMsg),
      funds: [],
    }
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

    return daoVotingCw4Queries.votingPowerAtHeight(this.queryClient, {
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
    return daoVotingCw4Queries.totalPowerAtHeight(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        height,
      },
    })
  }

  async getHookCaller(): Promise<string> {
    return this.queryClient.fetchQuery(
      daoVotingCw4Queries.groupContract(this.queryClient, {
        chainId: this.chainId,
        contractAddress: this.address,
      })
    )
  }

  async getHooks(): Promise<string[]> {
    return (
      await this.queryClient.fetchQuery(
        cw4GroupQueries.hooks(this.queryClient, {
          chainId: this.chainId,
          contractAddress: await this.getHookCaller(),
        })
      )
    ).hooks
  }
}
