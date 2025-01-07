// eslint-disable-next-line regex/invalid
import { QueryClient } from '@tanstack/react-query'
import { ComponentType, ReactNode } from 'react'
import { FieldErrors } from 'react-hook-form'
import { TFunction } from 'react-i18next'

import { Account } from './account'
import {
  AnyChain,
  ConfiguredChainContext,
  IChainContext,
  SupportedChainContext,
} from './chain'
import { IDaoBase, IProposalModuleBase } from './clients'
import { UnifiedCosmosMsg } from './contracts/common'
import { AllGovParams } from './gov'
import { UnifiedProfile } from './profile'
import { DecodedIcaMsgMatch, DecodedPolytoneMsgMatch } from './proposal'

export enum ActionCategoryKey {
  CommonlyUsed = 'commonlyUsed',
  Authorizations = 'authorizations',
  ChainGovernance = 'chainGovernance',
  Appearance = 'appearance',
  DaoGovernance = 'daoGovernance',
  SubDaos = 'subDaos',
  SmartContracting = 'smartContracting',
  Treasury = 'treasury',
  Rebalancer = 'rebalancer',
  Nfts = 'nfts',
  Press = 'press',
  Rewards = 'rewards',
  Advanced = 'advanced',
}

export enum ActionKey {
  Spend = 'spend',
  CommunityPoolSpend = 'communityPoolSpend',
  CommunityPoolDeposit = 'communityPoolDeposit',
  ManageStaking = 'manageStaking',
  ManageCw20 = 'manageCw20',
  ManageCw721 = 'manageCw721',
  CreateNftCollection = 'createNftCollection',
  TransferNft = 'transferNft',
  MintNft = 'mintNft',
  BurnNft = 'burnNft',
  ManageSubDaos = 'manageSubDaos',
  UpdateInfo = 'updateInfo',
  Instantiate = 'instantiate',
  Instantiate2 = 'instantiate2',
  Execute = 'execute',
  Migrate = 'migrate',
  UpdateAdmin = 'updateAdmin',
  AuthzGrantRevoke = 'authzGrantRevoke',
  AuthzExec = 'authzExec',
  ValidatorActions = 'validatorActions',
  Custom = 'custom',
  BulkImport = 'bulkImport',
  PerformTokenSwap = 'performTokenSwap',
  WithdrawTokenSwap = 'withdrawTokenSwap',
  ManageStorageItems = 'manageStorageItems',
  GovernanceVote = 'governanceVote',
  GovernanceProposal = 'governanceProposal',
  GovernanceDeposit = 'governanceDeposit',
  ConfigureVestingPayments = 'configureVestingPayments',
  EnableRetroactiveCompensation = 'enableRetroactiveCompensation',
  DaoAdminExec = 'daoAdminExec',
  EnableMultipleChoice = 'enableMultipleChoice',
  EnableApprover = 'enableApprover',
  BecomeApprover = 'becomeApprover',
  ManageWidgets = 'manageWidgets',
  FeeShare = 'feeShare',
  ManageMembers = 'manageMembers',
  Mint = 'mint',
  ManageVesting = 'manageVesting',
  CreateCrossChainAccount = 'createCrossChainAccount',
  CrossChainExecute = 'crossChainExecute',
  UpdateStakingConfig = 'updateStakingConfig',
  CreateIca = 'createIca',
  IcaExecute = 'icaExecute',
  HideIca = 'hideIca',
  VetoProposal = 'vetoProposal',
  ExecuteProposal = 'executeProposal',
  NeutronOverruleSubDaoProposal = 'neutronOverruleSubDaoProposal',
  ManageVetoableDaos = 'manageVetoableDaos',
  UploadCode = 'uploadCode',
  ManageSubDaoPause = 'manageSubDaoPause',
  UpdatePreProposeConfig = 'updatePreProposeConfig',
  UpdateProposalConfig = 'updateProposalConfig',
  CreateDao = 'createDao',
  // Valence
  CreateValenceAccount = 'createValenceAccount',
  ConfigureRebalancer = 'configureRebalancer',
  PauseRebalancer = 'pauseRebalancer',
  ResumeRebalancer = 'resumeRebalancer',
  FundRebalancer = 'fundRebalancer',
  WithdrawFromRebalancer = 'withdrawFromRebalancer',
  // DaoProposalSingle
  UpdatePreProposeSingleConfig = 'updatePreProposeSingleConfig',
  UpdateProposalSingleConfig = 'updateProposalSingleConfig',
  // DaoProposalMultiple
  UpdatePreProposeMultipleConfig = 'updatePreProposeMultipleConfig',
  UpdateProposalMultipleConfig = 'updateProposalMultipleConfig',
  // Press
  CreatePost = 'createPost',
  UpdatePost = 'updatePost',
  DeletePost = 'deletePost',
  // Become SubDAO
  AcceptSubDao = 'acceptSubDao',
  BecomeSubDao = 'becomeSubDao',
  // Rewards
  CreateRewardDistribution = 'createRewardDistribution',
  UpdateRewardDistribution = 'updateRewardDistribution',
  FundRewardDistribution = 'fundRewardDistribution',
  WithdrawRewardDistribution = 'withdrawRewardDistribution',
  PauseRewardDistribution = 'pauseRewardDistribution',
  ResumeRewardDistribution = 'resumeRewardDistribution',
  FixRewardDistributor = 'fixRewardDistributor',
}

