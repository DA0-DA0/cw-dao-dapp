import { TFunction } from 'next-i18next'
import { ComponentType } from 'react'
import {
  FieldError,
  FieldErrors,
  FieldPath,
  FieldPathValue,
  FieldValues,
  FormState,
  UseFormGetValues,
  UseFormRegister,
  UseFormReturn,
  UseFormSetValue,
} from 'react-hook-form'

import { HugeDecimal } from '@dao-dao/math'

import { Account } from './account'
import { SupportedChainConfig, WithChainId } from './chain'
import { SecretModuleInstantiateInfo } from './clients'
import {
  DaoCardProps,
  DaoDropdownInfo,
  StatefulImportMultisigModalProps,
  SuspenseLoaderProps,
} from './components'
import {
  ActiveThreshold,
  ContractVersionInfo,
  DepositRefundPolicy,
  ModuleInstantiateInfo,
} from './contracts/common'
import {
  InstantiateMsg as DaoDaoCoreInstantiateMsg,
  ProposalModuleWithInfo,
} from './contracts/DaoDaoCore'
import { PreProposeSubmissionPolicy } from './contracts/DaoPreProposeSingle'
import { ProposalResponse as MultipleChoiceProposalResponse } from './contracts/DaoProposalMultiple'
import {
  ProposalResponse as SingleChoiceProposalResponse,
  VetoConfig,
} from './contracts/DaoProposalSingle.v2'
import {
  DistributionState,
  EmissionRate,
} from './contracts/DaoRewardsDistributor'
import { Config as NeutronCwdSubdaoTimelockSingleConfig } from './contracts/NeutronCwdSubdaoTimelockSingle'
import { VotingVault } from './contracts/NeutronVotingRegistry'
import { InstantiateMsg as SecretDaoDaoCoreInstantiateMsg } from './contracts/SecretDaoDaoCore'
import { DaoCreator } from './creators'
import { ContractVersion, SupportedFeatureMap } from './features'
import { LoadingDataWithError } from './misc'
import { ProposalVetoConfig } from './proposal'
import {
  PercentOrMajorityValue,
  ProposalModuleAdapter,
} from './proposal-module-adapter'
import { GenericToken, GenericTokenBalanceAndValue } from './token'
import { DurationWithUnits } from './units'
import { Widget } from './widgets'

/**
 * An object that represents a DAO across the app.
 *
 * If `coreVersion` is `ContractVersion.Gov`, then this DAO refers to a chain's
 * native x/gov module governance. The `coreAddress` should be set to the
 * configured `name` of the chain in the config, which is used in the URL to
 * link to this DAO's page.
 */
export type DaoInfo = {
  chainId: string
  coreAddress: string
  coreVersion: ContractVersion
  supportedFeatures: SupportedFeatureMap
  votingModuleAddress: string
  votingModuleInfo: ContractVersionInfo
  proposalModules: ProposalModuleInfo[]
  /**
   * Wasm contract-level admin that can migrate.
   */
  contractAdmin: string | null
  admin: string
  name: string
  description: string
  imageUrl: string
  created: number | null
  isActive: boolean
  activeThreshold: ActiveThreshold | null
  items: Record<string, string>
  // Map chain ID to polytone proxy address.
  polytoneProxies: PolytoneProxies
  accounts: Account[]
  parentDao: DaoParentInfo | null
}

export type DaoParentInfo = {
  chainId: string
  coreAddress: string
  coreVersion: ContractVersion
  name: string
  imageUrl: string
  admin: string
  parentDao: DaoParentInfo | null
  /**
   * If this parent is on a different chain from the SubDAO it's attached to,
   * this is the polytone proxy that is actually the admin of the SubDAO, on the
   * SubDAO's chain.
   */
  polytoneProxy: string | null

  /**
   * Whether or not this parent has registered its child as a SubDAO.
   */
  registeredSubDao: boolean
}

export type DaoSource = {
  chainId: string
  coreAddress: string
}

export enum PreProposeModuleType {
  /**
   * The normal 'pre-propose-single' or 'pre-propose-multiple' module.
   */
  Normal = 'normal',
  /**
   * The 'pre-propose-approval-single' or 'pre-propose-approval-multiple'
   * module.
   */
  Approval = 'approval',
  /**
   * The 'pre-propose-approver' module, attached to an approval pre-propose
   * module in another DAO.
   */
  Approver = 'approver',
  /**
   * Neutron fork SubDAOs use timelock.
   */
  NeutronSubdaoSingle = 'neutron_subdao_single',
  /**
   * Neutron fork DAO uses overrule pre-propose paired with SubDAO timelocks.
   */
  NeutronOverruleSingle = 'neutron_overrule_single',
  /**
   * An unrecognized pre-propose module.
   */
  Other = 'other',
}

