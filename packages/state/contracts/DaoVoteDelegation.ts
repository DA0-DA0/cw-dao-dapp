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
  ArrayOfAddr,
  Decimal,
  DelegatesResponse,
  DelegationsResponse,
  InfoResponse,
  MemberDiff,
  NftStakeChangedHookMsg,
  OptionalUpdateForDecimal,
  OptionalUpdateForUint64,
  RegistrationResponse,
  StakeChangedHookMsg,
  UnvotedDelegatedVotingPowerResponse,
  VoteHookMsg,
} from '@dao-dao/types/contracts/DaoVoteDelegation'
import { CHAIN_GAS_MULTIPLIER } from '@dao-dao/utils'

export interface DaoVoteDelegationReadOnlyInterface {
  contractAddress: string
  info: () => Promise<InfoResponse>
  registration: ({
    delegate,
    height,
  }: {
    delegate: string
    height?: number
  }) => Promise<RegistrationResponse>
  delegates: ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }) => Promise<DelegatesResponse>
  delegations: ({
    delegator,
    height,
    limit,
    offset,
  }: {
    delegator: string
    height?: number
    limit?: number
    offset?: number
  }) => Promise<DelegationsResponse>
  unvotedDelegatedVotingPower: ({
    delegate,
    height,
    proposalId,
    proposalModule,
  }: {
    delegate: string
    height: number
    proposalId: number
    proposalModule: string
  }) => Promise<UnvotedDelegatedVotingPowerResponse>
  proposalModules: ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }) => Promise<ArrayOfAddr>
  votingPowerHookCallers: ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }) => Promise<ArrayOfAddr>
}
export class DaoVoteDelegationQueryClient
  implements DaoVoteDelegationReadOnlyInterface
{
  client: CosmWasmClient
  contractAddress: string
  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client
    this.contractAddress = contractAddress
    this.info = this.info.bind(this)
    this.registration = this.registration.bind(this)
    this.delegates = this.delegates.bind(this)
    this.delegations = this.delegations.bind(this)
    this.unvotedDelegatedVotingPower =
      this.unvotedDelegatedVotingPower.bind(this)
    this.proposalModules = this.proposalModules.bind(this)
    this.votingPowerHookCallers = this.votingPowerHookCallers.bind(this)
  }
  info = async (): Promise<InfoResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      info: {},
    })
  }
  registration = async ({
    delegate,
    height,
  }: {
    delegate: string
    height?: number
  }): Promise<RegistrationResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      registration: {
        delegate,
        height,
      },
    })
  }
  delegates = async ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }): Promise<DelegatesResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      delegates: {
        limit,
        start_after: startAfter,
      },
    })
  }
  delegations = async ({
    delegator,
    height,
    limit,
    offset,
  }: {
    delegator: string
    height?: number
    limit?: number
    offset?: number
  }): Promise<DelegationsResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      delegations: {
        delegator,
        height,
        limit,
        offset,
      },
    })
  }
  unvotedDelegatedVotingPower = async ({
    delegate,
    height,
    proposalId,
    proposalModule,
  }: {
    delegate: string
    height: number
    proposalId: number
    proposalModule: string
  }): Promise<UnvotedDelegatedVotingPowerResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      unvoted_delegated_voting_power: {
        delegate,
        height,
        proposal_id: proposalId,
        proposal_module: proposalModule,
      },
    })
  }
  proposalModules = async ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }): Promise<ArrayOfAddr> => {
    return this.client.queryContractSmart(this.contractAddress, {
      proposal_modules: {
        limit,
        start_after: startAfter,
      },
    })
  }
  votingPowerHookCallers = async ({
    limit,
    startAfter,
  }: {
    limit?: number
    startAfter?: string
  }): Promise<ArrayOfAddr> => {
    return this.client.queryContractSmart(this.contractAddress, {
      voting_power_hook_callers: {
        limit,
        start_after: startAfter,
      },
    })
  }
}
export interface DaoVoteDelegationInterface
  extends DaoVoteDelegationReadOnlyInterface {
  contractAddress: string
  sender: string
  register: (
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  unregister: (
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  delegate: (
    {
      delegate,
      percent,
    }: {
      delegate: string
      percent: Decimal
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  undelegate: (
    {
      delegate,
    }: {
      delegate: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateVotingPowerHookCallers: (
    {
      add,
      remove,
    }: {
      add?: string[]
      remove?: string[]
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  syncProposalModules: (
    {
      limit,
      startAfter,
    }: {
      limit?: number
      startAfter?: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateConfig: (
    {
      delegationValidityBlocks,
      vpCapPercent,
    }: {
      delegationValidityBlocks: OptionalUpdateForUint64
      vpCapPercent: OptionalUpdateForDecimal
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  memberChangedHook: (
    {
      diffs,
    }: {
      diffs: MemberDiff[]
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  nftStakeChangeHook: (
    nftStakeChangedHookMsg: NftStakeChangedHookMsg,
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  stakeChangeHook: (
    stakeChangedHookMsg: StakeChangedHookMsg,
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
  voteHook: (
    voteHookMsg: VoteHookMsg,
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
}
export class DaoVoteDelegationClient
  extends DaoVoteDelegationQueryClient
  implements DaoVoteDelegationInterface
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
    this.register = this.register.bind(this)
    this.unregister = this.unregister.bind(this)
    this.delegate = this.delegate.bind(this)
    this.undelegate = this.undelegate.bind(this)
    this.updateVotingPowerHookCallers =
      this.updateVotingPowerHookCallers.bind(this)
    this.syncProposalModules = this.syncProposalModules.bind(this)
    this.updateConfig = this.updateConfig.bind(this)
    this.memberChangedHook = this.memberChangedHook.bind(this)
    this.nftStakeChangeHook = this.nftStakeChangeHook.bind(this)
    this.stakeChangeHook = this.stakeChangeHook.bind(this)
    this.voteHook = this.voteHook.bind(this)
  }
  register = async (
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        register: {},
      },
      fee,
      memo,
      _funds
    )
  }
  unregister = async (
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        unregister: {},
      },
      fee,
      memo,
      _funds
    )
  }
  delegate = async (
    {
      delegate,
      percent,
    }: {
      delegate: string
      percent: Decimal
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        delegate: {
          delegate,
          percent,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  undelegate = async (
    {
      delegate,
    }: {
      delegate: string
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        undelegate: {
          delegate,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  updateVotingPowerHookCallers = async (
    {
      add,
      remove,
    }: {
      add?: string[]
      remove?: string[]
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_voting_power_hook_callers: {
          add,
          remove,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  syncProposalModules = async (
    {
      limit,
      startAfter,
    }: {
      limit?: number
      startAfter?: string
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        sync_proposal_modules: {
          limit,
          start_after: startAfter,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  updateConfig = async (
    {
      delegationValidityBlocks,
      vpCapPercent,
    }: {
      delegationValidityBlocks: OptionalUpdateForUint64
      vpCapPercent: OptionalUpdateForDecimal
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
          delegation_validity_blocks: delegationValidityBlocks,
          vp_cap_percent: vpCapPercent,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  memberChangedHook = async (
    {
      diffs,
    }: {
      diffs: MemberDiff[]
    },
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        member_changed_hook: {
          diffs,
        },
      },
      fee,
      memo,
      _funds
    )
  }
  nftStakeChangeHook = async (
    nftStakeChangedHookMsg: NftStakeChangedHookMsg,
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        nft_stake_change_hook: nftStakeChangedHookMsg,
      },
      fee,
      memo,
      _funds
    )
  }
  stakeChangeHook = async (
    stakeChangedHookMsg: StakeChangedHookMsg,
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        stake_change_hook: stakeChangedHookMsg,
      },
      fee,
      memo,
      _funds
    )
  }
  voteHook = async (
    voteHookMsg: VoteHookMsg,
    fee: number | StdFee | 'auto' = CHAIN_GAS_MULTIPLIER,
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        vote_hook: voteHookMsg,
      },
      fee,
      memo,
      _funds
    )
  }
}
