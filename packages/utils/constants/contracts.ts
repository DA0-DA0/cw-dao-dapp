// These are all used elsewhere in the codebase.
export enum ContractName {
  Cw1Whitelist = 'crates.io:cw1-whitelist',
  Cw3FixedMultisig = 'crates.io:cw3-fixed-multisig',
  Cw3FlexMultisig = 'crates.io:cw3-flex-multisig',
  CwTokenSwap = 'crates.io:cw-token-swap',
  // This contract left out the `crates.io:` prefix.
  CwTokenfactoryIssuer = 'cw-tokenfactory-issuer',
  DaoProposalSingle = 'crates.io:dao-proposal-single',
  DaoVotingCw4 = 'crates.io:dao-voting-cw4',
  DaoVotingTokenStaked = 'crates.io:dao-voting-token-staked',
  PolytoneProxy = 'crates.io:polytone-proxy',
  PreProposeSingle = 'crates.io:dao-pre-propose-single',
  PreProposeMultiple = 'crates.io:dao-pre-propose-multiple',
  PreProposeApprovalSingle = 'crates.io:dao-pre-propose-approval-single',
  PreProposeApprovalMultiple = 'crates.io:dao-pre-propose-approval-multiple',
  PreProposeApprover = 'crates.io:dao-pre-propose-approver',
  NeutronCwdSubdaoCore = 'crates.io:cwd-subdao-core',
  NeutronCwdSubdaoPreProposeSingle = 'crates.io:cwd-subdao-pre-propose-single',
  NeutronCwdSubdaoTimelockSingle = 'crates.io:cwd-subdao-timelock-single',
  NeutronCwdPreProposeSingleOverrule = 'crates.io:cwd-pre-propose-single-overrule',
  // https://github.com/oraichain/cw20-staking/tree/master/contracts/proxy-snapshot
  OraichainCw20StakingProxySnapshot = 'cw20-staking-proxy-snapshot',
  ValenceAccount = 'crates.io:valence-account',
}

export const NEUTRON_SUBDAO_CORE_CONTRACT_NAMES = [
  ContractName.NeutronCwdSubdaoCore,
]

export const DAO_CORE_CONTRACT_NAMES = [
  // V1
  'crates.io:cw-core',
  // V2+
  'crates.io:cwd-core',
  'crates.io:dao-core',
  'crates.io:dao-dao-core',
  // Neutron
  ...NEUTRON_SUBDAO_CORE_CONTRACT_NAMES,
]

export const LEGACY_DAO_CONTRACT_NAMES = [
  'crates.io:sg_dao',
  'crates.io:cw3_dao',
]

export const DAO_VOTING_CW20_STAKED_CONTRACT_NAMES = [
  // V1
  'crates.io:cw20-staked-balance-voting',
  // V2+
  'crates.io:cwd-voting-cw20-staked',
  'crates.io:dao-voting-cw20-staked',

  // Secret
  'crates.io:dao-voting-snip20-staked',
]

export const DAO_VOTING_CW4_CONTRACT_NAMES = [
  // V1
  'crates.io:cw4-voting',
  // V2
  'crates.io:cwd-voting-cw4',
  ContractName.DaoVotingCw4,
]

export const DAO_VOTING_CW721_STAKED_CONTRACT_NAMES = [
  // V2+
  'crates.io:dao-voting-cw721-staked',

  // Secret
  'crates.io:dao-voting-snip721-staked',
]

export const DAO_VOTING_ONFT_STAKED_CONTRACT_NAMES = [
  'crates.io:dao-voting-onft-staked',
]

export const DAO_VOTING_SG_COMMUNITY_NFT_CONTRACT_NAMES = [
  'crates.io:dao-voting-sg-community-nft',
]

export const DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES = [
  ContractName.DaoVotingTokenStaked,
]

export const NEUTRON_VOTING_REGISTRY_CONTRACT_NAMES = [
  'crates.io:neutron-voting-registry',
]

export const DAO_PRE_PROPOSE_SINGLE_CONTRACT_NAMES = [
  ContractName.PreProposeSingle,
  // Neutron
  'crates.io:cwd-subdao-pre-propose-single',
]

export const DAO_PROPOSAL_SINGLE_CONTRACT_NAMES = [
  // V1
  'crates.io:cw-govmod-single',
  'crates.io:cw-proposal-single',
  // V2+
  'crates.io:cwd-proposal-single',
  ContractName.DaoProposalSingle,
  // Neutron
  'crates.io:cwd-subdao-proposal-single',
]

export const DAO_PRE_PROPOSE_MULTIPLE_CONTRACT_NAMES = [
  ContractName.PreProposeMultiple,
]

export const DAO_PROPOSAL_MULTIPLE_CONTRACT_NAMES = [
  // V1 (Neutron's modified contracts)
  'crates.io:cwd-proposal-multiple',
  // V2+ (DAO DAO has only used on V2+ contracts)
  'crates.io:dao-proposal-multiple',
]

export const DAO_VOTING_NATIVE_STAKED_CONTRACT_NAMES = [
  // V1
  'crates.io:cw-native-staked-balance-voting',
  // V2+
  'crates.io:cwd-voting-native-staked',
  'crates.io:dao-voting-native-staked',
]
