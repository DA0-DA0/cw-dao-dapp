import { selectorFamily } from 'recoil'

import {
  StakeCw20Client as ExecuteClient,
  StakeCw20QueryClient as QueryClient,
  StakedBalanceAtHeightResponse,
  StakedValueResponse,
  TotalStakedAtHeightResponse,
  TotalValueResponse,
  GetConfigResponse,
  GetHooksResponse,
  ClaimsResponse,
} from '../../../clients/stake-cw20'
import {
  refreshClaimsIdAtom,
  refreshWalletBalancesIdAtom,
} from '../../atoms/refresh'
import { cosmWasmClientSelector, signingCosmWasmClientSelector } from '../chain'

type QueryClientParams = {
  contractAddress: string
}

const queryClient = selectorFamily<QueryClient | undefined, QueryClientParams>({
  key: 'stakeCw20QueryClient',
  get:
    ({ contractAddress }) =>
    ({ get }) => {
      const client = get(cosmWasmClientSelector)
      if (!client) return

      return new QueryClient(client, contractAddress)
    },
})

export type ExecuteClientParams = {
  contractAddress: string
  sender: string
}

export const executeClient = selectorFamily<
  ExecuteClient | undefined,
  ExecuteClientParams
>({
  key: 'stakeCw20ExecuteClient',
  get:
    ({ contractAddress, sender }) =>
    ({ get }) => {
      const client = get(signingCosmWasmClientSelector)
      if (!client) return

      return new ExecuteClient(client, sender, contractAddress)
    },
})

export const stakedBalanceAtHeightSelector = selectorFamily<
  StakedBalanceAtHeightResponse | undefined,
  QueryClientParams & {
    params: Parameters<QueryClient['stakedBalanceAtHeight']>
  }
>({
  key: 'stakeCw20StakedBalanceAtHeight',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      get(refreshWalletBalancesIdAtom(params[0].address))

      return await client.stakedBalanceAtHeight(...params)
    },
})

export const totalStakedAtHeightSelector = selectorFamily<
  TotalStakedAtHeightResponse | undefined,
  QueryClientParams & {
    params: Parameters<QueryClient['totalStakedAtHeight']>
  }
>({
  key: 'stakeCw20TotalStakedAtHeight',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      get(refreshWalletBalancesIdAtom(undefined))

      return await client.totalStakedAtHeight(...params)
    },
})

export const stakedValueSelector = selectorFamily<
  StakedValueResponse | undefined,
  QueryClientParams & {
    params: Parameters<QueryClient['stakedValue']>
  }
>({
  key: 'stakeCw20StakedValue',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      get(refreshWalletBalancesIdAtom(params[0].address))

      return await client.stakedValue(...params)
    },
})

export const totalValueSelector = selectorFamily<
  TotalValueResponse | undefined,
  QueryClientParams
>({
  key: 'stakeCw20TotalValue',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      get(refreshWalletBalancesIdAtom(undefined))

      return await client.totalValue()
    },
})

export const getConfigSelector = selectorFamily<
  GetConfigResponse | undefined,
  QueryClientParams
>({
  key: 'stakeCw20GetConfig',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      return await client.getConfig()
    },
})

export const claimsSelector = selectorFamily<
  ClaimsResponse | undefined,
  QueryClientParams & {
    params: Parameters<QueryClient['claims']>
  }
>({
  key: 'stakeCw20Claims',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      get(refreshClaimsIdAtom(params[0].address))

      return await client.claims(...params)
    },
})

export const getHooksSelector = selectorFamily<
  GetHooksResponse | undefined,
  QueryClientParams
>({
  key: 'stakeCw20GetHooks',
  get:
    (queryClientParams) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      if (!client) return

      return await client.getHooks()
    },
})
