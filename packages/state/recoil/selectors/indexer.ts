import { selectorFamily } from 'recoil'

import { WithChainId } from '@dao-dao/types'

import {
  DaoSearchResult,
  QueryIndexerOptions,
  queryIndexer,
  searchDaos,
} from '../../indexer'
import {
  refreshOpenProposalsAtom,
  refreshWalletProposalStatsAtom,
} from '../atoms'

export const queryContractIndexerSelector = selectorFamily<
  any,
  {
    contractAddress: string
    formulaName: string
    // Refresh by changing this value.
    id?: number
  } & QueryIndexerOptions
>({
  key: 'queryContractIndexer',
  get:
    ({ contractAddress, formulaName, ...options }) =>
    async () => {
      try {
        return await queryIndexer(
          'contract',
          contractAddress,
          formulaName,
          options
        )
      } catch (err) {
        // If the indexer fails, return null.
        console.error(err)
        return null
      }
    },
})

export const queryWalletIndexerSelector = selectorFamily<
  any,
  {
    walletAddress: string
    formulaName: string
    // Refresh by changing this value.
    id?: number
  } & QueryIndexerOptions
>({
  key: 'queryWalletIndexer',
  get:
    ({ walletAddress, formulaName, ...options }) =>
    async () => {
      try {
        return await queryIndexer('wallet', walletAddress, formulaName, options)
      } catch (err) {
        // If the indexer fails, return null.
        console.error(err)
        return null
      }
    },
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
    proposals: { id: number }[]
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
          formulaName: 'daoCore/openProposals',
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
          formulaName: 'proposals/stats',
          chainId,
          id,
        })
      )
      return stats ?? undefined
    },
})
