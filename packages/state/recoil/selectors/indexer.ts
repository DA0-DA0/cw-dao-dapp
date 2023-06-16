import Pusher from 'pusher-js'
import { atom, selector, selectorFamily } from 'recoil'

import { Expiration, IndexerFormulaType, WithChainId } from '@dao-dao/types'
import {
  CHAIN_ID,
  FEATURED_DAOS_INDEX,
  WEB_SOCKET_PUSHER_APP_KEY,
  WEB_SOCKET_PUSHER_HOST,
  WEB_SOCKET_PUSHER_PORT,
} from '@dao-dao/utils'

import {
  DaoSearchResult,
  QueryIndexerOptions,
  loadMeilisearchClient,
  queryIndexer,
  searchDaos,
} from '../../indexer'
import {
  refreshOpenProposalsAtom,
  refreshWalletProposalStatsAtom,
} from '../atoms'

export type QueryIndexerParams = QueryIndexerOptions & {
  // Refresh by changing this value.
  id?: number
}

export const queryIndexerSelector = selectorFamily<any, QueryIndexerParams>({
  key: 'queryIndexer',
  get: (options) => async () => {
    try {
      return await queryIndexer(options)
    } catch (err) {
      // If the indexer fails, return null.
      console.error(err)
      return null
    }
  },
})

export const queryContractIndexerSelector = selectorFamily<
  any,
  Omit<QueryIndexerParams, 'type' | 'address'> & {
    contractAddress: string
  }
>({
  key: 'queryContractIndexer',
  get:
    ({ contractAddress: address, ...params }) =>
    ({ get }) =>
      get(
        queryIndexerSelector({
          type: IndexerFormulaType.Contract,
          address,
          ...params,
        })
      ),
})

export const queryGenericIndexerSelector = selectorFamily<
  any,
  Omit<QueryIndexerParams, 'type' | 'address'>
>({
  key: 'queryGenericIndexer',
  get:
    (params) =>
    ({ get }) =>
      get(
        queryIndexerSelector({
          type: IndexerFormulaType.Generic,
          ...params,
        })
      ),
})

export const queryValidatorIndexerSelector = selectorFamily<
  any,
  Omit<QueryIndexerParams, 'type' | 'address'> & {
    validatorOperatorAddress: string
  }
>({
  key: 'queryValidatorIndexer',
  get:
    ({ validatorOperatorAddress: address, ...params }) =>
    ({ get }) =>
      get(
        queryIndexerSelector({
          type: IndexerFormulaType.Validator,
          address,
          ...params,
        })
      ),
})
export const queryWalletIndexerSelector = selectorFamily<
  any,
  Omit<QueryIndexerParams, 'type' | 'address'> & {
    walletAddress: string
  }
>({
  key: 'queryWalletIndexer',
  get:
    ({ walletAddress: address, ...params }) =>
    ({ get }) =>
      get(
        queryIndexerSelector({
          type: IndexerFormulaType.Wallet,
          address,
          ...params,
        })
      ),
})

export const searchDaosSelector = selectorFamily<
  DaoSearchResult[],
  {
    query: string
    limit?: number
    exclude?: string[]
  }
>({
  key: 'searchDaos',
  get:
    ({ query, limit, exclude }) =>
    async () =>
      await searchDaos(query, limit, exclude),
})

export const openProposalsSelector = selectorFamily<
  {
    proposalModuleAddress: string
    proposals: {
      id: number
      proposal: { expiration: Expiration }
      voted?: boolean
    }[]
  }[],
  WithChainId<{ coreAddress: string; address?: string }>
>({
  key: 'openProposals',
  get:
    ({ coreAddress, chainId, address }) =>
    ({ get }) => {
      const id = get(refreshOpenProposalsAtom)
      const openProposals = get(
        queryContractIndexerSelector({
          contractAddress: coreAddress,
          formula: 'daoCore/openProposals',
          chainId,
          id,
          args: { address },
        })
      )
      return openProposals ?? []
    },
})

export const walletProposalStatsSelector = selectorFamily<
  | {
      created: number
      votesCast: number
    }
  | undefined,
  WithChainId<{ address: string }>
>({
  key: 'walletProposalStats',
  get:
    ({ address, chainId }) =>
    ({ get }) => {
      const id = get(refreshWalletProposalStatsAtom)
      const stats = get(
        queryWalletIndexerSelector({
          walletAddress: address,
          formula: 'proposals/stats',
          chainId,
          id,
        })
      )
      return stats ?? undefined
    },
})

export const walletAdminOfDaosSelector = selectorFamily<
  string[],
  WithChainId<{ walletAddress: string }>
>({
  key: 'walletAdminOfDaos',
  get:
    ({ walletAddress, chainId }) =>
    ({ get }) => {
      const walletAdminOfDaos: string[] = get(
        queryWalletIndexerSelector({
          chainId,
          walletAddress,
          formula: 'daos/adminOf',
        })
      )

      return walletAdminOfDaos && Array.isArray(walletAdminOfDaos)
        ? walletAdminOfDaos
        : []
    },
})

export const indexerWebSocketChannelSubscriptionsAtom = atom<
  Partial<Record<string, number>>
>({
  key: 'indexerWebSocketChannelSubscriptions',
  default: {},
})

export const indexerWebSocketSelector = selector({
  key: 'indexerWebSocket',
  get: () =>
    new Pusher(WEB_SOCKET_PUSHER_APP_KEY, {
      wsHost: WEB_SOCKET_PUSHER_HOST,
      wsPort: WEB_SOCKET_PUSHER_PORT,
      wssPort: WEB_SOCKET_PUSHER_PORT,
      forceTLS: true,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      disabledTransports: ['sockjs', 'xhr_streaming', 'xhr_polling'],
    }),
  // Client must be internally mutable.
  dangerouslyAllowMutability: true,
})

export const indexerMeilisearchClientSelector = selector({
  key: 'indexerMeilisearchClient',
  get: () => loadMeilisearchClient(),
  dangerouslyAllowMutability: true,
})

// Top 10 featured DAOs by TVL with certain conditions.
export const indexerFeaturedDaosSelector = selector({
  key: 'indexerFeaturedDaos',
  get: async ({ get }) => {
    const priorityFeaturedDaos: string[] =
      get(
        queryGenericIndexerSelector({
          chainId: CHAIN_ID,
          formula: 'priorityFeaturedDaos',
        })
      ) || []

    const client = get(indexerMeilisearchClientSelector)
    const index = client.index(FEATURED_DAOS_INDEX)
    const results = await index.search<{ contractAddress: string }>(null, {
      limit: 10,
      filter: [
        'value.daysSinceLastProposalPassed >= 0',
        'value.daysSinceLastProposalPassed <= 90',
        'value.giniCoefficient >= 0',
        'value.giniCoefficient < 0.75',
        'value.memberCount >= 3',
        // Exclude priority.
        `NOT contractAddress IN ["${priorityFeaturedDaos.join('", "')}"]`,
      ],
      sort: ['value.tvl:desc'],
    })

    // Insert priority DAOs first.
    const featuredDaos = [
      ...priorityFeaturedDaos,
      ...results.hits
        .map((hit) => hit.contractAddress)
        .filter((address) => !priorityFeaturedDaos.includes(address)),
    ]

    return featuredDaos
  },
})
