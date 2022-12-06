import { selectorFamily } from 'recoil'

import { AmountWithTimestamp, WithChainId } from '@dao-dao/types'
import {
  AllAccountsResponse,
  AllAllowancesResponse,
  AllowanceResponse,
  BalanceResponse,
  DownloadLogoResponse,
  MarketingInfoResponse,
  MinterResponse,
  TokenInfoResponse,
} from '@dao-dao/types/contracts/Cw20Base'

import {
  Cw20BaseClient,
  Cw20BaseQueryClient,
} from '../../../contracts/Cw20Base'
import {
  refreshWalletBalancesIdAtom,
  signingCosmWasmClientAtom,
} from '../../atoms'
import { cosmWasmClientForChainSelector } from '../chain'
import { queryIndexerSelector } from '../indexer'

type QueryClientParams = WithChainId<{
  contractAddress: string
}>

const queryClient = selectorFamily<Cw20BaseQueryClient, QueryClientParams>({
  key: 'cw20BaseQueryClient',
  get:
    ({ contractAddress, chainId }) =>
    ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      return new Cw20BaseQueryClient(client, contractAddress)
    },
})

export type ExecuteClientParams = {
  contractAddress: string
  sender: string
}

export const executeClient = selectorFamily<
  Cw20BaseClient | undefined,
  ExecuteClientParams
>({
  key: 'cw20BaseExecuteClient',
  get:
    ({ contractAddress, sender }) =>
    ({ get }) => {
      const client = get(signingCosmWasmClientAtom)
      if (!client) return
      return new Cw20BaseClient(client, sender, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export const balanceSelector = selectorFamily<
  BalanceResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['balance']>
  }
>({
  key: 'cw20BaseBalance',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const id = get(refreshWalletBalancesIdAtom(params[0].address))

      const balance = get(
        queryIndexerSelector({
          ...queryClientParams,
          formulaName: 'cw20/balance',
          args: params[0],
          id,
        })
      )
      // Null when indexer fails.
      if (balance !== null) {
        return { balance }
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.balance(...params)
    },
})
export const tokenInfoSelector = selectorFamily<
  TokenInfoResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['tokenInfo']>
  }
>({
  key: 'cw20BaseTokenInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const tokenInfo = get(
        queryIndexerSelector({
          ...queryClientParams,
          formulaName: 'cw20/tokenInfo',
        })
      )
      // Null when indexer fails.
      if (tokenInfo !== null) {
        return tokenInfo
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.tokenInfo(...params)
    },
})
export const minterSelector = selectorFamily<
  MinterResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['minter']>
  }
>({
  key: 'cw20BaseMinter',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.minter(...params)
    },
})
export const allowanceSelector = selectorFamily<
  AllowanceResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['allowance']>
  }
>({
  key: 'cw20BaseAllowance',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))

      get(refreshWalletBalancesIdAtom(params[0].owner))

      return await client.allowance(...params)
    },
})
export const allAllowancesSelector = selectorFamily<
  AllAllowancesResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['allAllowances']>
  }
>({
  key: 'cw20BaseAllAllowances',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))

      get(refreshWalletBalancesIdAtom(params[0].owner))

      return await client.allAllowances(...params)
    },
})
export const allAccountsSelector = selectorFamily<
  AllAccountsResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['allAccounts']>
  }
>({
  key: 'cw20BaseAllAccounts',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.allAccounts(...params)
    },
})
export const marketingInfoSelector = selectorFamily<
  MarketingInfoResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['marketingInfo']>
  }
>({
  key: 'cw20BaseMarketingInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const marketingInfo = get(
        queryIndexerSelector({
          ...queryClientParams,
          formulaName: 'cw20/marketingInfo',
        })
      )
      // Null when indexer fails.
      if (marketingInfo !== null) {
        return marketingInfo
      }

      // If indexer query fails, fallback to contract query.
      const client = get(queryClient(queryClientParams))
      return await client.marketingInfo(...params)
    },
})
export const downloadLogoSelector = selectorFamily<
  DownloadLogoResponse,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['downloadLogo']>
  }
>({
  key: 'cw20BaseDownloadLogo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.downloadLogo(...params)
    },
})

//! Custom

export const balanceWithTimestampSelector = selectorFamily<
  AmountWithTimestamp,
  QueryClientParams & {
    params: Parameters<Cw20BaseQueryClient['balance']>
  }
>({
  key: 'cw20BaseBalanceWithTimestamp',
  get:
    (params) =>
    ({ get }) => {
      const amount = Number(get(balanceSelector(params)).balance)

      return {
        amount,
        timestamp: new Date(),
      }
    },
})

export const logoUrlSelector = selectorFamily<
  string | undefined,
  QueryClientParams
>({
  key: 'cw20BaseLogoUrl',
  get:
    ({ contractAddress, chainId }) =>
    ({ get }) => {
      const logoUrl = get(
        queryIndexerSelector({
          contractAddress,
          chainId,
          formulaName: 'cw20/logoUrl',
        })
      )
      // Null when indexer fails.
      if (logoUrl !== null) {
        return logoUrl
      }

      // If indexer query fails, fallback to contract query.
      const logoInfo = get(
        marketingInfoSelector({
          contractAddress,
          chainId,
          params: [],
        })
      ).logo
      return !!logoInfo && logoInfo !== 'embedded' && 'url' in logoInfo
        ? logoInfo.url
        : undefined
    },
})
