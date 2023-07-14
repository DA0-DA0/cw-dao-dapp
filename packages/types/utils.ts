export enum ProcessedTQType {
  Majority,
  Absolute,
  Percent,
}

export type ProcessedTQ = { display: string } & (
  | { type: ProcessedTQType.Majority }
  | { type: ProcessedTQType.Absolute | ProcessedTQType.Percent; value: number }
)

export type ProcessedThresholdQuorum = {
  threshold: ProcessedTQ
  quorum?: ProcessedTQ
}

export type ProcessedQuorum = {
  quorum: ProcessedTQ
}

export interface CodeIdConfig {
  // https://github.com/CosmWasm/cw-plus
  Cw20Base: number
  Cw4Group: number
  // https://github.com/CosmWasm/cw-nfts
  Cw721Base: number

  // https://github.com/DA0-DA0/dao-contracts
  Cw20Stake: number
  CwAdminFactory: number
  CwPayrollFactory: number
  CwTokenSwap: number
  CwVesting: number
  DaoCore: number
  DaoMigrator: number
  DaoPreProposeMultiple: number
  DaoPreProposeSingle: number
  DaoProposalMultiple: number
  DaoProposalSingle: number
  DaoVotingCw20Staked: number
  DaoVotingCw4: number
  DaoVotingCw721Staked: number
  DaoVotingNativeStaked: number
}

export type PolytoneNote = {
  // Contract address of note on the local/current chain.
  note: string
  // Contract address of the note's listener on the local/current chain.
  listener: string
  // IBC connection IDs
  localConnection: string
  remoteConnection: string
  // IBC channel IDs
  localChannel: string
  remoteChannel: string
  // Whether or not the user needs to self-relay an execution. This should be
  // true if no relayers are running on the established connection. If using an
  // existing active connection, the relayers will automatically perform the
  // relay.
  needsSelfRelay: boolean
}

// Map chain ID to polytone note that speaks with that chain.
export type PolytoneNotes = Record<string, PolytoneNote>

export type ParametersExceptFirst<F> = F extends (
  arg0: any,
  ...rest: infer R
) => any
  ? R
  : never

export type DecodedStargateMsg<Value = any> = {
  stargate: {
    typeUrl: string
    value: Value
  }
}
