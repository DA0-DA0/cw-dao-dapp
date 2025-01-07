import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import { daoVotingTokenStakedQueries, tokenQueries } from '@dao-dao/state/query'
import {
  Coin,
  GenericToken,
  ModuleInstantiateInfo,
  TokenType,
  WasmMsg,
} from '@dao-dao/types'
import {
  ActiveThreshold,
  Duration,
  InitialBalance,
  InstantiateMsg,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoVotingTokenStaked'
import {
  DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES,
  encodeJsonToBase64,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { CwDao } from '../dao/CwDao'
import { VotingModuleBase } from './base'

export class TokenStakedVotingModule extends VotingModuleBase<CwDao> {
  static contractNames: readonly string[] =
    DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(
    chainId: string,
    config: {
      activeThreshold?: ActiveThreshold | null
      unstakingDuration?: Duration | null
      token:
        | {
            /**
             * Use an existing native token, including IBC and token factory
             * tokens.
             */
            existing: {
              denom: string
            }
          }
        | {
            /**
             * Create a new native token, if token factory is supported.
             */
            new: {
              symbol: string
              decimals: number
              name: string
              initialBalances: InitialBalance[]
              initialDaoBalance?: string
              /**
               * Some chains have a token factory creation fee.
               */
              funds?: Coin[]
            }
          }
        | {
            /**
             * Use a trusted token factory contract.
             */
            factory: {
              address: string
              message: Record<string, unknown>
              funds?: Coin[]
            }
          }
    }
  ): ModuleInstantiateInfo {
    const { codeIds } = mustGetSupportedChainConfig(chainId)

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoVotingTokenStaked,
      label: `dao-voting-token-staked_${Date.now()}`,
      msg: encodeJsonToBase64({
        active_threshold: config.activeThreshold,
        token_info:
          'existing' in config.token
            ? {
                existing: {
                  denom: config.token.existing.denom,
                },
              }
            : 'new' in config.token
              ? {
                  new: {
                    initial_balances: config.token.new.initialBalances,
                    initial_dao_balance: config.token.new.initialDaoBalance,
                    metadata: {
                      additional_denom_units: [
                        {
                          aliases: [],
                          denom: config.token.new.symbol,
                          exponent: config.token.new.decimals.toString(),
                        },
                      ],
                      description: 'Governance Token',
                      display: config.token.new.symbol,
                      name: config.token.new.name,
                      symbol: config.token.new.symbol,
                    },
                    subdenom: config.token.new.symbol.toLowerCase(),
                    token_issuer_code_id: codeIds.CwTokenfactoryIssuer,
                  },
                }
              : {
                  factory: encodeJsonToBase64({
                    execute: {
                      contract_addr: config.token.factory.address,
                      funds: config.token.factory.funds || [],
                      msg: encodeJsonToBase64(config.token.factory.message),
                    },
                  } as WasmMsg),
                },
        unstaking_duration: config.unstakingDuration,
      } as InstantiateMsg),
      funds:
        ('new' in config.token && config.token.new.funds) ||
        ('factory' in config.token && config.token.factory.funds) ||
        [],
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

    return daoVotingTokenStakedQueries.votingPowerAtHeight(this.queryClient, {
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
    return daoVotingTokenStakedQueries.totalPowerAtHeight(this.queryClient, {
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
        'tokenStakedVotingModule',
        'governanceToken',
        {
          chainId: this.chainId,
          address: this.address,
        },
      ],
      queryFn: async () => {
        const { denom } = await this.queryClient.fetchQuery(
          daoVotingTokenStakedQueries.denom(this.queryClient, {
            chainId: this.chainId,
            contractAddress: this.address,
          })
        )

        const token = await this.queryClient.fetchQuery(
          tokenQueries.info(this.queryClient, {
            chainId: this.chainId,
            type: TokenType.Native,
            denomOrAddress: denom,
          })
        )

        return token
      },
    }
  }

  getHookCaller(): string {
    return this.address
  }

  async getHooks(): Promise<string[]> {
    return (
      await this.queryClient.fetchQuery(
        daoVotingTokenStakedQueries.getHooks(this.queryClient, {
          chainId: this.chainId,
          contractAddress: this.getHookCaller(),
        })
      )
    ).hooks
  }
}
