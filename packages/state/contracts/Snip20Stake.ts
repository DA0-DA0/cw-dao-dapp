/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { Coin, StdFee } from '@cosmjs/amino'
import {
  CosmWasmClient,
  ExecuteResult,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'

import {
  Action,
  Binary,
  ClaimsResponse,
  Config,
  Duration,
  GetHooksResponse,
  ListStakersResponse,
  OwnershipForAddr,
  StakedBalanceAtHeightResponse,
  StakedValueResponse,
  TotalStakedAtHeightResponse,
  TotalValueResponse,
  Uint128,
} from '@dao-dao/types/contracts/Snip20Stake'
import { CHAIN_GAS_MULTIPLIER } from '@dao-dao/utils'

export interface Snip20StakeReadOnlyInterface {
  contractAddress: string
  stakedBalanceAtHeight: ({
    address,
    height,
  }: {
    address: string
    height?: number
  }) => Promise<StakedBalanceAtHeightResponse>
  totalStakedAtHeight: ({
    height,
  }: {
    height?: number
  }) => Promise<TotalStakedAtHeightResponse>
  stakedValue: ({
    address,
  }: {
    address: string
  }) => Promise<StakedValueResponse>
  totalValue: () => Promise<TotalValueResponse>
  getConfig: () => Promise<Config>
  claims: ({ address }: { address: string }) => Promise<ClaimsResponse>
  getHooks: () => Promise<GetHooksResponse>
  listStakers: ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }) => Promise<ListStakersResponse>
  ownership: () => Promise<OwnershipForAddr>
}
export class Snip20StakeQueryClient implements Snip20StakeReadOnlyInterface {
  client: CosmWasmClient
  contractAddress: string
  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client
    this.contractAddress = contractAddress
    this.stakedBalanceAtHeight = this.stakedBalanceAtHeight.bind(this)
    this.totalStakedAtHeight = this.totalStakedAtHeight.bind(this)
    this.stakedValue = this.stakedValue.bind(this)
    this.totalValue = this.totalValue.bind(this)
    this.getConfig = this.getConfig.bind(this)
    this.claims = this.claims.bind(this)
    this.getHooks = this.getHooks.bind(this)
    this.listStakers = this.listStakers.bind(this)
    this.ownership = this.ownership.bind(this)
  }
  stakedBalanceAtHeight = async ({
    address,
    height,
  }: {
    address: string
    height?: number
  }): Promise<StakedBalanceAtHeightResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      staked_balance_at_height: {
        address,
        height,
      },
    })
  }
  totalStakedAtHeight = async ({
    height,
  }: {
    height?: number
  }): Promise<TotalStakedAtHeightResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      total_staked_at_height: {
        height,
      },
    })
  }
  stakedValue = async ({
    address,
  }: {
    address: string
  }): Promise<StakedValueResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      staked_value: {
        address,
      },
    })
  }
  totalValue = async (): Promise<TotalValueResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      total_value: {},
    })
  }
  getConfig = async (): Promise<Config> => {
    return this.client.queryContractSmart(this.contractAddress, {
      get_config: {},
    })
  }
  claims = async ({
    address,
  }: {
    address: string
  }): Promise<ClaimsResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      claims: {
        address,
      },
    })
  }
  getHooks = async (): Promise<GetHooksResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      get_hooks: {},
    })
  }
  listStakers = async ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }): Promise<ListStakersResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      list_stakers: {
        limit,
        start_after: startAfter,
      },
    })
  }
  ownership = async (): Promise<OwnershipForAddr> => {
    return this.client.queryContractSmart(this.contractAddress, {
      ownership: {},
    })
  }
}
export interface Snip20StakeInterface extends Snip20StakeReadOnlyInterface {
  contractAddress: string
  sender: string
  receive: (
    {
      amount,
      msg,
      sender,
    }: {
      amount: Uint128
      msg: Binary
      sender: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  unstake: (
    {
      amount,
    }: {
      amount: Uint128
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  claim: (
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateConfig: (
    {
      duration,
    }: {
      duration?: Duration
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  addHook: (
    {
      addr,
    }: {
      addr: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  removeHook: (
    {
      addr,
    }: {
      addr: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateOwnership: (
    action: Action,
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
}
export class Snip20StakeClient
  extends Snip20StakeQueryClient
  implements Snip20StakeInterface
{
  client: SigningCosmWasmClient
  sender: string
  contractAddress: string
  constructor(
    client: SigningCosmWasmClient,
    sender: string,
    contractAddress: string
  ) {
    super(client, contractAddress)
    this.client = client
    this.sender = sender
    this.contractAddress = contractAddress
    this.receive = this.receive.bind(this)
    this.unstake = this.unstake.bind(this)
    this.claim = this.claim.bind(this)
    this.updateConfig = this.updateConfig.bind(this)
    this.addHook = this.addHook.bind(this)
    this.removeHook = this.removeHook.bind(this)
    this.updateOwnership = this.updateOwnership.bind(this)
  }
  receive = async (
    {
      amount,
      msg,
      sender,
    }: {
      amount: Uint128
      msg: Binary
      sender: string
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        receive: {
          amount,
          msg,
          sender,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  unstake = async (
    {
      amount,
    }: {
      amount: Uint128
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        unstake: {
          amount,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  claim = async (
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        claim: {},
      },
      fee,
      memo,
      _funds
    )
  }
  updateConfig = async (
    {
      duration,
    }: {
      duration?: Duration
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_config: {
          duration,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  addHook = async (
    {
      addr,
    }: {
      addr: string
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        add_hook: {
          addr,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  removeHook = async (
    {
      addr,
    }: {
      addr: string
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        remove_hook: {
          addr,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  updateOwnership = async (
    action: Action,
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_ownership: action,
      },
      fee,
      memo,
      _funds
    )
  }
}