export type ActionAndData<
  Data extends Record<string, any> = Record<string, any>,
> = {
  action: Action<Data>
  data: Data
}

export type ActionKeyAndData = {
  // Add an ID field to prevent unnecessary re-renders when things move around.
  // This should be handled by react-hook-form's `useFieldArray`, but it only
  // works internally for that specific hook call, and we need to use it in many
  // different components.
  _id: string
  actionKey: ActionKey
  data: any
}

export type ActionKeyAndDataNoId = Omit<ActionKeyAndData, '_id'>

// A component which will render an action's input form.
export type ActionComponentProps<O = undefined, D = any> = {
  fieldNamePrefix: string
  allActionsWithData: ActionKeyAndData[]
  index: number
  data: D
} & (
  | {
      isCreating: true
      errors: FieldErrors
      // Adds a new action to the form.
      addAction: (
        action: ActionKeyAndDataNoId,
        // If omitted, the action will be appened to the end of the list.
        insertIndex?: number
      ) => void | Promise<void>
      // Removes this action from the form.
      remove: () => void
    }
  | {
      isCreating: false
      errors?: undefined
      addAction?: undefined
      remove?: undefined
    }
) &
  (O extends undefined ? {} : { options: O })

// eslint-disable-next-line regex/invalid
export type ActionComponent<O = undefined, D = any> = ComponentType<
  ActionComponentProps<O, D>
>

/**
 * The match result for an action given a list of messages.
 *
 * If this is a `number`, it corresponds to how many messages from the start of
 * the list are matched by this action. If this is a `boolean`, it corresponds
 * with either `1` or `0` messages matched, for `true` and `false`,
 * respectively. A truthy value always corresponds with a match, and falsy
 * always corresponds with no match.
 *
 * Recommended usage is `false` for no match, `true` for one message, and a
 * number for more than one message.
 */
export type ActionMatch = boolean | number

export interface Action<
  Data extends Record<string, any> = Record<string, any>,
