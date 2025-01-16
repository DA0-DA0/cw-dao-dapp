import uniq from 'lodash.uniq'
import {
  selectorFamily,
  waitForAll,
  waitForAllSettled,
  waitForAny,
} from 'recoil'

import {
  AccountType,
  ChainId,
  GenericTokenBalance,
  GenericTokenBalanceWithOwner,
  IndexerDumpState,
  PolytoneProxies,
  TokenType,
  WithChainId,
} from '@dao-dao/types'
import { ContractInfoResponse } from '@dao-dao/types/contracts/Cw721Base'
import {
  Addr,
  AdminNominationResponse,
  ArrayOfAddr,
  ArrayOfProposalModule,
  ArrayOfSubDao,
  Config,
  Cw20BalancesResponse,
  DaoURIResponse,
  DumpStateResponse,
  GetItemResponse,
  ListItemsResponse,
  PauseInfoResponse,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoDaoCore'
import {
  CW20_ITEM_KEY_PREFIX,
  CW721_ITEM_KEY_PREFIX,
  MAINNET,
  POLYTONE_CW20_ITEM_KEY_PREFIX,
  POLYTONE_CW721_ITEM_KEY_PREFIX,
  getAccount,
  getSupportedChainConfig,
  polytoneNoteProxyMapToChainIdMap,
} from '@dao-dao/utils'

import {
  CommonNftSelectors,
  DaoVotingCw20StakedSelectors,
  PolytoneNoteSelectors,
} from '.'
import {
  DaoDaoCoreClient,
  DaoDaoCoreQueryClient,
} from '../../../contracts/DaoDaoCore'
import { daoQueries } from '../../../query'
import {
  queryClientAtom,
  refreshDaoVotingPowerAtom,
  refreshWalletBalancesIdAtom,
  signingCosmWasmClientAtom,
} from '../../atoms'
import { accountsSelector } from '../account'
import { cosmWasmClientForChainSelector } from '../chain'
import { contractInfoSelector } from '../contract'
import { queryContractIndexerSelector } from '../indexer'
import { walletStargazeNftCardInfosSelector } from '../nft'
import { genericTokenSelector } from '../token'
import * as Cw20BaseSelectors from './Cw20Base'

type QueryClientParams = WithChainId<{
  contractAddress: string
}>

export const queryClient = selectorFamily<
  DaoDaoCoreQueryClient,
  QueryClientParams
>({
  key: 'daoDaoCoreQueryClient',
  get:
    ({ contractAddress, chainId }) =>
    ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      return new DaoDaoCoreQueryClient(client, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export type ExecuteClientParams = WithChainId<{
  contractAddress: string
  sender: string
}>

export const executeClient = selectorFamily<
  DaoDaoCoreClient | undefined,
  ExecuteClientParams
>({
  key: 'daoDaoCoreExecuteClient',
  get:
    ({ chainId, contractAddress, sender }) =>
    ({ get }) => {
      const client = get(signingCosmWasmClientAtom({ chainId }))
      if (!client) return

      return new DaoDaoCoreClient(client, sender, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export const adminSelector = selectorFamily<
  Addr,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['admin']>
  }
>({
  key: 'daoDaoCoreAdmin',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const admin = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/admin',
        })
      )
      // Null when indexer fails. Undefined if no admin.
      if (admin !== null) {
        return admin || null
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.admin(...params)
    },
})
export const adminNominationSelector = selectorFamily<
  AdminNominationResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['adminNomination']>
  }
>({
  key: 'daoDaoCoreAdminNomination',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const nomination = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/adminNomination',
        })
      )
      // Null when indexer fails. Undefined if no nomination.
      if (nomination !== null) {
        return { nomination: nomination || null }
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.adminNomination(...params)
    },
})
export const configSelector = selectorFamily<
  Config,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['config']>
  }
>({
  key: 'daoDaoCoreConfig',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const config = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/config',
        })
      )
      if (config) {
        return config
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.config(...params)
    },
})
// Use allCw20TokensWithBalancesSelector as it uses the indexer and implements
// pagination for chain queries.
export const _cw20BalancesSelector = selectorFamily<
  Cw20BalancesResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['cw20Balances']>
  }
