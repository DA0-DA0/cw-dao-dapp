/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

/**
 * Don't use indexer in this file since there are too many possible cw721
 * contracts and people modify them heavily, so we can't reliably index them.
 */

import { UseQueryOptions } from '@tanstack/react-query'

import {
  AllNftInfoResponseForEmpty,
  ApprovalResponse,
  ApprovalsResponse,
  ContractInfoResponse,
  Empty,
  MinterResponse,
  NftInfoResponseForEmpty,
  Null,
  NumTokensResponse,
  OperatorResponse,
  OperatorsResponse,
  OwnerOfResponse,
  OwnershipForString,
  TokensResponse,
} from '@dao-dao/types/contracts/Cw721Base'
import { getCosmWasmClientForChainId } from '@dao-dao/utils'

import { Cw721BaseQueryClient } from '../../../contracts/Cw721Base'

export const cw721BaseQueryKeys = {
  contract: [
    {
      contract: 'cw721Base',
    },
  ] as const,
  address: (contractAddress: string) =>
    [
      {
        ...cw721BaseQueryKeys.contract[0],
        address: contractAddress,
      },
    ] as const,
  ownerOf: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'owner_of',
        args,
      },
    ] as const,
  approval: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'approval',
        args,
      },
    ] as const,
  approvals: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'approvals',
        args,
      },
    ] as const,
  operator: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'operator',
        args,
      },
    ] as const,
  allOperators: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'all_operators',
        args,
      },
    ] as const,
  numTokens: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'num_tokens',
        args,
      },
    ] as const,
  contractInfo: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'contract_info',
        args,
      },
    ] as const,
  nftInfo: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'nft_info',
        args,
      },
    ] as const,
  allNftInfo: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'all_nft_info',
        args,
      },
    ] as const,
  tokens: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'tokens',
        args,
      },
    ] as const,
  allTokens: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'all_tokens',
        args,
      },
    ] as const,
  minter: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'minter',
        args,
      },
    ] as const,
  extension: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'extension',
        args,
      },
    ] as const,
  ownership: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...cw721BaseQueryKeys.address(contractAddress)[0],
        method: 'ownership',
        args,
      },
    ] as const,
}
export const cw721BaseQueries = {
  ownerOf: <TData = OwnerOfResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseOwnerOfQuery<TData>): UseQueryOptions<
    OwnerOfResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.ownerOf(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).ownerOf({
        includeExpired: args.includeExpired,
        tokenId: args.tokenId,
      })
    },
    ...options,
  }),
  approval: <TData = ApprovalResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseApprovalQuery<TData>): UseQueryOptions<
    ApprovalResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.approval(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).approval({
        includeExpired: args.includeExpired,
        spender: args.spender,
        tokenId: args.tokenId,
      })
    },
    ...options,
  }),
  approvals: <TData = ApprovalsResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseApprovalsQuery<TData>): UseQueryOptions<
    ApprovalsResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.approvals(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).approvals({
        includeExpired: args.includeExpired,
        tokenId: args.tokenId,
      })
    },
    ...options,
  }),
  operator: <TData = OperatorResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseOperatorQuery<TData>): UseQueryOptions<
    OperatorResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.operator(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).operator({
        includeExpired: args.includeExpired,
        operator: args.operator,
        owner: args.owner,
      })
    },
    ...options,
  }),
  allOperators: <TData = OperatorsResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseAllOperatorsQuery<TData>): UseQueryOptions<
    OperatorsResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.allOperators(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).allOperators({
        includeExpired: args.includeExpired,
        limit: args.limit,
        owner: args.owner,
        startAfter: args.startAfter,
      })
    },
    ...options,
  }),
  numTokens: <TData = NumTokensResponse>({
    chainId,
    contractAddress,
    options,
  }: Cw721BaseNumTokensQuery<TData>): UseQueryOptions<
    NumTokensResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.numTokens(contractAddress),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).numTokens()
    },
    ...options,
  }),
  contractInfo: <TData = ContractInfoResponse>({
    chainId,
    contractAddress,
    options,
  }: Cw721BaseContractInfoQuery<TData>): UseQueryOptions<
    ContractInfoResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.contractInfo(contractAddress),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).contractInfo()
    },
    ...options,
  }),
  nftInfo: <TData = NftInfoResponseForEmpty>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseNftInfoQuery<TData>): UseQueryOptions<
    NftInfoResponseForEmpty,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.nftInfo(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).nftInfo({
        tokenId: args.tokenId,
      })
    },
    ...options,
  }),
  allNftInfo: <TData = AllNftInfoResponseForEmpty>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseAllNftInfoQuery<TData>): UseQueryOptions<
    AllNftInfoResponseForEmpty,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.allNftInfo(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).allNftInfo({
        includeExpired: args.includeExpired,
        tokenId: args.tokenId,
      })
    },
    ...options,
  }),
  tokens: <TData = TokensResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseTokensQuery<TData>): UseQueryOptions<
    TokensResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.tokens(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).tokens({
        limit: args.limit,
        owner: args.owner,
        startAfter: args.startAfter,
      })
    },
    ...options,
  }),
  allTokens: <TData = TokensResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseAllTokensQuery<TData>): UseQueryOptions<
    TokensResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.allTokens(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).allTokens({
        limit: args.limit,
        startAfter: args.startAfter,
      })
    },
    ...options,
  }),
  minter: <TData = MinterResponse>({
    chainId,
    contractAddress,
    options,
  }: Cw721BaseMinterQuery<TData>): UseQueryOptions<
    MinterResponse,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.minter(contractAddress),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).minter()
    },
    ...options,
  }),
  extension: <TData = Null>({
    chainId,
    contractAddress,
    args,
    options,
  }: Cw721BaseExtensionQuery<TData>): UseQueryOptions<Null, Error, TData> => ({
    queryKey: cw721BaseQueryKeys.extension(contractAddress, args),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).extension({
        msg: args.msg,
      })
    },
    ...options,
  }),
  ownership: <TData = OwnershipForString>({
    chainId,
    contractAddress,
    options,
  }: Cw721BaseOwnershipQuery<TData>): UseQueryOptions<
    OwnershipForString,
    Error,
    TData
  > => ({
    queryKey: cw721BaseQueryKeys.ownership(contractAddress),
    queryFn: async () => {
      return new Cw721BaseQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).ownership()
    },
    ...options,
  }),
}
export interface Cw721BaseReactQuery<TResponse, TData = TResponse> {
  chainId: string
  contractAddress: string
  options?: Omit<
    UseQueryOptions<TResponse, Error, TData>,
    'queryKey' | 'queryFn' | 'initialData'
  > & {
    initialData?: undefined
  }
}
export interface Cw721BaseOwnershipQuery<TData>
  extends Cw721BaseReactQuery<OwnershipForString, TData> {}