> {
  /**
   * The unique key identifying the action.
   */
  key: ActionKey
  /**
   * Action component to edit/view the data.
   */
  Component: ActionComponent<undefined, Data>
  /**
   * The metadata describing an action.
   */
  metadata: {
    /**
     * The icon to display in the card.
     */
    Icon: ComponentType
    /**
     * The label to display.
     */
    label: string
    /**
     * The description to display in the picker.
     */
    description: string
    /**
     * Optional keywords to improve search results.
     */
    keywords?: string[]
    /**
     * This determines if the action should be hidden from creation. If true,
     * the action will not be shown in the list of actions to create, but it
     * will still match and render in existing contexts. This is used to
     * conditionally show the upgrade actions while still allowing them to
     * render in existing proposals and be added programmatically during
     * creation.
     */
    hideFromPicker?: boolean
    /**
     * Whether or not this action is reusable. Defaults to false. If true, when
     * editing the action, the add and remove button in the group will be
     * removed, and the action will be hidden from future category picker
     * selections. Some actions, like 'Spend', make sense to use multiple times,
     * while others, like 'Update Info' or any configuration updater, should
     * only be used once at a time. We should prevent users from adding multiple
     * of these actions.
     */
    notReusable?: boolean
    /**
     * Programmatic actions cannot be chosen or removed by the user. This is
     * used for actions should only be controlled by code. The user should not
     * be able to modify it at all, which also means the user cannot pick this
     * action or go back to the category action picker. This includes both
     * `hideFromPicker` and `notReusable`, while also preventing the user from
     * going back to the category action picker or removing the action.
     */
    programmaticOnly?: boolean
    /**
     * Order of this action in the list of actions. A greater number will be
     * shown first. If no order specified, actions will be sorted based on their
     * position in the category definition.
     */
    listOrder?: number
    /**
     * Priority with which successful matches get assigned to this action. A
     * greater number will be matched first. Equal priorities should be treated
     * as non-deterministic.
     *
     * Default is 0.
     */
    matchPriority?: number
  }
  /**
   * Function to initialize the action. This updates status/error and loads
   * defaults. It may also update metadata, such as `hideFromPicker`.
   */
  init: () => void | Promise<void>
  /**
   * Status of the action. Starts at 'idle'. If 'idle', 'loading' or 'error',
   * the action is not ready to be used, and attempting to access `defaults`
   * will throw an error. If 'error', the action should not be used. If 'ready',
   * the action is ready to be used.
   */
  status: 'idle' | 'loading' | 'error' | 'ready'
  /**
   * Whether or not the action is idle.
   */
  get idle(): boolean
  /**
   * Whether or not the action is loading.
   */
  get loading(): boolean
  /**
   * Whether or not the action is errored.
   */
  get errored(): boolean
  /**
   * Whether or not the action is ready.
   */
  get ready(): boolean
  /**
   * If status is 'error', this will be the error that caused the action to
   * fail. Otherwise, it will be undefined.
   */
  error?: Error
  /**
   * Default data for the action. This will work only when status is 'ready'.
   * Otherwise, it will throw an error.
   */
  defaults: Data
  /**
   * Function to transform action data into one or more Cosmos messages. This
   * should only be called if the action is ready.
   */
  encode: (
    data: Data,
    context: ActionEncodeContext
  ) =>
    | UnifiedCosmosMsg
    | UnifiedCosmosMsg[]
    | Promise<UnifiedCosmosMsg | UnifiedCosmosMsg[]>
  /**
   * Function to determine if this action exists at the start of the list of
   * messages. This should only be called if the action is ready.
   */
  match: (messages: ProcessedMessage[]) => ActionMatch | Promise<ActionMatch>
  /**
   * Function to transform Cosmos messages into action data. It can be partial
   * data, which will be applied to the defaults as a base. This should only be
   * called if the action is ready.
   */
  decode: (
    messages: ProcessedMessage[]
  ) => Partial<Data> | Promise<Partial<Data>>
  /**
   * Optional function to transform data from a bulk import into the action's
   * data shape. This can be used to help coerce certain data types, such as
   * strings into numbers.
   */
  transformImportData?: (data: any) => Data
}

/**
 * A class that can be constructed to create an action. Action is the interface,
 * and this is the type of a class that implements it.
 */
export type ImplementedAction<
  Data extends Record<string, any> = Record<string, any>,
> = {
  new (options: ActionOptions): Action<Data>
}

export type ActionCategoryBase = {
  // If many categories exist with the same key, they will be merged. The first
  // defined label and description will be used. This allows additional modules
  // to add actions to the same category without changing any metadata.
  key: ActionCategoryKey
  label?: string
  description?: string
  // Optional keywords to improve search results.
  keywords?: string[]
  actionKeys: ActionKey[]
}

export type ActionCategory = Omit<ActionCategoryBase, 'label'> & {
  label: string
}

export enum ActionContextType {
  Dao = 'dao',
  Wallet = 'wallet',
  // x/gov chain governance
  Gov = 'gov',
}

export type ActionContext = (
  | {
      type: ActionContextType.Dao
      dao: IDaoBase
    }
  | {
      type: ActionContextType.Wallet
      profile: UnifiedProfile
    }
  | {
      type: ActionContextType.Gov
      params: AllGovParams
    }
) & {
  // All contexts should have a list of accounts.
  accounts: Account[]
}

/**
 * Additional context passed to the encode function.
 */
export type ActionEncodeContext =
  | {
      type: ActionContextType.Dao
      dao: IDaoBase
      /**
       * Proposal module if being used in a DAO proposal. This is undefined, for
       * example, when a wallet uses AuthzExec to execute something on behalf of
       * a DAO.
       */
      proposalModule?: IProposalModuleBase
    }
  | {
      type: ActionContextType.Wallet
    }
  | {
      type: ActionContextType.Gov
      params: AllGovParams
    }