>({
  key: 'daoDaoCore_Cw20Balances',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      get(refreshWalletBalancesIdAtom(undefined))
      get(refreshWalletBalancesIdAtom(queryClientParams.contractAddress))
      return await client.cw20Balances(...params)
    },
})
// Use allNativeCw20TokenListSelector as it uses the indexer and implements
// pagination for chain queries.
export const _cw20TokenListSelector = selectorFamily<
  ArrayOfAddr,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['cw20TokenList']>
  }
>({
  key: 'daoDaoCore_Cw20TokenList',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.cw20TokenList(...params)
    },
})
// Use allNativeCw721TokenListSelector as it uses the indexer and implements
// pagination for chain queries.
export const _cw721TokenListSelector = selectorFamily<
  ArrayOfAddr,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['cw721TokenList']>
  }
>({
  key: 'daoDaoCore_Cw721TokenList',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.cw721TokenList(...params)
    },
})
// Reduced to only the necessary subset which can be provided by both the
// indexer and chain.
export const dumpStateSelector = selectorFamily<
  DumpStateResponse | IndexerDumpState | undefined,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['dumpState']>
  }
>({
  key: 'daoDaoCoreDumpState',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const state = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/dumpState',
        })
      )
      if (state) {
        return state
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      try {
        return await client.dumpState(...params)
      } catch (err) {
        // Ignore errors. An undefined response is sometimes used to indicate
        // that this contract is not a DAO.
        console.error(err)
      }
    },
})
export const getItemSelector = selectorFamily<
  GetItemResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['getItem']>
  }
>({
  key: 'daoDaoCoreGetItem',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const item = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/item',
          args: params[0],
        })
      )
      // Null when indexer fails. Undefined if no item.
      if (item !== null) {
        return { item: item || null }
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.getItem(...params)
    },
})
// Use listAllItemsSelector as it uses the indexer and implements pagination for
// chain queries.
export const _listItemsSelector = selectorFamily<
  ListItemsResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['listItems']>
  }
>({
  key: 'daoDaoCore_ListItems',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.listItems(...params)
    },
})
export const proposalModulesSelector = selectorFamily<
  ArrayOfProposalModule,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['proposalModules']>
  }
>({
  key: 'daoDaoCoreProposalModules',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const proposalModules = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/proposalModules',
        })
      )
      if (proposalModules) {
        return proposalModules
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.proposalModules(...params)
    },
})
export const activeProposalModulesSelector = selectorFamily<
  ArrayOfProposalModule,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['activeProposalModules']>
  }
>({
  key: 'daoDaoCoreActiveProposalModules',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const activeProposalModules = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/activeProposalModules',
        })
      )
      if (activeProposalModules) {
        return activeProposalModules
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.activeProposalModules(...params)
    },
})
export const pauseInfoSelector = selectorFamily<
  PauseInfoResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['pauseInfo']>
  }
>({
  key: 'daoDaoCorePauseInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const paused = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/pauseInfo',
        })
      )
      if (paused) {
        return paused
      }

      // If indexer fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.pauseInfo(...params)
    },
})
export const votingModuleSelector = selectorFamily<
  Addr,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['votingModule']>
  }
>({
  key: 'daoDaoCoreVotingModule',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const votingModule = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/votingModule',
        })
      )
      if (votingModule) {
        return votingModule
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.votingModule(...params)
    },
})
export const listSubDaosSelector = selectorFamily<
  ArrayOfSubDao,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['listSubDaos']>
  }
>({
  key: 'daoDaoCoreListSubDaos',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.listSubDaos(...params)
    },
})
export const daoURISelector = selectorFamily<
  DaoURIResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['daoURI']>
  }
>({
  key: 'daoDaoCoreDaoURI',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const daoUri = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/daoUri',
        })
      )
      // Null when indexer fails. Undefined if no URI.
      if (daoUri !== null) {
        return daoUri || null
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.daoURI(...params)
    },
})
export const votingPowerAtHeightSelector = selectorFamily<
  VotingPowerAtHeightResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['votingPowerAtHeight']>
  }