export type PreProposeModuleApprovalConfig = {
  // If the approver is an approver contract, this is set to the DAO that the
  // approver contract is attached to. Otherwise, it is the approver directly.
  approver: string
  // If the approver is an approver contract, this is set, and the approver
  // above is set to the DAO address.
  preProposeApproverContract: string | null
}

export type PreProposeModuleApproverConfig = {
  /**
   * The DAO that needs approval from the approver.
   */
  approvalDao: string
  /**
   * The pre-propose approval contract attached to the proposal module in the
   * approval DAO.
   */
  preProposeApprovalContract: string
}

export type PreProposeModuleNeutronSubdaoSingleConfig = {
  timelockAddress: string
  timelockConfig: NeutronCwdSubdaoTimelockSingleConfig
}

export type PreProposeModuleTypedConfig =
  | {
      type: PreProposeModuleType.Normal
      config?: undefined
    }
  | {
      type: PreProposeModuleType.Approval
      config: PreProposeModuleApprovalConfig
    }
  | {
      type: PreProposeModuleType.Approver
      config: PreProposeModuleApproverConfig
    }
  | {
      type: PreProposeModuleType.NeutronSubdaoSingle
      config: PreProposeModuleNeutronSubdaoSingleConfig
    }
  | {
      type: PreProposeModuleType.NeutronOverruleSingle
      config?: undefined
    }
  | {
      type: PreProposeModuleType.Other
      config?: undefined
    }

export type PreProposeModule = {
  contractName: string
  version: ContractVersion
  address: string
  submissionPolicy: PreProposeSubmissionPolicy
} & PreProposeModuleTypedConfig

export enum ProposalModuleType {
  Single = 'single',
  Multiple = 'multiple',
  Other = 'other',
}

export type ProposalModuleSingleConfig = {
  veto: VetoConfig | null
}
export type ProposalModuleMultipleConfig = ProposalModuleSingleConfig

export type ProposalModuleTypedConfig =
  | {
      type: ProposalModuleType.Single
      config: ProposalModuleSingleConfig
    }
  | {
      type: ProposalModuleType.Multiple
      config: ProposalModuleMultipleConfig
    }
  | {
      type: ProposalModuleType.Other
      config?: undefined
    }

export type ProposalModuleInfo = {
  contractName: string
  version: ContractVersion
  address: string
  prefix: string
  // If set, this uses a pre-propose module.
  prePropose: PreProposeModule | null
} & ProposalModuleTypedConfig

export type ProposalPrefill<FormData> = {
  // Proposal module adapter ID
  id: string
  // Proposal module adapter proposal creation form data
  data: FormData
}

export type ProposalDraft<FormData = any> = {
  name: string
  createdAt: number
  lastUpdatedAt: number
  proposal: ProposalPrefill<FormData>
}

//! Create DAO

export type CreateDaoCustomValidator = (setNewErrors: boolean) => void

export interface CreateDaoContext<CreatorData extends FieldValues = any> {
  form: UseFormReturn<NewDao<CreatorData>>
  instantiateMsg:
    | DaoDaoCoreInstantiateMsg
    | SecretDaoDaoCoreInstantiateMsg
    | undefined
  instantiateMsgError: string | undefined
  commonVotingConfig: DaoCreationCommonVotingConfigItems
  availableCreators: readonly DaoCreator[]
  creator: DaoCreator
  proposalModuleDaoCreationAdapters: Required<ProposalModuleAdapter>['daoCreation'][]
  availableWidgets: readonly Widget[]
  predictedDaoAddress: LoadingDataWithError<string>
  setCustomValidator: (fn: CreateDaoCustomValidator) => void
  makeDefaultNewDao: (chainId: string) => NewDao
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
  ImportMultisigModal: ComponentType<StatefulImportMultisigModalProps>
}

export interface NewDao<
  CreatorData extends FieldValues = any,
  VotingConfig = any
