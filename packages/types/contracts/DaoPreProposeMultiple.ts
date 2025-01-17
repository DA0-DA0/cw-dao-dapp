/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

export type Uint128 = string
export type DepositToken =
  | {
      token: {
        denom: UncheckedDenom
      }
    }
  | {
      voting_module_token: {
        token_type: VotingModuleTokenType
      }
    }
export type UncheckedDenom =
  | {
      native: string
    }
  | {
      cw20: string
    }
export type VotingModuleTokenType = 'native' | 'cw20'
export type DepositRefundPolicy = 'always' | 'only_passed' | 'never'
export type PreProposeSubmissionPolicy =
  | {
      anyone: {
        denylist: string[]
      }
    }
  | {
      specific: {
        allowlist: string[]
        dao_members: boolean
        denylist: string[]
      }
    }
export interface InstantiateMsg {
  deposit_info?: UncheckedDepositInfo | null
  extension: Empty
  /**
   * < v2.5.0
   */
  open_proposal_submission?: boolean
  /**
   * >= v2.5.0
   */
  submission_policy?: PreProposeSubmissionPolicy
}
export interface UncheckedDepositInfo {
  amount: Uint128
  denom: DepositToken
  refund_policy: DepositRefundPolicy
}
export interface Empty {}
export type ExecuteMsg =
  | {
      propose: {
        msg: ProposeMessage
      }
    }
  | {
      update_config: {
        deposit_info?: UncheckedDepositInfo | null
        /**
         * < v2.5.0
         */
        open_proposal_submission?: boolean
        /**
         * >= v2.5.0
         */
        submission_policy?: PreProposeSubmissionPolicy | null
      }
    }
  | {
      update_submission_policy: {
        allowlist_add?: string[] | null
        allowlist_remove?: string[] | null
        denylist_add?: string[] | null
        denylist_remove?: string[] | null
        set_dao_members?: boolean | null
      }
    }
  | {
      withdraw: {
        denom?: UncheckedDenom | null
      }
    }
  | {
      extension: {
        msg: Empty
      }
    }
  | {
      add_proposal_submitted_hook: {
        address: string
      }
    }
  | {
      remove_proposal_submitted_hook: {
        address: string
      }
    }
  | {
      proposal_completed_hook: {
        new_status: Status
        proposal_id: number
      }
    }
export type ProposeMessage = {
  propose: {
    choices: MultipleChoiceOptions
    description: string
    title: string
    vote?: MultipleChoiceAutoVote | null
  }
}
export type CosmosMsgForEmpty =
  | {
      bank: BankMsg
    }
  | {
      custom: Empty
    }
  | {
      staking: StakingMsg
    }
  | {
      distribution: DistributionMsg
    }
  | {
      stargate: {
        type_url: string
        value: Binary
      }
    }
  | {
      ibc: IbcMsg
    }
  | {
      wasm: WasmMsg
    }
  | {
      gov: GovMsg
    }
export type BankMsg =
  | {
      send: {
        amount: Coin[]
        to_address: string
      }
    }
  | {
      burn: {
        amount: Coin[]
      }
    }
export type StakingMsg =
  | {
      delegate: {
        amount: Coin
        validator: string
      }
    }
  | {
      undelegate: {
        amount: Coin
        validator: string
      }
    }
  | {
      redelegate: {
        amount: Coin
        dst_validator: string
        src_validator: string
      }
    }
export type DistributionMsg =
  | {
      set_withdraw_address: {
        address: string
      }
    }
  | {
      withdraw_delegator_reward: {
        validator: string
      }
    }
export type Binary = string
export type IbcMsg =
  | {
      transfer: {
        amount: Coin
        channel_id: string
        timeout: IbcTimeout
        to_address: string
      }
    }
  | {
      send_packet: {
        channel_id: string
        data: Binary
        timeout: IbcTimeout
      }
    }
  | {
      close_channel: {
        channel_id: string
      }
    }
export type Timestamp = Uint64
export type Uint64 = string
export type WasmMsg =
  | {
      execute: {
        contract_addr: string
        funds: Coin[]
        msg: Binary
      }
    }
  | {
      instantiate: {
        admin?: string | null
        code_id: number
        funds: Coin[]
        label: string
        msg: Binary
      }
    }
  | {
      migrate: {
        contract_addr: string
        msg: Binary
        new_code_id: number
      }
    }
  | {
      update_admin: {
        admin: string
        contract_addr: string
      }
    }
  | {
      clear_admin: {
        contract_addr: string
      }
    }
export type GovMsg = {
  vote: {
    proposal_id: number
    vote: VoteOption
  }
}
export type VoteOption = 'yes' | 'no' | 'abstain' | 'no_with_veto'
export type Status =
  | 'open'
  | 'rejected'
  | 'passed'
  | 'executed'
  | 'closed'
  | 'execution_failed'
  | {
      veto_timelock: {
        expiration: Expiration
      }
    }
  | 'vetoed'
export type Expiration =
  | {
      at_height: number
    }
  | {
      at_time: Timestamp
    }
  | {
      never: {}
    }
export interface MultipleChoiceOptions {
  options: MultipleChoiceOption[]
}
export interface MultipleChoiceOption {
  description: string
  msgs: CosmosMsgForEmpty[]
  title: string
}
export interface Coin {
  amount: Uint128
  denom: string
}
export interface IbcTimeout {
  block?: IbcTimeoutBlock | null
  timestamp?: Timestamp | null
}
export interface IbcTimeoutBlock {
  height: number
  revision: number
}
export interface MultipleChoiceAutoVote {
  rationale?: string | null
  vote: MultipleChoiceVote
}
export interface MultipleChoiceVote {
  option_id: number
}
export type QueryMsg =
  | {
      proposal_module: {}
    }
  | {
      dao: {}
    }
  | {
      config: {}
    }
  | {
      deposit_info: {
        proposal_id: number
      }
    }
  | {
      can_propose: {
        address: string
      }
    }
  | {
      proposal_submitted_hooks: {}
    }
  | {
      query_extension: {
        msg: Empty
      }
    }
export type Boolean = boolean
export type CheckedDenom =
  | {
      native: string
    }
  | {
      cw20: Addr
    }
export type Addr = string
export interface Config {
  deposit_info?: CheckedDepositInfo | null
  /**
   * < v2.5.0
   */
  open_proposal_submission?: boolean
  /**
   * >= v2.5.0
   */
  submission_policy?: PreProposeSubmissionPolicy
}
export interface CheckedDepositInfo {
  amount: Uint128
  denom: CheckedDenom
  refund_policy: DepositRefundPolicy
}
export interface DepositInfoResponse {
  deposit_info?: CheckedDepositInfo | null
  proposer: Addr
}
export interface HooksResponse {
  hooks: string[]
}