>({
  key: 'daoDaoCoreVotingPowerAtHeight',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const id = get(
        refreshDaoVotingPowerAtom(queryClientParams.contractAddress)
      )

      const votingPowerAtHeight = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/votingPowerAtHeight',
          args: {
            address: params[0].address,
          },
          block: params[0].height ? { height: params[0].height } : undefined,
          id,
        })
      )
      if (votingPowerAtHeight) {
        return votingPowerAtHeight
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.votingPowerAtHeight(...params)
    },
})
export const totalPowerAtHeightSelector = selectorFamily<
  TotalPowerAtHeightResponse,
  QueryClientParams & {
    params: Parameters<DaoDaoCoreQueryClient['totalPowerAtHeight']>
  }
>({
  key: 'daoDaoCoreTotalPowerAtHeight',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const id = get(
        refreshDaoVotingPowerAtom(queryClientParams.contractAddress)
      )

      const totalPowerAtHeight = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/totalPowerAtHeight',
          block: params[0].height ? { height: params[0].height } : undefined,
          id,
        })
      )
      if (totalPowerAtHeight) {
        return totalPowerAtHeight
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.totalPowerAtHeight(...params)
    },
})

export const infoSelector = contractInfoSelector

///! Custom selectors

const CW20_TOKEN_LIST_LIMIT = 30
export const allNativeCw20TokenListSelector = selectorFamily<
  ArrayOfAddr,
  QueryClientParams
>({
  key: 'daoDaoCoreAllNativeCw20TokenList',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      // Load CW20s from storage items.
      const storageItemContracts = get(
        listAllItemsWithPrefixSelector({
          ...queryClientParams,
          prefix: CW20_ITEM_KEY_PREFIX,
        })
      ).map(([key]) => key)

      const list = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/cw20List',
        })
      )
      if (list && Array.isArray(list)) {
        return uniq([...storageItemContracts, ...list])
      }

      // If indexer query fails, fallback to contract query.

      const tokenList: ArrayOfAddr = [...storageItemContracts]
      while (true) {
        const response = await get(
          _cw20TokenListSelector({
            ...queryClientParams,
            params: [
              {
                startAfter: tokenList[tokenList.length - 1],
                limit: CW20_TOKEN_LIST_LIMIT,
              },
            ],
          })
        )
        if (!response.length) break

        tokenList.push(...response)

        // If we have less than the limit of items, we've exhausted them.
        if (response.length < CW20_TOKEN_LIST_LIMIT) {
          break
        }
      }

      return uniq(tokenList)
    },
})

// Get all cw20 tokens stored in the items list for polytone proxies across all
// chains.
export const allPolytoneCw20TokensSelector = selectorFamily<
  Record<
    string,
    {
      proxy: string
      tokens: string[]
    }
  >,
  QueryClientParams
>({
  key: 'daoDaoCoreAllPolytoneCw20Tokens',
  get:
    (queryClientParams) =>
    ({ get }) => {
      const polytoneProxies = get(polytoneProxiesSelector(queryClientParams))
      const polytoneCw20Keys = get(
        listAllItemsWithPrefixSelector({
          ...queryClientParams,
          prefix: POLYTONE_CW20_ITEM_KEY_PREFIX,
        })
      )

      const tokensByChain = polytoneCw20Keys.reduce(
        (acc, [key]) => {
          const [chainId, token] = key.split(':')
          // If no polytone proxy for this chain, skip it. This should only
          // happen if a key is manually set for a chain that does not have a
          // polytone proxy.
          if (!(chainId in polytoneProxies)) {
            return acc
          }

          if (!acc[chainId]) {
            acc[chainId] = {
              proxy: polytoneProxies[chainId],
              tokens: [],
            }
          }
          acc[chainId].tokens.push(token)

          return acc
        },
        {} as Record<
          string,
          {
            proxy: string
            tokens: string[]
          }
        >
      )

      return tokensByChain
    },
})

// Combine native and polytone cw20 tokens.
export const allCw20TokensSelector = selectorFamily<
  Record<
    string,
    {
      owner: string
      tokens: string[]
    }
  >,
  QueryClientParams & {
    governanceCollectionAddress?: string
  }
