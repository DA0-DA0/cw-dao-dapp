import { Chain } from '@chain-registry/types'

import { HugeDecimal } from '@dao-dao/math'

import { Coin } from './contracts'
import { ContractVersion } from './features'
import { SkipChain } from './skip'
import { GenericToken, TokenType } from './token'

export type AnyChain = {
  chainId: string
  chainName: string
  bech32Prefix: string
  prettyName: string
  /**
   * Chain registry definition if exists.
   */
  chainRegistry?: Chain
  /**
   * Skip chain definition if fetched via Skip API.
   */
  skipChain?: SkipChain
}

export type IChainContext = {
  chainId: string
  chain: AnyChain
  // Chain may not have a native token.
  nativeToken?: GenericToken
  // If defined, this is a configured chain, which means it is supported (DAO
  // DAO is deployed on it) or it has a governance interface.
  base?: BaseChainConfig
  // If defined, this is a supported chain, which means DAO DAO is deployed.
  config?: SupportedChainConfig
}

// Require base chain config.
export type ConfiguredChainContext = Omit<IChainContext, 'base' | 'config'> & {
  config: BaseChainConfig
}

// Require supported chain config.
export type SupportedChainContext = Omit<ConfiguredChainContext, 'config'> & {
  config: SupportedChainConfig
}

export type Validator = {
  address: string
  moniker: string
  website: string
  details: string
  commission: number
  status: string
  tokens: HugeDecimal
}

export type Delegation = {
  validator: Validator
  delegated: Coin
  pendingReward: Coin
}

export type UnbondingDelegation = {
  validator: Validator
  balance: Coin
  startedAtHeight: number
  finishesAt: Date
}

export type NativeDelegationInfo = {
  delegations: Delegation[]
  unbondingDelegations: UnbondingDelegation[]
}

export enum ChainId {
  CosmosHubMainnet = 'cosmoshub-4',
  CosmosHubProviderTestnet = 'provider',
  JunoMainnet = 'juno-1',
  JunoTestnet = 'uni-6',
  OsmosisMainnet = 'osmosis-1',
  OsmosisTestnet = 'osmo-test-5',
  StargazeMainnet = 'stargaze-1',
  StargazeTestnet = 'elgafar-1',
  NeutronMainnet = 'neutron-1',
  NeutronTestnet = 'pion-1',
  TerraMainnet = 'phoenix-1',
  TerraClassicMainnet = 'columbus-5',
  MigalooMainnet = 'migaloo-1',
  MigalooTestnet = 'narwhal-2',
  NobleMainnet = 'noble-1',
  KujiraMainnet = 'kaiyo-1',
  KujiraTestnet = 'harpoon-4',
  ChihuahuaMainnet = 'chihuahua-1',
  OraichainMainnet = 'Oraichain',
  ArchwayMainnet = 'archway-1',
  InjectiveMainnet = 'injective-1',
  BitsongMainnet = 'bitsong-2b',
  BitsongTestnet = 'bobnet',
  OmniflixHubMainnet = 'omniflixhub-1',
  OmniflixHubTestnet = 'flixnet-4',
  SecretMainnet = 'secret-4',
  SecretTestnet = 'pulsar-3',
}

export type BaseChainConfig = {
  /**
   * Chain ID.
   */
  chainId: string
  /**
   * Unique name among chain configs with the same `mainnet` flag. This is used
   * to identify the chain in the native governance UI.
   */
  name: string
  /**
   * Whether or not this should be shown on the mainnet UI. If not, it will be
   * shown in the testnet UI.
   */
  mainnet: boolean
  /**
   * An accent color for using in the UI.
   */
  accentColor: string
  /**
   * Set to true if the chain does not support CosmWasm. If undefined, assumed
   * to be false.
   */
  noCosmWasm?: boolean
  /**
   * Set to true if the chain does not have a gov module so that it doesn't
   * appear in the gov UI. If undefined, assumed to be false.
   */
  noGov?: boolean
  /**
   * Chain explorer URL templates for various external links.
   */
  explorerUrlTemplates?: {
    tx?: string
    gov?: string
    govProp?: string
    wallet?: string
  }
  /**
   * If defined, overrides the default chain image.
   */
  overrideChainImageUrl?: string
}

export type ConfiguredChain = BaseChainConfig & {
  /**
   * Chain info.
   */
  chain: AnyChain
}

