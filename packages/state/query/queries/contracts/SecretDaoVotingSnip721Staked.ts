/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { UseQueryOptions } from '@tanstack/react-query'

import {
  ActiveThresholdResponse,
  AnyContractInfo,
  ArrayOfString,
  Auth,
  Boolean,
  Config,
  HooksResponse,
  InfoResponse,
  NftClaimsResponse,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/SecretDaoVotingSnip721Staked'
import { getCosmWasmClientForChainId } from '@dao-dao/utils'

import { SecretDaoVotingSnip721StakedQueryClient } from '../../../contracts/SecretDaoVotingSnip721Staked'

export const secretDaoVotingSnip721StakedQueryKeys = {
  contract: [
    {
      contract: 'secretDaoVotingSnip721Staked',
    },
  ] as const,
  address: (contractAddress: string) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.contract[0],
        address: contractAddress,
      },
    ] as const,
  config: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'config',
        args,
      },
    ] as const,
  nftClaims: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'nft_claims',
        args,
      },
    ] as const,
  hooks: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'hooks',
        args,
      },
    ] as const,
  stakedNfts: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'staked_nfts',
        args,
      },
    ] as const,
  activeThreshold: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'active_threshold',
        args,
      },
    ] as const,
  isActive: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'is_active',
        args,
      },
    ] as const,
  votingPowerAtHeight: (
    contractAddress: string,
    args?: Record<string, unknown>
  ) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'voting_power_at_height',
        args,
      },
    ] as const,
  totalPowerAtHeight: (
    contractAddress: string,
    args?: Record<string, unknown>
  ) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'total_power_at_height',
        args,
      },
    ] as const,
  dao: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'dao',
        args,
      },
    ] as const,
  info: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...secretDaoVotingSnip721StakedQueryKeys.address(contractAddress)[0],
        method: 'info',
        args,
      },
    ] as const,
}
export const secretDaoVotingSnip721StakedQueries = {
  config: <TData = Config>({
    chainId,
    contractAddress,
    options,
  }: SecretDaoVotingSnip721StakedConfigQuery<TData>): UseQueryOptions<
    Config,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.config(contractAddress),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).config(),
    ...options,
  }),
  nftClaims: <TData = NftClaimsResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: SecretDaoVotingSnip721StakedNftClaimsQuery<TData>): UseQueryOptions<
    NftClaimsResponse,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.nftClaims(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).nftClaims({
        auth: args.auth,
      }),
    ...options,
  }),
  hooks: <TData = HooksResponse>({
    chainId,
    contractAddress,
    options,
  }: SecretDaoVotingSnip721StakedHooksQuery<TData>): UseQueryOptions<
    HooksResponse,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.hooks(contractAddress),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).hooks(),
    ...options,
  }),
  stakedNfts: <TData = ArrayOfString>({
    chainId,
    contractAddress,
    args,
    options,
  }: SecretDaoVotingSnip721StakedStakedNftsQuery<TData>): UseQueryOptions<
    ArrayOfString,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.stakedNfts(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).stakedNfts({
        auth: args.auth,
      }),
    ...options,
  }),
  activeThreshold: <TData = ActiveThresholdResponse>({
    chainId,
    contractAddress,
    options,
  }: SecretDaoVotingSnip721StakedActiveThresholdQuery<TData>): UseQueryOptions<
    ActiveThresholdResponse,
    Error,
    TData
  > => ({
    queryKey:
      secretDaoVotingSnip721StakedQueryKeys.activeThreshold(contractAddress),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).activeThreshold(),
    ...options,
  }),
  isActive: <TData = Boolean>({
    chainId,
    contractAddress,
    options,
  }: SecretDaoVotingSnip721StakedIsActiveQuery<TData>): UseQueryOptions<
    Boolean,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.isActive(contractAddress),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).isActive(),
    ...options,
  }),
  votingPowerAtHeight: <TData = VotingPowerAtHeightResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: SecretDaoVotingSnip721StakedVotingPowerAtHeightQuery<TData>): UseQueryOptions<
    VotingPowerAtHeightResponse,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.votingPowerAtHeight(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).votingPowerAtHeight({
        auth: args.auth,
        height: args.height,
      }),
    ...options,
  }),
  totalPowerAtHeight: <TData = TotalPowerAtHeightResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: SecretDaoVotingSnip721StakedTotalPowerAtHeightQuery<TData>): UseQueryOptions<
    TotalPowerAtHeightResponse,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.totalPowerAtHeight(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).totalPowerAtHeight({
        height: args.height,
      }),
    ...options,
  }),
  dao: <TData = AnyContractInfo>({
    chainId,
    contractAddress,
    options,
  }: SecretDaoVotingSnip721StakedDaoQuery<TData>): UseQueryOptions<
    AnyContractInfo,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.dao(contractAddress),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).dao(),
    ...options,
  }),
  info: <TData = InfoResponse>({
    chainId,
    contractAddress,
    options,
  }: SecretDaoVotingSnip721StakedInfoQuery<TData>): UseQueryOptions<
    InfoResponse,
    Error,
    TData
  > => ({
    queryKey: secretDaoVotingSnip721StakedQueryKeys.info(contractAddress),
    queryFn: async () =>
      new SecretDaoVotingSnip721StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).info(),
    ...options,
  }),
}
export interface SecretDaoVotingSnip721StakedReactQuery<
  TResponse,
  TData = TResponse
> {
  chainId: string
  contractAddress: string
  options?: Omit<
    UseQueryOptions<TResponse, Error, TData>,
    'queryKey' | 'queryFn' | 'initialData'
  > & {
    initialData?: undefined
  }
}
export interface SecretDaoVotingSnip721StakedInfoQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<InfoResponse, TData> {}
export interface SecretDaoVotingSnip721StakedDaoQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<AnyContractInfo, TData> {}
export interface SecretDaoVotingSnip721StakedTotalPowerAtHeightQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<
    TotalPowerAtHeightResponse,
    TData
  > {
  args: {
    height?: number
  }
}
export interface SecretDaoVotingSnip721StakedVotingPowerAtHeightQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<
    VotingPowerAtHeightResponse,
    TData
  > {
  args: {
    auth: Auth
    height?: number
  }
}
export interface SecretDaoVotingSnip721StakedIsActiveQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<Boolean, TData> {}
export interface SecretDaoVotingSnip721StakedActiveThresholdQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<
    ActiveThresholdResponse,
    TData
  > {}
export interface SecretDaoVotingSnip721StakedStakedNftsQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<ArrayOfString, TData> {
  args: {
    auth: Auth
  }
}
export interface SecretDaoVotingSnip721StakedHooksQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<HooksResponse, TData> {}
export interface SecretDaoVotingSnip721StakedNftClaimsQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<NftClaimsResponse, TData> {
  args: {
    auth: Auth
  }
}
export interface SecretDaoVotingSnip721StakedConfigQuery<TData>
  extends SecretDaoVotingSnip721StakedReactQuery<Config, TData> {}