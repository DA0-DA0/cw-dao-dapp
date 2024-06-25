/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { UseQueryOptions } from '@tanstack/react-query'

import {
  Addr,
  Binary,
  Config,
  DepositInfoResponse,
  Empty,
  HooksResponse,
} from '@dao-dao/types/contracts/DaoPreProposeSingle'
import { getCosmWasmClientForChainId } from '@dao-dao/utils'

import { DaoPreProposeSingleQueryClient } from '../../../contracts/DaoPreProposeSingle'

export const daoPreProposeSingleQueryKeys = {
  contract: [
    {
      contract: 'daoPreProposeSingle',
    },
  ] as const,
  address: (contractAddress: string) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.contract[0],
        address: contractAddress,
      },
    ] as const,
  proposalModule: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.address(contractAddress)[0],
        method: 'proposal_module',
        args,
      },
    ] as const,
  dao: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.address(contractAddress)[0],
        method: 'dao',
        args,
      },
    ] as const,
  config: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.address(contractAddress)[0],
        method: 'config',
        args,
      },
    ] as const,
  depositInfo: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.address(contractAddress)[0],
        method: 'deposit_info',
        args,
      },
    ] as const,
  proposalSubmittedHooks: (
    contractAddress: string,
    args?: Record<string, unknown>
  ) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.address(contractAddress)[0],
        method: 'proposal_submitted_hooks',
        args,
      },
    ] as const,
  queryExtension: (contractAddress: string, args?: Record<string, unknown>) =>
    [
      {
        ...daoPreProposeSingleQueryKeys.address(contractAddress)[0],
        method: 'query_extension',
        args,
      },
    ] as const,
}
export const daoPreProposeSingleQueries = {
  proposalModule: <TData = Addr>({
    chainId,
    contractAddress,
    options,
  }: DaoPreProposeSingleProposalModuleQuery<TData>): UseQueryOptions<
    Addr,
    Error,
    TData
  > => ({
    queryKey: daoPreProposeSingleQueryKeys.proposalModule(contractAddress),
    queryFn: async () =>
      new DaoPreProposeSingleQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).proposalModule(),
    ...options,
  }),
  dao: <TData = Addr>({
    chainId,
    contractAddress,
    options,
  }: DaoPreProposeSingleDaoQuery<TData>): UseQueryOptions<
    Addr,
    Error,
    TData
  > => ({
    queryKey: daoPreProposeSingleQueryKeys.dao(contractAddress),
    queryFn: async () =>
      new DaoPreProposeSingleQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).dao(),
    ...options,
  }),
  config: <TData = Config>({
    chainId,
    contractAddress,
    options,
  }: DaoPreProposeSingleConfigQuery<TData>): UseQueryOptions<
    Config,
    Error,
    TData
  > => ({
    queryKey: daoPreProposeSingleQueryKeys.config(contractAddress),
    queryFn: async () =>
      new DaoPreProposeSingleQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).config(),
    ...options,
  }),
  depositInfo: <TData = DepositInfoResponse>({
    chainId,
    contractAddress,
    args,
    options,
  }: DaoPreProposeSingleDepositInfoQuery<TData>): UseQueryOptions<
    DepositInfoResponse,
    Error,
    TData
  > => ({
    queryKey: daoPreProposeSingleQueryKeys.depositInfo(contractAddress, args),
    queryFn: async () =>
      new DaoPreProposeSingleQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).depositInfo({
        proposalId: args.proposalId,
      }),
    ...options,
  }),
  proposalSubmittedHooks: <TData = HooksResponse>({
    chainId,
    contractAddress,
    options,
  }: DaoPreProposeSingleProposalSubmittedHooksQuery<TData>): UseQueryOptions<
    HooksResponse,
    Error,
    TData
  > => ({
    queryKey:
      daoPreProposeSingleQueryKeys.proposalSubmittedHooks(contractAddress),
    queryFn: async () =>
      new DaoPreProposeSingleQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).proposalSubmittedHooks(),
    ...options,
  }),
  queryExtension: <TData = Binary>({
    chainId,
    contractAddress,
    args,
    options,
  }: DaoPreProposeSingleQueryExtensionQuery<TData>): UseQueryOptions<
    Binary,
    Error,
    TData
  > => ({
    queryKey: daoPreProposeSingleQueryKeys.queryExtension(
      contractAddress,
      args
    ),
    queryFn: async () =>
      new DaoPreProposeSingleQueryClient(
        await getCosmWasmClientForChainId(chainId),
        contractAddress
      ).queryExtension({
        msg: args.msg,
      }),
    ...options,
  }),
}
export interface DaoPreProposeSingleReactQuery<TResponse, TData = TResponse> {
  chainId: string
  contractAddress: string
  options?: Omit<
    UseQueryOptions<TResponse, Error, TData>,
    'queryKey' | 'queryFn' | 'initialData'
  > & {
    initialData?: undefined
  }
}
export interface DaoPreProposeSingleQueryExtensionQuery<TData>
  extends DaoPreProposeSingleReactQuery<Binary, TData> {
  args: {
    msg: Empty
  }
}
export interface DaoPreProposeSingleProposalSubmittedHooksQuery<TData>
  extends DaoPreProposeSingleReactQuery<HooksResponse, TData> {}
export interface DaoPreProposeSingleDepositInfoQuery<TData>
  extends DaoPreProposeSingleReactQuery<DepositInfoResponse, TData> {
  args: {
    proposalId: number
  }
}
export interface DaoPreProposeSingleConfigQuery<TData>
  extends DaoPreProposeSingleReactQuery<Config, TData> {}
export interface DaoPreProposeSingleDaoQuery<TData>
  extends DaoPreProposeSingleReactQuery<Addr, TData> {}
export interface DaoPreProposeSingleProposalModuleQuery<TData>
  extends DaoPreProposeSingleReactQuery<Addr, TData> {}