export enum ActionChainContextType {
  /**
   * Any chain, not configured.
   */
  Any = 'any',
  /**
   * Configured chain, no DAO DAO deployment.
   */
  Configured = 'configured',
  /**
   * Supported chain with a DAO DAO deployment.
   */
  Supported = 'supported',
}

export type ActionChainContext =
  | ({
      type: ActionChainContextType.Any
    } & IChainContext)
  | ({
      type: ActionChainContextType.Configured
    } & ConfiguredChainContext)
  | ({
      type: ActionChainContextType.Supported
    } & SupportedChainContext)

export type ActionOptions<ExtraOptions extends {} = {}> = ExtraOptions & {
  t: TFunction
  chain: AnyChain
  chainContext: ActionChainContext
  // The address of the sender/actor.
  // DAO core address if context.type === Dao
  // Wallet address if context.type === Wallet
  // x/gov module address if context.type === Gov
  address: string
  context: ActionContext
  queryClient: QueryClient
}

export type ActionMaker<
  Data extends Record<string, any> = Record<string, any>,
  ExtraOptions extends {} = {},
> = (options: ActionOptions<ExtraOptions>) => Action<Data> | null

/**
 * A category maker can return null to indicate that the category should not be
 * included.
 */
export type ActionCategoryMaker<ExtraOptions extends {} = {}> = (
  options: ActionOptions<ExtraOptions>
) => ActionCategoryBase | null

/**
 * Map action key to action.
 */
export type ActionMap = Record<ActionKey, Action>

/**
 * React context for actions that are available to use.
 */
export type IActionsContext = {
  /**
   * Action options.
   */
  options: ActionOptions
  /**
   * List of all actions.
   */
  actions: Action[]
  /**
   * Map action key to action.
   */
  actionMap: ActionMap
  /**
   * List of all action categories.
   */
  categories: ActionCategory[]
  /**
   * Action message procesor.
   */
  messageProcessor: MessageProcessor
}

/**
 * React context for actions being matched.
 */
export type IActionMatcherContext = {
  /**
   * Action matcher.
   */
  matcher: IActionMatcher
}

/**
 * React context for actions being encoded.
 */
export type IActionsEncoderContext = {
  /**
   * Action encoder.
   */
  encoder: IActionsEncoder
}

export type UseActionsOptions = {
  // If true, the actions will be filtered to only include those which are
  // allowed to be created. This is used to hide the upgrade actions from the
  // list of actions to create.
  isCreating?: boolean
}

export type NestedActionsEditorFormData = {
  msgs: UnifiedCosmosMsg[]

  // Internal action data so that errors are added to main form.
  _actionData?: ActionKeyAndData[]
}

export type ActionsProviderProps = {
  children: ReactNode | ReactNode[]
}

export type WalletActionsProviderProps = ActionsProviderProps & {
  // If passed, will override the connected wallet address.
  address?: string
}

export type GovActionsProviderProps = ActionsProviderProps & {
  /**
   * Optionally override loader node.
   */
  loader?: ReactNode
}

/**
 * Action decoder for a single action and set of matched messages.
 */
export interface IActionDecoder<
  Data extends Record<string, any> = Record<string, any>,
> {
  /**
   * The action that matched the messages.
   */
  action: Action<Data>
  /**
   * The messages.
   */
  messages: ProcessedMessage[]
  /**
   * Status of decoder.
   */
  status: 'idle' | 'loading' | 'error' | 'ready'
  /**
   * Function to decode messages into action data.
   * @returns A promise that resolves to the decoded action data.
   */
  decode: () => Promise<Data>
  /**
   * Decoded action data. Throw an error if not yet decoded.
   */
  get data(): Data
  /**
   * Whether or not the decoder is loading.
   */
  get loading(): boolean
  /**
   * Whether or not the decoder is errored.
   */
  get errored(): boolean
  /**
   * Whether or not the decoder is ready.
   */
  get ready(): boolean
  /**
   * Error if the decoder errored. Throw an error if not yet errored.
   */
  get error(): Error
}

/**
 * Action matcher.
 */