>({
  key: 'daoDaoCoreAllCw20Tokens',
  get:
    (queryClientParams) =>
    ({ get }) => {
      const nativeCw20Tokens = get(
        allNativeCw20TokenListSelector(queryClientParams)
      )
      const polytoneCw20Tokens = get(
        allPolytoneCw20TokensSelector(queryClientParams)
      )

      // Start with native cw20 tokens.
      let allTokens: Record<
        string,
        {
          owner: string
          tokens: string[]
        }
      > = {
        [queryClientParams.chainId]: {
          owner: queryClientParams.contractAddress,
          tokens: nativeCw20Tokens,
        },
      }

      // Add polytone tokens.
      Object.entries(polytoneCw20Tokens).forEach(
        ([chainId, { proxy, tokens }]) => {
          allTokens[chainId] = {
            owner: proxy,
            tokens,
          }
        }
      )

      return allTokens
    },
})

const CW20_BALANCES_LIMIT = 10
export const nativeCw20TokensWithBalancesSelector = selectorFamily<
  GenericTokenBalance[],
  QueryClientParams & {
    governanceTokenAddress?: string
  }
>({
  key: 'daoDaoCoreNativeCw20TokensWithBalances',
  get:
    ({ governanceTokenAddress, ...queryClientParams }) =>
    async ({ get }) => {
      const generalId = get(refreshWalletBalancesIdAtom(undefined))
      const specificId = get(
        refreshWalletBalancesIdAtom(queryClientParams.contractAddress)
      )

      const governanceTokenBalance = governanceTokenAddress
        ? get(
            Cw20BaseSelectors.balanceSelector({
              ...queryClientParams,
              contractAddress: governanceTokenAddress,
              params: [{ address: queryClientParams.contractAddress }],
            })
          ).balance
        : undefined

      let balances: Cw20BalancesResponse | null = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/cw20Balances',
          // Update each time one of these changes.
          id: generalId + specificId,
        })
      )
      if (balances) {
        // Copy to new array so we can mutate it below.
        balances = [...balances]
        // If indexer query fails, fallback to contract query.
      } else {
        balances = []
        while (true) {
          const response = await get(
            _cw20BalancesSelector({
              ...queryClientParams,
              params: [
                {
                  startAfter: balances[balances.length - 1]?.addr,
                  limit: CW20_BALANCES_LIMIT,
                },
              ],
            })
          )
          if (!response.length) break

          balances.push(...response)

          // If we have less than the limit of items, we've exhausted them.
          if (response.length < CW20_BALANCES_LIMIT) {
            break
          }
        }
      }

      //! Add governance token balance if exists but missing from list.
      if (
        governanceTokenAddress &&
        governanceTokenBalance &&
        !balances.some(({ addr }) => addr === governanceTokenAddress)
      ) {
        // Add to beginning of list.
        balances.splice(0, 0, {
          addr: governanceTokenAddress,
          balance: governanceTokenBalance,
        })
      }

      const tokens = get(
        waitForAll(
          balances.map(({ addr }) =>
            genericTokenSelector({
              type: TokenType.Cw20,
              denomOrAddress: addr,
              chainId: queryClientParams.chainId,
            })
          )
        )
      )

      return tokens.map((token, index) => ({
        token,
        balance: balances![index].balance,
        isGovernanceToken:
          !!governanceTokenAddress &&
          governanceTokenAddress === token.denomOrAddress,
      }))
    },
})

// Get cw20 tokens stored in the items list for a specific polytone proxy chain.
export const polytoneCw20TokensWithBalancesSelector = selectorFamily<
  GenericTokenBalanceWithOwner[],
  QueryClientParams & {
    polytoneChainId: string
  }
>({
  key: 'daoDaoCorePolytoneCw20TokensWithBalances',
  get:
    ({ chainId: mainChainId, contractAddress, polytoneChainId }) =>
    ({ get }) => {
      const accounts = get(
        accountsSelector({
          chainId: mainChainId,
          address: contractAddress,
        })
      )

      const polytoneAccount = getAccount({
        accounts,
        chainId: polytoneChainId,
        types: [AccountType.Polytone],
      })
      if (!polytoneAccount) {
        return []
      }

      const polytoneCw20Tokens =
        get(
          allPolytoneCw20TokensSelector({
            chainId: mainChainId,
            contractAddress,
          })
        )[polytoneChainId]?.tokens || []

      const [tokens, balances] = get(
        waitForAll([
          waitForAll(
            polytoneCw20Tokens.map((denomOrAddress) =>
              genericTokenSelector({
                type: TokenType.Cw20,
                chainId: polytoneChainId,
                denomOrAddress,
              })
            )
          ),
          waitForAllSettled(
            polytoneCw20Tokens.map((tokenContract) =>
              Cw20BaseSelectors.balanceSelector({
                chainId: polytoneChainId,
                contractAddress: tokenContract,
                params: [{ address: polytoneAccount.address }],
              })
            )
          ),
        ])
      )

      return balances.flatMap(
        (loadable, index): GenericTokenBalanceWithOwner | [] =>
          loadable.state === 'hasValue'
            ? {
                owner: polytoneAccount,
                token: tokens[index],
                balance: loadable.contents.balance,
              }
            : []
      )
    },
})