export interface Cw721BaseExtensionQuery<TData>
  extends Cw721BaseReactQuery<Null, TData> {
  args: {
    msg: Empty
  }
}
export interface Cw721BaseMinterQuery<TData>
  extends Cw721BaseReactQuery<MinterResponse, TData> {}
export interface Cw721BaseAllTokensQuery<TData>
  extends Cw721BaseReactQuery<TokensResponse, TData> {
  args: {
    limit?: number
    startAfter?: string
  }
}
export interface Cw721BaseTokensQuery<TData>
  extends Cw721BaseReactQuery<TokensResponse, TData> {
  args: {
    limit?: number
    owner: string
    startAfter?: string
  }
}
export interface Cw721BaseAllNftInfoQuery<TData>
  extends Cw721BaseReactQuery<AllNftInfoResponseForEmpty, TData> {
  args: {
    includeExpired?: boolean
    tokenId: string
  }
}
export interface Cw721BaseNftInfoQuery<TData>
  extends Cw721BaseReactQuery<NftInfoResponseForEmpty, TData> {
  args: {
    tokenId: string
  }
}
export interface Cw721BaseContractInfoQuery<TData>
  extends Cw721BaseReactQuery<ContractInfoResponse, TData> {}
export interface Cw721BaseNumTokensQuery<TData>
  extends Cw721BaseReactQuery<NumTokensResponse, TData> {}
export interface Cw721BaseAllOperatorsQuery<TData>
  extends Cw721BaseReactQuery<OperatorsResponse, TData> {
  args: {
    includeExpired?: boolean
    limit?: number
    owner: string
    startAfter?: string
  }
}
export interface Cw721BaseOperatorQuery<TData>
  extends Cw721BaseReactQuery<OperatorResponse, TData> {
  args: {
    includeExpired?: boolean
    operator: string
    owner: string
  }
}
export interface Cw721BaseApprovalsQuery<TData>
  extends Cw721BaseReactQuery<ApprovalsResponse, TData> {
  args: {
    includeExpired?: boolean
    tokenId: string
  }
}
export interface Cw721BaseApprovalQuery<TData>
  extends Cw721BaseReactQuery<ApprovalResponse, TData> {
  args: {
    includeExpired?: boolean
    spender: string
    tokenId: string
  }
}
export interface Cw721BaseOwnerOfQuery<TData>
  extends Cw721BaseReactQuery<OwnerOfResponse, TData> {
  args: {
    includeExpired?: boolean
    tokenId: string
  }
}
