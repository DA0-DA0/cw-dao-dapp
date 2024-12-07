import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import {
  GenericToken,
  SecretModuleInstantiateInfo,
  TokenType,
} from '@dao-dao/types'
import {
  ActiveThreshold,
  Duration,
  InitialBalance,
  InstantiateMsg,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/SecretDaoVotingSnip20Staked'
import {
  DAO_VOTING_CW20_STAKED_CONTRACT_NAMES,
  encodeJsonToBase64,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import {
  secretDaoVotingSnip20StakedQueries,
  snip20StakeQueries,
  tokenQueries,
} from '../../query'
import { SecretCwDao } from '../dao'
import { VotingModuleBase } from './base'

export class SecretSnip20StakedVotingModule extends VotingModuleBase<SecretCwDao> {
  static contractNames: readonly string[] =
    DAO_VOTING_CW20_STAKED_CONTRACT_NAMES

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(
    chainId: string,
    config: {
      activeThreshold?: ActiveThreshold | null
      token:
        | {
            /**
             * Use an existing cw20 token.
             */
            existing: {
              address: string
              codeHash: string
              stakingContract:
                | {
                    /**
                     * Use an existing cw20 staking contract.
                     */
                    existing: {
                      address: string
                      codeHash: string
                    }
                  }
                | {
                    /**
                     * Create a new cw20 staking contract.
                     */
                    new: {
                      unstakingDuration?: Duration | null
                    }
                  }
            }
          }
        | {
            /**
             * Create a new cw20 token.
             */
            new: {
              symbol: string
              decimals: number
              name: string
              initialBalances: InitialBalance[]
              initialDaoBalance?: string
              unstakingDuration?: Duration | null
            }
          }
    }
  ): SecretModuleInstantiateInfo {
    const { codeIds, codeHashes } = mustGetSupportedChainConfig(chainId)
    if (
      !codeHashes ||
      !codeIds.DaoVotingCw20Staked ||
      !codeHashes.DaoVotingCw20Staked ||
      ((('existing' in config.token &&
        'new' in config.token.existing.stakingContract) ||
        'new' in config.token) &&
        (!codeIds.Cw20Stake || !codeHashes.Cw20Stake)) ||
      ('new' in config.token && (!codeIds.Cw20Base || !codeHashes.Cw20Base))
    ) {
      throw new Error('Codes not configured for chain ' + chainId)
    }

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoVotingCw20Staked,
      code_hash: codeHashes.DaoVotingCw20Staked,
      label: `dao-voting-snip20-staked_${Date.now()}`,
      msg: encodeJsonToBase64({
        active_threshold: config.activeThreshold,
        dao_code_hash: codeHashes.DaoDaoCore,
        token_info:
          'existing' in config.token
            ? {
                existing: {
                  address: config.token.existing.address,
                  code_hash: config.token.existing.codeHash,
                  staking_contract:
                    'existing' in config.token.existing.stakingContract
                      ? {
                          existing: {
                            staking_contract_address:
                              config.token.existing.stakingContract.existing
                                .address,
                            staking_contract_code_hash:
                              config.token.existing.stakingContract.existing
                                .codeHash,
                          },
                        }
                      : {
                          new: {
                            label: `snip20-stake_${Date.now()}`,
                            // Type-checked above.
                            staking_code_hash: codeHashes.Cw20Stake!,
                            // Type-checked above.
                            staking_code_id: codeIds.Cw20Stake!,
                            unstaking_duration:
                              config.token.existing.stakingContract.new
                                .unstakingDuration,
                          },
                        },
                },
              }
            : {
                new: {
                  // Type-checked above.
                  code_hash: codeHashes.Cw20Base!,
                  // Type-checked above.
                  code_id: codeIds.Cw20Base!,
                  decimals: config.token.new.decimals,
                  initial_balances: config.token.new.initialBalances,
                  initial_dao_balance: config.token.new.initialDaoBalance,
                  label: `snip20_${config.token.new.symbol}_${Date.now()}`,
                  name: config.token.new.name,
                  // Type-checked above.
                  staking_code_hash: codeHashes.Cw20Stake!,
                  // Type-checked above.
                  staking_code_id: codeIds.Cw20Stake!,
                  symbol: config.token.new.symbol,
                  unstaking_duration: config.token.new.unstakingDuration,
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

    return secretDaoVotingSnip20StakedQueries.votingPowerAtHeight({
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
    return secretDaoVotingSnip20StakedQueries.totalPowerAtHeight({
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
        'snip20StakedVotingModule',
        'governanceToken',
        {
          chainId: this.chainId,
          address: this.address,
        },
      ],
      queryFn: async () => {
        const { addr: governanceTokenAddress } =
          await this.queryClient.fetchQuery(
            secretDaoVotingSnip20StakedQueries.tokenContract({
              chainId: this.chainId,
              contractAddress: this.address,
            })
          )

        const token = await this.queryClient.fetchQuery(
          tokenQueries.info(this.queryClient, {
            chainId: this.chainId,
            type: TokenType.Cw20,
            denomOrAddress: governanceTokenAddress,
          })
        )

        return token
      },
    }
  }

  async getHookCaller(): Promise<string> {
    return (
      await this.queryClient.fetchQuery(
        secretDaoVotingSnip20StakedQueries.stakingContract({
          chainId: this.chainId,
          contractAddress: this.address,
        })
      )
    ).addr
  }

  async getHooks(): Promise<string[]> {
    return (
      await this.queryClient.fetchQuery(
        snip20StakeQueries.getHooks({
          chainId: this.chainId,
          contractAddress: await this.getHookCaller(),
        })
      )
    ).hooks
  }
}