const CW721_TOKEN_LIST_LIMIT = 30
export const allNativeCw721TokenListSelector = selectorFamily<
  ArrayOfAddr,
  QueryClientParams & {
    governanceCollectionAddress?: string
  }
>({
  key: 'daoDaoCoreAllNativeCw721TokenList',
  get:
    ({ governanceCollectionAddress, ...queryClientParams }) =>
    async ({ get }) => {
      // Load CW721s from storage items.
      const storageItemContracts = get(
        listAllItemsWithPrefixSelector({
          ...queryClientParams,
          prefix: CW721_ITEM_KEY_PREFIX,
        })
      ).map(([key]) => key)

      let list = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/cw721List',
        })
      )
      if (list && Array.isArray(list)) {
        // Copy to new array so we can mutate it below.
        list = [...storageItemContracts, ...list]
        // Add governance collection to beginning of list if not present.
        if (
          governanceCollectionAddress &&
          !list.includes(governanceCollectionAddress)
        ) {
          list.splice(0, 0, governanceCollectionAddress)
        }

        return list
      }

      // If indexer query fails, fallback to contract query.

      const tokenList: ArrayOfAddr = [...storageItemContracts]
      while (true) {
        const response = await get(
          _cw721TokenListSelector({
            ...queryClientParams,
            params: [
              {
                startAfter: tokenList[tokenList.length - 1],
                limit: CW721_TOKEN_LIST_LIMIT,
              },
            ],
          })
        )
        if (!response?.length) break

        tokenList.push(...response)

        // If we have less than the limit of items, we've exhausted them.
        if (response.length < CW721_TOKEN_LIST_LIMIT) {
          break
        }
      }

      // Add governance collection to beginning of list if not present.
      if (
        governanceCollectionAddress &&
        !tokenList.includes(governanceCollectionAddress)
      ) {
        tokenList.splice(0, 0, governanceCollectionAddress)
      }

      return uniq(tokenList)
    },
})

// Get all cw721 collections stored in the items list across all chains. This
// used to be specific to polytone but is now generic. Map chain ID to list of
// collection addresses.
export const allCrossChainCw721CollectionsSelector = selectorFamily<
  Record<string, string[]>,
  QueryClientParams
>({
  key: 'daoDaoCoreAllCrossChainCw721Collections',
  get:
    (queryClientParams) =>
    ({ get }) => {
      const polytoneCw721Keys = get(
        listAllItemsWithPrefixSelector({
          ...queryClientParams,
          prefix: POLYTONE_CW721_ITEM_KEY_PREFIX,
        })
      )

      const collectionsByChain = polytoneCw721Keys.reduce(
        (acc, [key]) => {
          const [chainId, collectionAddress] = key.split(':')

          if (!acc[chainId]) {
            acc[chainId] = []
          }
          acc[chainId].push(collectionAddress)

          return acc
        },
        {} as Record<string, string[]>
      )

      return collectionsByChain
    },
})

// Combine native and cross-chain NFT collections.
export const allCw721CollectionsSelector = selectorFamily<
  Record<
    string,
    {
      owners: string[]
      collectionAddresses: string[]
    }
  >,
  QueryClientParams & {
    governanceCollectionAddress?: string
  }
