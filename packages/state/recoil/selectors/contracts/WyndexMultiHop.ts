/**
 * This file was automatically generated by @cosmwasm/ts-codegen@0.17.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { selectorFamily } from 'recoil'

import { WithChainId } from '@dao-dao/types'
import {
  ConfigResponse,
  SimulateSwapOperationsResponse,
} from '@dao-dao/types/contracts/WyndexMultiHop'

import {
  WyndexMultiHopClient,
  WyndexMultiHopQueryClient,
} from '../../../contracts/WyndexMultiHop'
import { signingCosmWasmClientAtom } from '../../atoms/chain'
import { refreshTokenUsdcPriceAtom } from '../../atoms/refresh'
import { cosmWasmClientForChainSelector } from '../chain'

type QueryClientParams = WithChainId<{
  contractAddress: string
}>

export const queryClient = selectorFamily<
  WyndexMultiHopQueryClient,
  QueryClientParams
>({
  key: 'wyndexMultiHopQueryClient',
  get:
    ({ contractAddress, chainId }) =>
    ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      return new WyndexMultiHopQueryClient(client, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export type ExecuteClientParams = {
  contractAddress: string
  sender: string
}

export const executeClient = selectorFamily<
  WyndexMultiHopClient | undefined,
  ExecuteClientParams
>({
  key: 'wyndexMultiHopClient',
  get:
    ({ contractAddress, sender }) =>
    ({ get }) => {
      const client = get(signingCosmWasmClientAtom)
      if (!client) return
      return new WyndexMultiHopClient(client, sender, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export const configSelector = selectorFamily<
  ConfigResponse,
  QueryClientParams & {
    params: Parameters<WyndexMultiHopQueryClient['config']>
  }
>({
  key: 'wyndexMultiHopConfig',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.config(...params)
    },
})
export const simulateSwapOperationsSelector = selectorFamily<
  SimulateSwapOperationsResponse,
  QueryClientParams & {
    params: Parameters<WyndexMultiHopQueryClient['simulateSwapOperations']>
  }
>({
  key: 'wyndexMultiHopSimulateSwapOperations',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      get(refreshTokenUsdcPriceAtom(''))
      const client = get(queryClient(queryClientParams))
      return await client.simulateSwapOperations(...params)
    },
})
export const simulateReverseSwapOperationsSelector = selectorFamily<
  SimulateSwapOperationsResponse,
  QueryClientParams & {
    params: Parameters<
      WyndexMultiHopQueryClient['simulateReverseSwapOperations']
    >
  }
>({
  key: 'wyndexMultiHopSimulateReverseSwapOperations',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      get(refreshTokenUsdcPriceAtom(''))
      const client = get(queryClient(queryClientParams))
      return await client.simulateReverseSwapOperations(...params)
    },
})