export interface IActionMatcher {
  /**
   * Status of matcher.
   */
  status: 'idle' | 'loading' | 'error' | 'ready'
  /**
   * Function to match messages with actions and create decoders for them.
   * @param messages - Array of `UnifiedCosmosMsg` to be matched.
   * @returns A promise that resolves to an array of `IActionDecoder`.
   */
  match: (messages: UnifiedCosmosMsg[]) => Promise<IActionDecoder[]>
  /**
   * Action decoders for matched messages. Throw an error if not yet matched.
   */
  get matches(): IActionDecoder[]
  /**
   * Whether or not the matcher is idle, meaning it hasn't attempted to match
   * yet.
   */
  get idle(): boolean
  /**
   * Whether or not the matcher is loading.
   */
  get loading(): boolean
  /**
   * Whether or not the matcher is errored.
   */
  get errored(): boolean
  /**
   * Whether or not the matcher is ready.
   */
  get ready(): boolean
  /**
   * Error if the matcher errored. Throw an error if not yet errored.
   */
  get error(): Error
  /**
   * Messages that are being matched.
   */
  get messages(): UnifiedCosmosMsg[]
}

/**
 * Actions encoder.
 */
export interface IActionsEncoder {
  /**
   * Status of encoder.
   */
  status: 'idle' | 'loading' | 'error' | 'ready'
  /**
   * Function to encode actions with data into messages.
   * @param actionKeysAndData - Array of `ActionKeyAndDataNoId` to be encoded.
   * @returns A promise that resolves to an array of `UnifiedCosmosMsg`.
   */
  encode: (
    actionKeysAndData: ActionKeyAndDataNoId[]
  ) => Promise<UnifiedCosmosMsg[]>
  /**
   * Encoded messages. Throw an error if not yet encoded.
   */
  get messages(): UnifiedCosmosMsg[]
  /**
   * Whether or not the encoder is idle, meaning it hasn't attempted to encode
   * yet.
   */
  get idle(): boolean
  /**
   * Whether or not the encoder is loading.
   */
  get loading(): boolean
  /**
   * Whether or not the encoder is errored.
   */
  get errored(): boolean
  /**
   * Whether or not the encoder is ready.
   */
  get ready(): boolean
  /**
   * Error if the encoder errored. Throw an error if not yet errored.
   */
  get error(): Error
}

/**
 * A message that has been processed.
 */
export type ProcessedMessage = {
  /**
   * The message that was executed.
   */
  message: UnifiedCosmosMsg
  /**
   * The account that executed the message.
   */
  account: Account
  /**
   * Whether or not this is a cross-chain message, meaning this was a wrapped
   * Polytone or ICA execute message. The account's chain ID should differ from
   * the sender's chain ID.
   */
  isCrossChain: boolean
  /**
   * Whether or not this is a wrapped execute message, which is a message known
   * to execute messages as another account.
   */
  isWrapped: boolean
  /**
   * The processed wrapped messages if any exist.
   */
  wrappedMessages: ProcessedMessage[]
  /**
   * The decoded message with accessible fields, or if this is a wrapped execute
   * message (such as a cross-chain or cw1-whitelist execute), the first wrapped
   * decoded message. If this is a wrapped execute but there are no wrapped
   * messages, this is null. See the `decodeMessage` util function for more
   * information.
   */
  decodedMessage: any
  /**
   * The decoded messages with accessible fields. If this is a wrapped execute
   * message (such as a cross-chain or cw1-whitelist execute), these are the
   * wrapped decoded messages. If not a wrapped message, this will be an array
   * with just the main decoded message in it. See the `decodeMessage` util
   * function for more information.
   */
  decodedMessages: any[]
  /**
   * If this was a wrapped Polytone execute, this is the decoded Polytone match.
   */
  polytone?: DecodedPolytoneMsgMatch
  /**
   * If this was a wrapped ICA execute, this is the decoded ICA match.
   */
  ica?: DecodedIcaMsgMatch
}

/**
 * Process a single message, detecting the account that sent the message, and
 * parsing wrapped executions (such as cross-chain messages, cw1-whitelist
 * executions, etc.).
 */
export type MessageProcessor = (options: {
  /**
   * The chain the message was executed on.
   */
  chainId: string
  /**
   * The sender of the message.
   */
  sender: string
  /**
   * The message to process.
   */
  message: UnifiedCosmosMsg
  /**
   * The query client.
   */
  queryClient: QueryClient
  /**
   * Whether or not to error if no remote (polytone or ICA) account is found.
   * This might be processing a message that is creating a Polytone or ICA
   * account, and the account may not yet have been created if the proposal
   * hasn't been executed and relayed. In this case, if false, it will simply
   * fill in an empty string for the account address.
   *
   * Defaults to false.
   */
  errorIfNoRemoteAccount?: boolean
}) => Promise<ProcessedMessage>
