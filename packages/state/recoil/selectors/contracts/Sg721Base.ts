/**
 * This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { selectorFamily } from 'recoil'

import { WithChainId } from '@dao-dao/types'
import {
  AllNftInfoResponse,
  AllOperatorsResponse,
  AllTokensResponse,
  ApprovalResponse,
  ApprovalsResponse,
  CollectionInfoResponse,
  ContractInfoResponse,
  MinterResponse,
  NftInfoResponse,
  NumTokensResponse,
  OwnerOfResponse,
  TokensResponse,
} from '@dao-dao/types/contracts/Sg721Base'

import {
  Sg721BaseClient,
  Sg721BaseQueryClient,
} from '../../../contracts/Sg721Base'
import {
  refreshWalletBalancesIdAtom,
  signingCosmWasmClientAtom,
} from '../../atoms'
import { cosmWasmClientForChainSelector } from '../chain'

type QueryClientParams = WithChainId<{
  contractAddress: string
}>

export const queryClient = selectorFamily<
  Sg721BaseQueryClient,
  QueryClientParams
>({
  key: 'sg721BaseQueryClient',
  get:
    ({ contractAddress, chainId }) =>
    ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      return new Sg721BaseQueryClient(client, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export type ExecuteClientParams = WithChainId<{
  contractAddress: string
  sender: string
}>

export const executeClient = selectorFamily<
  Sg721BaseClient | undefined,
  ExecuteClientParams
>({
  key: 'sg721BaseExecuteClient',
  get:
    ({ chainId, contractAddress, sender }) =>
    ({ get }) => {
      const client = get(signingCosmWasmClientAtom({ chainId }))
      if (!client) return
      return new Sg721BaseClient(client, sender, contractAddress)
    },
  dangerouslyAllowMutability: true,
})

export const ownerOfSelector = selectorFamily<
  OwnerOfResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['ownerOf']>
  }
>({
  key: 'sg721BaseOwnerOf',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.ownerOf(...params)
    },
})
export const approvalSelector = selectorFamily<
  ApprovalResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['approval']>
  }
>({
  key: 'sg721BaseApproval',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.approval(...params)
    },
})
export const approvalsSelector = selectorFamily<
  ApprovalsResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['approvals']>
  }
>({
  key: 'sg721BaseApprovals',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.approvals(...params)
    },
})
export const allOperatorsSelector = selectorFamily<
  AllOperatorsResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['allOperators']>
  }
>({
  key: 'sg721BaseAllOperators',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.allOperators(...params)
    },
})
export const numTokensSelector = selectorFamily<
  NumTokensResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['numTokens']>
  }
>({
  key: 'sg721BaseNumTokens',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.numTokens(...params)
    },
})
export const contractInfoSelector = selectorFamily<
  ContractInfoResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['contractInfo']>
  }
>({
  key: 'sg721BaseContractInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.contractInfo(...params)
    },
})
export const nftInfoSelector = selectorFamily<
  NftInfoResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['nftInfo']>
  }
>({
  key: 'sg721BaseNftInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.nftInfo(...params)
    },
})
export const allNftInfoSelector = selectorFamily<
  AllNftInfoResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['allNftInfo']>
  }
>({
  key: 'sg721BaseAllNftInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.allNftInfo(...params)
    },
})
export const tokensSelector = selectorFamily<
  TokensResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['tokens']>
  }
>({
  key: 'sg721BaseTokens',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      get(refreshWalletBalancesIdAtom(params[0].owner))
      return await client.tokens(...params)
    },
})
export const allTokensSelector = selectorFamily<
  AllTokensResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['allTokens']>
  }
>({
  key: 'sg721BaseAllTokens',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.allTokens(...params)
    },
})
export const minterSelector = selectorFamily<
  MinterResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['minter']>
  }
>({
  key: 'sg721BaseMinter',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.minter(...params)
    },
})
export const collectionInfoSelector = selectorFamily<
  CollectionInfoResponse,
  QueryClientParams & {
    params: Parameters<Sg721BaseQueryClient['collectionInfo']>
  }
>({
  key: 'sg721BaseCollectionInfo',
  get:
    ({ params, ...queryClientParams }) =>
    async ({ get }) => {
      const client = get(queryClient(queryClientParams))
      return await client.collectionInfo(...params)
    },
})

const ALL_TOKENS_FOR_OWNER_LIMIT = 30
export const allTokensForOwnerSelector = selectorFamily<
  TokensResponse['tokens'],
  QueryClientParams & {
    owner: string
  }
>({
  key: 'sg721BaseAllTokensForOwner',
  get:
    ({ owner, ...queryClientParams }) =>
    async ({ get }) => {
      get(refreshWalletBalancesIdAtom(owner))

      const tokens: TokensResponse['tokens'] = []
      while (true) {
        const response = await get(
          tokensSelector({
            ...queryClientParams,
            params: [
              {
                owner,
                startAfter: tokens[tokens.length - 1],
                limit: ALL_TOKENS_FOR_OWNER_LIMIT,
              },
            ],
          })
        )?.tokens

        if (!response?.length) {
          break
        }

        tokens.push(...response)

        // If we have less than the limit of items, we've exhausted them.
        if (response.length < ALL_TOKENS_FOR_OWNER_LIMIT) {
          break
        }
      }

      return tokens
    },
})