export type SupportedChainConfig = Omit<BaseChainConfig, 'chainId'> & {
  /**
   * Chain ID.
   */
  chainId: string
  /**
   * The `cw-admin-factory` contract address that instantiates contracts with
   * themselves set as their admin.
   * https://github.com/DA0-DA0/dao-contracts/tree/development/contracts/external/cw-admin-factory
   */
  factoryContractAddress: string
  /**
   * If defined, it means Kado supports fiat deposit on this chain.
   */
  kado?: {
    /**
     * The Kado network identifier.
     */
    network: string
  }
  /**
   * Map DAO creator ID to whether or not it's disabled and for what reason. If
   * not present, enabled.
   */
  daoCreatorDisabled?: Partial<
    Record<string, 'underDevelopment' | 'unsupported'>
  >
  /**
   * Active (latest) version of the code IDs.
   */
  latestVersion: ContractVersion
  /**
   * Active (latest) code IDs.
   */
  codeIds: CodeIdConfig
  /**
   * All deployed versions of the code IDs on this chain.
   */
  allCodeIds: Partial<Record<ContractVersion, Partial<CodeIdConfig>>>
  /**
   * Active (latest) code hashes. Only used by Secret Network.
   */
  codeHashes?: CodeHashConfig
  /**
   * All deployed versions of the code hashes on this chain.
   */
  allCodeHashes?: Partial<Record<ContractVersion, Partial<CodeHashConfig>>>
  /**
   * Whether to create token DAOs with native tokens (including tokenfactory),
   * CW20s, or both. Defaults to native tokens.
   */
  tokenDaoType?: TokenType.Native | TokenType.Cw20 | 'both'
  /**
   * Disallow creating new tokens for token-based DAOs and show a tooltip that
   * token creation is under development. Defaults to false.
   */
  tokenCreationUnderDevelopment?: boolean
  /**
   * Disallow creating new tokens for token-based DAOs and show a tooltip that
   * token creation is disabled due to the lack of token factory. Defaults to
   * false.
   */
  noTokenFactory?: boolean
  /**
   * Token creation factory address to use during DAO creation.
   */
  tokenCreationFactoryAddress?: string
  /**
   * Whether or not to create a DAO through chain governance.
   */
  createViaGovernance?: boolean
  /**
   * Whether or not this chain supports instantiate2 for creating DAOs with
   * extensions setup.
   */
  noInstantiate2Create?: boolean
  /**
   * Whether or not this chain has an indexer.
   */
  noIndexer?: boolean
  /**
   * If this chain uses a DAO as its chain governance instead of x/gov, set this
   * to the DAO's address.
   */
  govContractAddress?: string
  /**
   * SubDAOs to display with this chain's native governance.
   *
   * These should be legitimate SubDAOs with the chain governance module set as
   * their admin. This is necessray because chains cannot recognize SubDAOs as
   * they are not DAO contracts, and we need to establish which SubDAOs of a DAO
   * are legitimate for safety.
   */
  subDaos?: string[]
  /**
   * Polytone connections to other chains from this chain.
   */
  polytone?: PolytoneConfig
  /**
   * Timewave's Valence config.
   */
  valence?: {
    /**
     * Address of services manager contract.
     */
    servicesManager: string
    /**
     * Address of rebalancer contract.
     */
    rebalancer: string
  }
}

export type SupportedChain = SupportedChainConfig & {
  chain: AnyChain
}

export type CodeIdConfig = {
  // https://github.com/CosmWasm/cw-plus
  Cw1Whitelist: number
  Cw4Group: number
  // https://github.com/CosmWasm/cw-nfts
  Cw721Base?: number

  // https://github.com/DA0-DA0/dao-contracts
  CwPayrollFactory: number
  CwTokenSwap: number
  CwTokenfactoryIssuer: number
  CwVesting: number
  DaoDaoCore: number
  DaoPreProposeApprovalSingle: number
  DaoPreProposeApprover: number
  DaoPreProposeMultiple: number
  DaoPreProposeSingle: number
  DaoProposalMultiple: number
  DaoProposalSingle: number
  DaoRewardsDistributor: number
  DaoVoteDelegation: number
  DaoVotingCw4: number
  DaoVotingCw721Staked: number
  DaoVotingTokenStaked: number

  // For Secret Network
  QueryAuth?: number

  // For OmniFlix
  DaoVotingOnftStaked?: number

  // For migrating v1 to v2 DAOs, and some chains use CW20s.
  Cw20Base?: number
  Cw20Stake?: number
  DaoVotingCw20Staked?: number

  // Valence
  ValenceAccount?: number
}

export type CodeHashConfig = {
  [K in keyof CodeIdConfig]: string
}

export type PolytoneConnection = {
  // Contract address of note on the local/current chain.
  note: string
  // Contract address of the note's listener on the local/current chain.
  listener: string
  // Contract address of the note's voice on the remote chain.
  voice: string
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
  needsSelfRelay?: boolean
}

// Map chain ID to polytone connection information.
export type PolytoneConfig = Record<string, PolytoneConnection>

export type WithChainId<T> = T & {
  chainId: string
}

export type DecodedStargateMsg<Value = any> = {
  stargate: {
    typeUrl: string
    value: Value
  }
}

/**
 * Function that creates a cw1-whitelist contract. Used in the
 * `useCreateCw1Whitelist` hook.
 */
export type CreateCw1Whitelist = (
  admins: string[],
  mutable?: boolean
) => Promise<string | undefined>

export type ValidatorSlash = {
  registeredBlockHeight: string
  registeredBlockTimeUnixMs: string
  infractionBlockHeight: string
  // Slash fraction applied to validator's undelegating and redelegating tokens.
  slashFactor: string
  amountSlashed: string
  // Slash fraction applied to validator's current delegations. It may be less
  // than `slashFactor`.
  effectiveFraction: string
  // Amount of tokens slashed from delegations. This should be `amountSlashed`
  // minus the amount slashed from the validator's undelegating and redelegating
  // tokens.
  stakedTokensBurned: string
}
