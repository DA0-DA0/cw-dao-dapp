/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { UseQueryOptions } from '@tanstack/react-query'

import {
  ActiveThresholdResponse,
  Addr,
  Boolean,
  InfoResponse,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoVotingCw20Staked'
import { getCosmWasmClientForChainId } from '@dao-dao/utils'

import { DaoVotingCw20StakedQueryClient } from '../../../contracts/DaoVotingCw20Staked'

export const daoVotingCw20StakedQueryKeys = {
  contract: [
    {
      contract: 'daoVotingCw20Staked',
    },
  ] as const,
  address: (contractAddress: string) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.contract[0],
        address: contractAddress,
      },
    ] as const,
  stakingContract: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'staking_contract',
        args,
      },
    ] as const,
  activeThreshold: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'active_threshold',
        args,
      },
    ] as const,
  votingPowerAtHeight: (
    contractAddress: string,
    args?: Record<string, unknown>
  ) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
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
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'total_power_at_height',
        args,
      },
    ] as const,
  dao: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'dao',
        args,
      },
    ] as const,
  info: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'info',
        args,
      },
    ] as const,
  tokenContract: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'token_contract',
        args,
      },
    ] as const,
  isActive: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoVotingCw20StakedQueryKeys.address(contractAddress)[0],
        method: 'is_active',
        args,
      },
    ] as const,
}
export const daoVotingCw20StakedQueries = {
  stakingContract: <TData = Addr>({
    chainId,
    contractAddress,
    options,
  }: DaoVotingCw20StakedStakingContractQuery<TData>): UseQueryOptions<
    Addr,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.stakingContract(contractAddress),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).stakingContract(),
    ...options,
  }),
  activeThreshold: <TData = ActiveThresholdResponse>({
    chainId,
    contractAddress,
    options,
  }: DaoVotingCw20StakedActiveThresholdQuery<TData>): UseQueryOptions<
    ActiveThresholdResponse,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.activeThreshold(contractAddress),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).activeThreshold(),
    ...options,
  }),
  votingPowerAtHeight: <TData = VotingPowerAtHeightResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: DaoVotingCw20StakedVotingPowerAtHeightQuery<TData>): UseQueryOptions<
    VotingPowerAtHeightResponse,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.votingPowerAtHeight(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).votingPowerAtHeight({
        address: args.address,
        height: args.height,
      }),
    ...options,
  }),
  totalPowerAtHeight: <TData = TotalPowerAtHeightResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: DaoVotingCw20StakedTotalPowerAtHeightQuery<TData>): UseQueryOptions<
    TotalPowerAtHeightResponse,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.totalPowerAtHeight(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).totalPowerAtHeight({
        height: args.height,
      }),
    ...options,
  }),
  dao: <TData = Addr>({
    chainId,
    contractAddress,
    options,
  }: DaoVotingCw20StakedDaoQuery<TData>): UseQueryOptions<
    Addr,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.dao(contractAddress),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).dao(),
    ...options,
  }),
  info: <TData = InfoResponse>({
    chainId,
    contractAddress,
    options,
  }: DaoVotingCw20StakedInfoQuery<TData>): UseQueryOptions<
    InfoResponse,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.info(contractAddress),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).info(),
    ...options,
  }),
  tokenContract: <TData = Addr>({
    chainId,
    contractAddress,
    options,
  }: DaoVotingCw20StakedTokenContractQuery<TData>): UseQueryOptions<
    Addr,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.tokenContract(contractAddress),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).tokenContract(),
    ...options,
  }),
  isActive: <TData = Boolean>({
    chainId,
    contractAddress,
    options,
  }: DaoVotingCw20StakedIsActiveQuery<TData>): UseQueryOptions<
    Boolean,
    Error,
    TData
  > => ({
    queryKey: daoVotingCw20StakedQueryKeys.isActive(contractAddress),
    queryFn: async () =>
      new DaoVotingCw20StakedQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).isActive(),
    ...options,
  }),
}
export interface DaoVotingCw20StakedReactQuery<TResponse, TData = TResponse> {
  chainId: string
  contractAddress: string
  options?: Omit<
    UseQueryOptions<TResponse, Error, TData>,
    'queryKey' | 'queryFn' | 'initialData'
  > & {
    initialData?: undefined
  }
}
export interface DaoVotingCw20StakedIsActiveQuery<TData>
  extends DaoVotingCw20StakedReactQuery<Boolean, TData> {}
export interface DaoVotingCw20StakedTokenContractQuery<TData>
  extends DaoVotingCw20StakedReactQuery<Addr, TData> {}
export interface DaoVotingCw20StakedInfoQuery<TData>
  extends DaoVotingCw20StakedReactQuery<InfoResponse, TData> {}
export interface DaoVotingCw20StakedDaoQuery<TData>
  extends DaoVotingCw20StakedReactQuery<Addr, TData> {}
export interface DaoVotingCw20StakedTotalPowerAtHeightQuery<TData>
  extends DaoVotingCw20StakedReactQuery<TotalPowerAtHeightResponse, TData> {
  args: {
    height?: number
  }
}
export interface DaoVotingCw20StakedVotingPowerAtHeightQuery<TData>
  extends DaoVotingCw20StakedReactQuery<VotingPowerAtHeightResponse, TData> {
  args: {
    address: string
    height?: number
  }
}
export interface DaoVotingCw20StakedActiveThresholdQuery<TData>
  extends DaoVotingCw20StakedReactQuery<ActiveThresholdResponse, TData> {}
export interface DaoVotingCw20StakedStakingContractQuery<TData>
  extends DaoVotingCw20StakedReactQuery<Addr, TData> {}
