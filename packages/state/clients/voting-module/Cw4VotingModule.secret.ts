import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import { SecretModuleInstantiateInfo } from '@dao-dao/types'
import {
  InstantiateMsg,
  Member,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/SecretDaoVotingCw4'
import {
  DAO_VOTING_CW4_CONTRACT_NAMES,
  encodeJsonToBase64,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { secretCw4GroupQueries, secretDaoVotingCw4Queries } from '../../query'
import { SecretCwDao } from '../dao'
import { VotingModuleBase } from './base'

export class SecretCw4VotingModule extends VotingModuleBase<SecretCwDao> {
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
          existingCw4GroupContract: {
            address: string
            codeHash: string
          }
        }
      | {
          /**
           * Create a new cw4-group contract.
           */
          new: {
            members: Member[]
          }
        }
  ): SecretModuleInstantiateInfo {
    const { codeIds, codeHashes } = mustGetSupportedChainConfig(chainId)
    if (!codeHashes) {
      throw new Error('Code hashes not configured for chain ' + chainId)
    }

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoVotingCw4,
      code_hash: codeHashes.DaoVotingCw4,
      label: `dao-voting-cw4_${Date.now()}`,
      msg: encodeJsonToBase64({
        dao_code_hash: codeHashes.DaoDaoCore,
        group_contract:
          'existingCw4GroupContract' in config
            ? {
                existing: {
                  address: config.existingCw4GroupContract.address,
                  code_hash: config.existingCw4GroupContract.codeHash,
                },
              }
            : {
                new: {
                  cw4_group_code_hash: codeHashes.Cw4Group,
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
    // If no address nor permit, return query in loading state.
    const permit = address && this.dao.getExistingPermit(address)
    if (!permit) {
      return {
        queryKey: [],
        queryFn: skipToken,
      }
    }

    return secretDaoVotingCw4Queries.votingPowerAtHeight({
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        auth: { permit },
        height,
      },
    })
  }

  async getVotingPower(
    address?: string,
    height?: number,
    /**
     * Whether or not to prompt the wallet for a permit. If true,
     * `dao.registerSignAmino` must be called first.
     *
     * Defaults to false.
     */
    prompt = false
  ): Promise<string> {
    if (prompt && address) {
      // Load permit now which will be retrieved in getVotingPowerQuery.
      await this.dao.getPermit(address)
    }

    return (
      await this.queryClient.fetchQuery(
        this.getVotingPowerQuery(address, height)
      )
    ).power
  }

  getTotalVotingPowerQuery(
    height?: number
  ): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return secretDaoVotingCw4Queries.totalPowerAtHeight({
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        height,
      },
    })
  }

  async getHookCaller(): Promise<string> {
    return (
      await this.queryClient.fetchQuery(
        secretDaoVotingCw4Queries.groupContract({
          chainId: this.chainId,
          contractAddress: this.address,
        })
      )
    ).addr
  }

  async getHooks(): Promise<string[]> {
    return (
      await this.queryClient.fetchQuery(
        secretCw4GroupQueries.hooks({
          chainId: this.chainId,
          contractAddress: await this.getHookCaller(),
        })
      )
    ).hooks.map(({ addr }) => addr)
  }
}