> {
  uuid: string
  chainId: string
  name: string
  description: string
  imageUrl?: string
  bannerImageUrl?: string
  creator: {
    id: string
    data: CreatorData
  }
  proposalModuleAdapters: {
    id: string
    data: any
  }[]
  votingConfig: DaoCreationVotingConfig & VotingConfig
  advancedVotingConfigEnabled: boolean
  /**
   * Map widget ID to values for that widget. If null, it was added and then
   * deleted. Make optional for backwards compatibility with saved forms in
   * people's browsers.
   */
  widgets?: Record<string, Record<string, any> | null>
  /**
   * The DAO address that will be created based on the uuid when using
   * instantiate2. This is used when setting up extensions that need to know the
   * DAO address. When the factory that creates DAOs changes, the instantiate2
   * address changes. This field is used to reset the extensions when the
   * predicted address changes due to a factory change. This will likely never
   * happen as the factories never need to change, and will only be an edge case
   * due to cached data.
   */
  predictedDaoAddress?: string
}

export interface NewDaoTier {
  name: string
  weight: number
  members: NewDaoTierMember[]
  // For custom errors.
  _error?: undefined
}

export interface NewDaoTierMember {
  address: string
}

export interface DaoCreationGovernanceConfigInputProps<
  VotingModuleAdapterData extends FieldValues = any
> {
  data: VotingModuleAdapterData
  // Used within a voting module adapter, so it's safe to apply the data
  // generic.
  context: CreateDaoContext<VotingModuleAdapterData>
}

export interface DaoCreationGovernanceConfigReviewProps<
  VotingModuleAdapterData extends FieldValues = any
> {
  // Used within a voting module adapter, so it's safe to apply the data
  // generic.
  newDao: NewDao<VotingModuleAdapterData, VotingModuleAdapterData>
  data: VotingModuleAdapterData
}

export interface DaoCreationVotingConfigItemInputProps<
  ModuleData extends FieldValues = any
> {
  // Used within voting and proposal module adapters, so the data generic passed
  // in may not necessarily be the voting module adapter data. Must use `any`.
  newDao: NewDao<any, ModuleData>
  data: ModuleData
  register: UseFormRegister<ModuleData>
  setValue: UseFormSetValue<ModuleData>
  getValues: UseFormGetValues<ModuleData>
  watch: <TFieldName extends FieldPath<ModuleData>>(
    name: TFieldName,
    defaultValue?: FieldPathValue<ModuleData, TFieldName>
  ) => FieldPathValue<ModuleData, TFieldName>
  // Field name prefix in case the voting config item needs more advanced access
  // to the form.
  fieldNamePrefix: string
  errors?: FormState<ModuleData>['errors']
}

export interface DaoCreationVotingConfigItemReviewProps<
  ModuleData extends FieldValues = any
> {
  // Used within voting and proposal module adapters, so the data generic passed
  // in may not necessarily be the voting module adapter data. Must use `any`.
  newDao: NewDao<any, ModuleData>
  data: ModuleData
}

export interface DaoCreationVotingConfigItem<
  ModuleData extends FieldValues = any
> {
  // Used within voting and proposal module adapters, so the data generic passed
  // in may not necessarily be the voting module adapter data. Must use `any`.
  onlyDisplayCondition?: (newDao: NewDao<any, ModuleData>) => boolean
  Icon: ComponentType
  nameI18nKey: string
  descriptionI18nKey: string
  tooltipI18nKey?: string | ((data: ModuleData) => string)
  Input: ComponentType<DaoCreationVotingConfigItemInputProps<ModuleData>>
  getInputError: (errors?: FieldErrors<ModuleData>) => FieldError | undefined
  Review: ComponentType<DaoCreationVotingConfigItemReviewProps<ModuleData>>
}

export type DaoCreationCommonVotingConfigItems = {
  items: DaoCreationVotingConfigItem[]
  advancedItems: DaoCreationVotingConfigItem[]
}

export type DaoCreationGetInstantiateInfo<
  ModuleData extends FieldValues = any
> = (
  chainConfig: SupportedChainConfig,
  // Used within voting and proposal module adapters, so the data generic passed
  // in may not necessarily be the voting module adapter data. Must use `any`.
  newDao: NewDao<any, ModuleData>,
  data: DaoCreationVotingConfig & ModuleData,
  t: TFunction
) => ModuleInstantiateInfo | SecretModuleInstantiateInfo

export type DaoCreatedCardProps = Omit<
  DaoCardProps,
  'follow' | 'LinkWrapper' | 'IconButtonLink'
>

export type DaoCreationVotingConfigWithAllowRevoting = {
  allowRevoting: boolean
}

