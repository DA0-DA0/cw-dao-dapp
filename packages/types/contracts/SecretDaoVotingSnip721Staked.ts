/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

export type ActiveThreshold =
  | {
      absolute_count: {
        count: Uint128
      }
    }
  | {
      percentage: {
        percent: Decimal
      }
    }
export type Uint128 = string
export type Decimal = string
export type NftContract =
  | {
      existing: {
        address: string
        code_hash: string
      }
    }
  | {
      new: {
        code_hash: string
        code_id: number
        initial_nfts: Binary[]
        label: string
        msg: Binary
      }
    }
  | {
      factory: Binary
    }
export type Binary = string
export type Duration =
  | {
      height: number
    }
  | {
      time: number
    }
export interface InstantiateMsg {
  active_threshold?: ActiveThreshold | null
  dao_code_hash: string
  nft_contract: NftContract
  query_auth?: RawContract | null
  unstaking_duration?: Duration | null
}
export interface RawContract {
  address: string
  code_hash: string
}
export type ExecuteMsg =
  | {
      receive_nft: {
        msg?: Binary | null
        sender: Addr
        token_id: string
      }
    }
  | {
      unstake: {
        token_ids: string[]
      }
    }
  | {
      claim_nfts: {}
    }
  | {
      update_config: {
        duration?: Duration | null
      }
    }
  | {
      add_hook: {
        addr: string
        code_hash: string
      }
    }
  | {
      remove_hook: {
        addr: string
        code_hash: string
      }
    }
  | {
      update_active_threshold: {
        new_threshold?: ActiveThreshold | null
      }
    }
export type Addr = string
export type QueryMsg =
  | {
      config: {}
    }
  | {
      nft_claims: {
        auth: Auth
      }
    }
  | {
      hooks: {}
    }
  | {
      staked_nfts: {
        auth: Auth
      }
    }
  | {
      active_threshold: {}
    }
  | {
      is_active: {}
    }
  | {
      voting_power_at_height: {
        auth: Auth
        height?: number | null
      }
    }
  | {
      total_power_at_height: {
        height?: number | null
      }
    }
  | {
      dao: {}
    }
  | {
      info: {}
    }
export type Auth =
  | {
      viewing_key: {
        address: string
        key: string
      }
    }
  | {
      permit: PermitForPermitData
    }
export interface PermitForPermitData {
  account_number?: Uint128 | null
  chain_id?: string | null
  memo?: string | null
  params: PermitData
  sequence?: Uint128 | null
  signature: PermitSignature
}
export interface PermitData {
  data: Binary
  key: string
}
export interface PermitSignature {
  pub_key: PubKey
  signature: Binary
}
export interface PubKey {
  type: string
  value: Binary
}
export interface ActiveThresholdResponse {
  active_threshold?: ActiveThreshold | null
}
export interface Config {
  nft_address: Addr
  nft_code_hash: string
  query_auth: Contract
  unstaking_duration?: Duration | null
}
export interface Contract {
  address: Addr
  code_hash: string
}
export interface AnyContractInfo {
  addr: Addr
  code_hash: string
}
export interface HooksResponse {
  hooks: HookItem[]
}
export interface HookItem {
  addr: Addr
  code_hash: string
}
export interface InfoResponse {
  info: ContractVersion
}
export interface ContractVersion {
  contract: string
  version: string
}
export type Boolean = boolean
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
export type Timestamp = Uint64
export type Uint64 = string
export interface NftClaimsResponse {
  nft_claims: NftClaim[]
}
export interface NftClaim {
  release_at: Expiration
  token_id: string
}
export type ArrayOfString = string[]
export interface TotalPowerAtHeightResponse {
  height: number
  power: Uint128
}
export interface VotingPowerAtHeightResponse {
  height: number
  power: Uint128
}