>({
  key: 'daoDaoCoreAllCw721Collections',
  get:
    (queryClientParams) =>
    ({ get }) => {
      const accounts = get(
        accountsSelector({
          chainId: queryClientParams.chainId,
          address: queryClientParams.contractAddress,
        })
      )

      // Get NFTs on DAO's chain.
      const nativeCw721TokenList = get(
        allNativeCw721TokenListSelector(queryClientParams)
      )

      // Get NFTs for DAO's cross-chain accounts.
      const crossChainCw721Collections = get(
        allCrossChainCw721CollectionsSelector(queryClientParams)
      )

      // Get NFTs from Stargaze's API.
      const stargazeChainId = MAINNET
        ? ChainId.StargazeMainnet
        : ChainId.StargazeTestnet
      const stargazeAccounts = accounts.filter(
        (a) => a.chainId === stargazeChainId
      )
      const allStargazeNfts = stargazeAccounts.length
        ? get(
            waitForAll(
              stargazeAccounts.map(({ address }) =>
                walletStargazeNftCardInfosSelector(address)
              )
            )
          ).flat()
        : []

      // Start with native NFTs.
      let allNfts: Record<
        string,
        {
          owners: string[]
          collectionAddresses: string[]
        }
      > = {
        [queryClientParams.chainId]: {
          owners: accounts
            .filter((a) => a.type === AccountType.Base)
            .map((a) => a.address),
          collectionAddresses: nativeCw721TokenList,
        },
      }

      // Add cross-chain NFTs.
      Object.entries(crossChainCw721Collections).forEach(
        ([chainId, collectionAddresses]) => {
          allNfts[chainId] = {
            owners: accounts
              .filter((a) => a.chainId === chainId)
              .map((a) => a.address),
            collectionAddresses,
          }
        }
      )

      // Add Stargaze NFTs.
      if (allStargazeNfts.length) {
        allNfts[stargazeChainId] = {
          owners: uniq([
            ...(allNfts[stargazeChainId]?.owners || []),
            ...stargazeAccounts.map((a) => a.address),
          ]),
          collectionAddresses: uniq([
            ...(allNfts[stargazeChainId]?.collectionAddresses || []),
            ...allStargazeNfts.map((n) => n.collectionAddress),
          ]),
        }
      }

      return allNfts
    },
})

// Get all CW721 collections, filtered by the DAO being the minter.
export const allCw721CollectionsWithDaoAsMinterSelector = selectorFamily<
  ({
    address: string
    // DAO's address or polytone proxy that is the minter.
    minter: string
    chainId: string
  } & ContractInfoResponse)[],
  QueryClientParams
>({
  key: 'daoDaoCoreAllCw721CollectionsWithDaoAsMinter',
  get:
    (queryClientParams) =>
    ({ get }) => {
      // Flatten dictionary of chainId -> { owner, collectionAddresses } into
      // list of each collection.
      const collections = Object.entries(
        get(allCw721CollectionsSelector(queryClientParams))
      ).flatMap(([chainId, { owners, collectionAddresses }]) =>
        collectionAddresses.flatMap((collectionAddress) =>
          owners.map((owner) => ({
            owner,
            collectionAddress,
            chainId,
          }))
        )
      )

      // Get the minter for each collection.
      const minterResponses = get(
        waitForAny(
          collections.map(({ chainId, collectionAddress }) =>
            CommonNftSelectors.minterSelector({
              contractAddress: collectionAddress,
              chainId,
              params: [],
            })
          )
        )
      )
      // Filter out collections that don't have the DAO as the minter.
      const collectionsWithDaoAsMinter = collections.filter(
        ({ owner }, idx) =>
          minterResponses[idx].state === 'hasValue' &&
          minterResponses[idx].contents.minter === owner
      )

      const collectionInfos = get(
        waitForAny(
          collectionsWithDaoAsMinter.map(({ chainId, collectionAddress }) =>
            CommonNftSelectors.contractInfoSelector({
              contractAddress: collectionAddress,
              chainId,
              params: [],
            })
          )
        )
      )

      return collectionsWithDaoAsMinter.flatMap(
        ({ chainId, owner, collectionAddress }, idx) =>
          collectionInfos[idx].state === 'hasValue'
            ? [
                {
                  chainId,
                  minter: owner,
                  address: collectionAddress,
                  ...collectionInfos[idx].contents!,
                },
              ]
            : []
      )
    },
})