export type DaoCreationVotingConfigWithProposalDeposit = {
  proposalDeposit: {
    enabled: boolean
    amount: string
    // Token input fields.
    type: 'native' | 'cw20' | 'voting_module_token'
    denomOrAddress: string
    // Loaded from token input fields to access metadata.
    token?: GenericToken
    refundPolicy: DepositRefundPolicy
  }
}

export type DaoCreationVotingConfigWithProposalSubmissionPolicy = {
  anyoneCanPropose: boolean
}

export type DaoCreationVotingConfigWithQuorum = {
  quorum: PercentOrMajorityValue
}

export type DaoCreationVotingConfigWithVotingDuration = {
  votingDuration: DurationWithUnits
}

export type DaoCreationVotingConfigWithEnableMultipleChoice = {
  enableMultipleChoice: boolean
}

export type DaoCreationVotingConfigWithActiveThreshold = {
  activeThreshold: {
    enabled: boolean
    type: 'percent' | 'absolute'
    value: string
  }
}

export type DaoCreationVotingConfigWithApprover = {
  approver: {
    enabled: boolean
    address: string
  }
}

export type DaoCreationVotingConfigWithVeto = {
  veto: ProposalVetoConfig
}

export type DaoCreationVotingConfigWithProposalExecutionPolicy = {
  onlyMembersExecute: boolean
}

export type DaoCreationVotingConfig = DaoCreationVotingConfigWithAllowRevoting &
  DaoCreationVotingConfigWithProposalDeposit &
  DaoCreationVotingConfigWithProposalSubmissionPolicy &
  DaoCreationVotingConfigWithQuorum &
  DaoCreationVotingConfigWithVotingDuration &
  DaoCreationVotingConfigWithEnableMultipleChoice &
  DaoCreationVotingConfigWithApprover &
  DaoCreationVotingConfigWithVeto &
  DaoCreationVotingConfigWithProposalExecutionPolicy

//! Other

/**
 * Map chain ID to proxy address on that chain for this DAO.
 */
export type PolytoneProxies = Record<string, string>

export type DaoPayrollConfig = {
  type: string
  data?: Record<string, unknown>
}

// Built-in DAO tabs. These do not include widget tabs.
export enum DaoTabId {
  Home = 'home',
  Proposals = 'proposals',
  Treasury = 'treasury',
  SubDaos = 'subdaos',
  Members = 'members',
  Staked = 'staked',
  Collection = 'collection',
  Apps = 'apps',
  Vaults = 'vaults',
}

export type DaoTab = {
  /**
   * ID used in URL hash and uniquely identifies a selected DAO.
   */
  id: DaoTabId | string
  /**
   * Tab display name
   */
  label: string
  /**
   * Tab icon that shows up in the SDA sidebar.
   */
  Icon: ComponentType<{ className: string }>
  /**
   * Tab icon that shows up in the main DAO tabs.
   */
  IconFilled: ComponentType<{ className: string }>
  /**
   * Whether or not to load the tab only once selected. Defaults to false.
   */
  lazy?: boolean
}

export type DaoTabWithComponent = DaoTab & {
  Component: ComponentType
}

export enum DaoPageMode {
  Dapp = 'dapp',
  Sda = 'sda',
}

export type DaoWebSocketChannelInfo = {
  chainId: string
  coreAddress: string
}

export type DaoApp = {
  /**
   * App name.
   */
  name: string
  /**
   * Optional platform name to show above the app name dimmed.
   */
  platform?: string
  /**
   * Thumbnail image.
   */
  imageUrl: string
  /**
   * App URL.
   */
  url: string
}

export type IndexerDaoWithVetoableProposals = {
  dao: string
  proposalsWithModule: {
    proposalModule: ProposalModuleWithInfo
    proposals: (SingleChoiceProposalResponse | MultipleChoiceProposalResponse)[]
  }[]
}

export type DaoWithVetoableProposals = WithChainId<
  IndexerDaoWithVetoableProposals & {
    name: string
  }
>

export type DaoWithDropdownVetoableProposalList<T> = {
  dao: DaoDropdownInfo
  proposals: T[]
}

export type VotingVaultInfo =
  // Real vaults have bond tokens.
  | {
      /**
       * Whether or not this is a real vault. Real vaults have bonding, whereas
       * virtual vaults don't.
       */
      real: true
      /**
       * The token that will be used to bond.
       */
      bondToken: GenericToken
    }
  // Virtual vaults do not have bond tokens.
  | {
      /**
       * Whether or not this is a real vault. Real vaults have bonding, whereas
       * virtual vaults don't.
       */
      real: false
    }

