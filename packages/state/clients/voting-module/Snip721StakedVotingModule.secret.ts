import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import {
  GenericToken,
  SecretModuleInstantiateInfo,
  TokenType,
} from '@dao-dao/types'
import {
  ActiveThreshold,
  Duration,
  InstantiateMsg,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/SecretDaoVotingSnip721Staked'
import {
  DAO_VOTING_CW721_STAKED_CONTRACT_NAMES,
  encodeJsonToBase64,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import {
  cw721BaseQueries,
  secretDaoVotingSnip721StakedQueries,
} from '../../query'
import { SecretCwDao } from '../dao'
import { VotingModuleBase } from './base'

export class SecretSnip721StakedVotingModule extends VotingModuleBase<SecretCwDao> {
  static contractNames: readonly string[] =
    DAO_VOTING_CW721_STAKED_CONTRACT_NAMES

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(
    chainId: string,
    config: {
      activeThreshold?: ActiveThreshold | null
      unstakingDuration?: Duration | null
      nft: {
        /**
         * Use an existing cw721 collection.
         */
        existing: {
          address: string
          codeHash: string
        }
      }
    }
  ): SecretModuleInstantiateInfo {
    const { codeIds, codeHashes } = mustGetSupportedChainConfig(chainId)
    if (!codeHashes) {
      throw new Error('Codes not configured for chain ' + chainId)
    }

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoVotingCw721Staked,
      code_hash: codeHashes.DaoVotingCw721Staked,
      label: `dao-voting-snip721-staked_${Date.now()}`,
      msg: encodeJsonToBase64({
        active_threshold: config.activeThreshold,
        dao_code_hash: codeHashes.DaoDaoCore,
        nft_contract: {
          existing: {
            address: config.nft.existing.address,
            code_hash: config.nft.existing.codeHash,
          },
        },
        unstaking_duration: config.unstakingDuration,
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

    return secretDaoVotingSnip721StakedQueries.votingPowerAtHeight({
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
    return secretDaoVotingSnip721StakedQueries.totalPowerAtHeight({
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        height,
      },
    })
  }

  getGovernanceTokenQuery = (): FetchQueryOptions<GenericToken> => {
    return {
      queryKey: [
        'snip721StakedVotingModule',
        'governanceToken',
        {
          chainId: this.chainId,
          address: this.address,
        },
      ],
      queryFn: async () => {
        const { nft_address: collectionAddress } =
          await this.queryClient.fetchQuery(
            secretDaoVotingSnip721StakedQueries.config({
              chainId: this.chainId,
              contractAddress: this.address,
            })
          )

        const contractInfo = await this.queryClient.fetchQuery(
          cw721BaseQueries.contractInfo({
            chainId: this.chainId,
            contractAddress: collectionAddress,
          })
        )

        return {
          chainId: this.chainId,
          type: TokenType.Cw721,
          denomOrAddress: collectionAddress,
          symbol: contractInfo.symbol,
          decimals: 0,
          source: {
            chainId: this.chainId,
            type: TokenType.Cw721,
            denomOrAddress: collectionAddress,
          },
        }
      },
    }
  }

  getHookCaller(): string {
    return this.address
  }

  async getHooks(): Promise<string[]> {
    return (
      await this.queryClient.fetchQuery(
        secretDaoVotingSnip721StakedQueries.hooks({
          chainId: this.chainId,
          contractAddress: this.getHookCaller(),
        })
      )
    ).hooks.map(({ addr }) => addr)
  }
}