/**
 * Get the configs for all this DAO's recognized SubDAOs. These will only be
 * SubDAOs on the same chain.
 */
export const allSubDaoConfigsSelector = selectorFamily<
  (WithChainId<{ address: string }> & Config)[],
  QueryClientParams
>({
  key: 'daoDaoCoreAllSubDaoConfigs',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      const queryClient = get(queryClientAtom)
      const subDaos = await queryClient.fetchQuery(
        daoQueries.listAllSubDaos(queryClient, {
          chainId: queryClientParams.chainId,
          address: queryClientParams.contractAddress,
        })
      )

      const subDaoConfigs = get(
        waitForAll(
          subDaos.map(({ chainId, addr }) =>
            configSelector({
              chainId,
              contractAddress: addr,
              params: [],
            })
          )
        )
      )

      return subDaos.map(({ chainId, addr }, index) => ({
        chainId,
        address: addr,
        ...subDaoConfigs[index],
      }))
    },
})

// Will fail if cannot fetch governance token address.
export const tryFetchGovernanceTokenAddressSelector = selectorFamily<
  string,
  QueryClientParams
>({
  key: 'daoDaoCoreTryFetchGovernanceTokenAddress',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      const votingModuleAddress = get(
        votingModuleSelector({ ...queryClientParams, params: [] })
      )
      const governanceTokenAddress = get(
        DaoVotingCw20StakedSelectors.tokenContractSelector({
          ...queryClientParams,
          contractAddress: votingModuleAddress,
          params: [],
        })
      )
      return governanceTokenAddress
    },
})

const ITEM_LIST_LIMIT = 30
export const listAllItemsSelector = selectorFamily<
  ListItemsResponse,
  QueryClientParams
>({
  key: 'daoDaoCoreListAllItems',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      const list = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/listItems',
        })
      )
      if (list) {
        return list
      }

      // If indexer query fails, fallback to contract query.

      const items: ListItemsResponse = []

      while (true) {
        const response = await get(
          _listItemsSelector({
            ...queryClientParams,
            params: [
              {
                startAfter: items[items.length - 1]?.[0],
                limit: ITEM_LIST_LIMIT,
              },
            ],
          })
        )
        if (!response?.length) break

        items.push(...response)

        // If we have less than the limit of items, we've exhausted them.
        if (response.length < ITEM_LIST_LIMIT) {
          break
        }
      }

      return items
    },
})

/**
 * List all items with a certain prefix, removing the prefix from the key.
 */
export const listAllItemsWithPrefixSelector = selectorFamily<
  ListItemsResponse,
  QueryClientParams & { prefix: string }
>({
  key: 'daoDaoCoreListAllItemsWithPrefix',
  get:
    ({ prefix, ...queryClientParams }) =>
    async ({ get }) => {
      const items = get(listAllItemsSelector(queryClientParams))
      return items.flatMap(([key, value]) =>
        key.startsWith(prefix) ? [[key.substring(prefix.length), value]] : []
      )
    },
})

export const polytoneProxiesSelector = selectorFamily<
  PolytoneProxies,
  QueryClientParams
>({
  key: 'daoDaoCorePolytoneProxies',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      // Mapping from polytone note contract to remote proxy address.
      const noteToRemoteProxy: Record<string, string> = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoCore/polytoneProxies',
        })
      )
      if (noteToRemoteProxy) {
        return polytoneNoteProxyMapToChainIdMap(
          queryClientParams.chainId,
          noteToRemoteProxy
        )
      }

      // Fallback to contract query if indexer fails.

      // Get polytone notes on this chain.
      const polytoneConnections =
        getSupportedChainConfig(queryClientParams.chainId)?.polytone || {}

      return Object.entries(polytoneConnections)
        .map(([chainId, { note }]) => ({
          chainId,
          proxy: get(
            PolytoneNoteSelectors.remoteAddressSelector({
              contractAddress: note,
              chainId: queryClientParams.chainId,
              params: [
                {
                  localAddress: queryClientParams.contractAddress,
                },
              ],
            })
          ),
        }))
        .reduce(
          (acc, { chainId, proxy }) => ({
            ...acc,
            ...(proxy
              ? {
                  [chainId]: proxy,
                }
              : {}),
          }),
          {} as PolytoneProxies
        )
    },
})