export type VotingVaultWithInfo = VotingVault & {
  info: VotingVaultInfo
  totalPower: HugeDecimal
}

/**
 * A reward distributor contract for a DAO.
 */
export type DaoRewardDistributor = {
  /**
   * Unique ID for the reward distributor contract.
   */
  id: string
  /**
   * Address of the reward distributor contract.
   */
  address: string
}

/**
 * A reward distribution for a DAO, attached to a reward distributor contract.
 */
export type DaoRewardDistribution = {
  /**
   * Reward distributor chain ID.
   */
  chainId: string
  /**
   * Reward distributor contract address.
   */
  address: string
  /**
   * Token being distributed.
   */
  token: GenericToken
} & DistributionState

/**
 * A reward distribution with the remaining rewards to be distributed.
 */
export type DaoRewardDistributionWithRemaining = DaoRewardDistribution & {
  /**
   * Remaining rewards to be distributed.
   */
  remaining: HugeDecimal
}

/**
 * Pending DAO rewards for a recipient.
 */
export type PendingDaoRewards = {
  /**
   * Reward distributions with their pending rewards.
   */
  distributions: {
    /**
     * Reward distribution.
     */
    distribution: DaoRewardDistribution
    /**
     * Pending rewards for the distribution.
     */
    rewards: HugeDecimal
  }[]
  /**
   * Total pending rewards across all distributions, merged by token.
   */
  rewards: GenericTokenBalanceAndValue[]
}

/**
 * A reward distribution with v2.5.0 recovery information.
 */
export type DistributionWithV250RecoveryInfo = {
  /**
   * Distributor.
   */
  distributor: DaoRewardDistributor
  /**
   * Distribution.
   */
  distribution: DaoRewardDistribution
  /**
   * Distributed rewards that have not yet been claimed (i.e. pending /
   * claimable).
   */
  claimable: HugeDecimal
  /**
   * Undistributed rewards.
   */
  undistributed: HugeDecimal
}

/**
 * A token with its v2.5.0 recovery information aggregated over all reward
 * distributions.
 */
export type TokenWithV250RecoveryInfo = {
  /**
   * Distributor.
   */
  distributor: DaoRewardDistributor
  /**
   * Token.
   */
  token: GenericToken
  /**
   * Distributor contract balance.
   */
  balance: HugeDecimal
  /**
   * Distributed rewards that have not yet been claimed (i.e. pending /
   * claimable).
   */
  claimable: HugeDecimal
  /**
   * Undistributed rewards.
   */
  undistributed: HugeDecimal
  /**
   * Missed rewards.
   */
  missed: HugeDecimal
}

/**
 * v2.5.0 reward distributor recovery information.
 */
export type V250RewardDistributorRecoveryInfo = {
  /**
   * Aggregated recovery information for all reward distributors.
   */
  data: {
    /**
     * Distributor contract on v2.5.0.
     */
    distributor: DaoRewardDistributor
    /**
     * Reward distributions with their v2.5.0 recovery information.
     */
    distributions: DistributionWithV250RecoveryInfo[]
    /**
     * Tokens with their v2.5.0 recovery information aggregated over all reward
     * distributions.
     */
    tokens: TokenWithV250RecoveryInfo[]
  }[]
  /**
   * Which step the recovery is on.
   *
   * Step 1: All linearly emitting distributions are paused and undistributed
   * funds are withdrawn.
   *
   * Step 2: All distributor contracts are upgraded, the missed rewards are
   * force withdrawn, the distributions are re-funded with the missed rewards,
   * and all distributions are resumed. Optionally, the resumed distributions
   * can be re-funded.
   */
  step:
    | {
        step: 1
        /**
         * All linearly emitting distributions that need to be paused.
         */
        needsPause: DistributionWithV250RecoveryInfo[]
        /**
         * All distributions with undistributed funds.
         */
        needsWithdraw: DistributionWithV250RecoveryInfo[]
      }
    | {
        step: 2
        /**
         * All distributor contracts that need to be upgraded.
         */
        needsUpgrade: DaoRewardDistributor[]
        /**
         * All tokens with missed rewards.
         */
        needsForceWithdraw: TokenWithV250RecoveryInfo[]
        /**
         * Which distributions can be resumed.
         */
        canBeResumed: (DistributionWithV250RecoveryInfo & {
          /**
           * Emission rate of the distribution that will be resumed.
           */
          savedEmissionRate: EmissionRate
        })[]
      }
    | {
        step: 'done'
      }
}
