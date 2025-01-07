import { FetchQueryOptions, skipToken } from '@tanstack/react-query'

import {
  cw721BaseQueries,
  daoVotingCw721StakedQueries,
} from '@dao-dao/state/query'
import {
  Coin,
  GenericToken,
  ModuleInstantiateInfo,
  TokenType,
  WasmMsg,
} from '@dao-dao/types'
import {
  ExecuteMsg as Cw721BaseExecuteMsg,
  InstantiateMsg as Cw721BaseInstantiateMsg,
} from '@dao-dao/types/contracts/Cw721Base'
import {
  ActiveThreshold,
  Duration,
  InstantiateMsg,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoVotingCw721Staked'
import {
  DAO_VOTING_CW721_STAKED_CONTRACT_NAMES,
  encodeJsonToBase64,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { CwDao } from '../dao/CwDao'
import { VotingModuleBase } from './base'

export class Cw721StakedVotingModule extends VotingModuleBase<CwDao> {
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
      nft:
        | {
            /**
             * Use an existing cw721 collection.
             */
            existing: {
              address: string
            }
          }
        | {
            /**
             * Create a new cw721 collection.
             */
            new: {
              name: string
              symbol: string
              initialNfts: {
                recipient: string
                tokenId: string
                tokenUri?: string
              }[]
            }
          }
        | {
            /**
             * Use a trusted cw721 collection factory contract.
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
    if ('new' in config.nft && !codeIds.Cw721Base) {
      throw new Error('Codes not configured for chain ' + chainId)
    }

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoVotingCw721Staked,
      label: `dao-voting-cw721-staked_${Date.now()}`,
      msg: encodeJsonToBase64({
        active_threshold: config.activeThreshold,
        nft_contract:
          'existing' in config.nft
            ? {
                existing: {
                  address: config.nft.existing.address,
                },
              }
            : 'new' in config.nft
              ? {
                  new: {
                    // Type-checked above.
                    code_id: codeIds.Cw721Base!,
                    initial_nfts: config.nft.new.initialNfts.map(
                      ({ recipient, tokenId, tokenUri }) =>
                        encodeJsonToBase64({
                          mint: {
                            owner: recipient,
                            token_id: tokenId,
                            token_uri: tokenUri,
                          },
                        } as Cw721BaseExecuteMsg)
                    ),
                    label: config.nft.new.name,
                    msg: encodeJsonToBase64({
                      // Will be set to the DAO automatically.
                      minter: '',
                      name: config.nft.new.name,
                      symbol: config.nft.new.symbol,
                    } as Cw721BaseInstantiateMsg),
                  },
                }
              : {
                  factory: encodeJsonToBase64({
                    wasm: {
                      execute: {
                        contract_addr: config.nft.factory.address,
                        funds: config.nft.factory.funds || [],
                        msg: encodeJsonToBase64(config.nft.factory.message),
                      },
                    } as WasmMsg,
                  }),
                },
        unstaking_duration: config.unstakingDuration,
      } as InstantiateMsg),
      funds: ('factory' in config.nft && config.nft.factory.funds) || [],
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

    return daoVotingCw721StakedQueries.votingPowerAtHeight(this.queryClient, {
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
    return daoVotingCw721StakedQueries.totalPowerAtHeight(this.queryClient, {
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
        'cw721StakedVotingModule',
        'governanceToken',
        {
          chainId: this.chainId,
          address: this.address,
        },
      ],
      queryFn: async () => {
        const { nft_address: collectionAddress } =
          await this.queryClient.fetchQuery(
            daoVotingCw721StakedQueries.config(this.queryClient, {
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
        daoVotingCw721StakedQueries.hooks(this.queryClient, {
          chainId: this.chainId,
          contractAddress: this.getHookCaller(),
        })
      )
    ).hooks
  }
}
