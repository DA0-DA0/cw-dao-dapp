import {
  ActionKeyAndData,
  ContractVersion,
  DepositInfoSelector,
  IProposalModuleBase,
  ProcessedTQ,
  ProposalExecutionMetadata,
  ProposalTimestampInfo,
  ProposalVoteOption,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  CheckedMultipleChoiceOption,
  MultipleChoiceOptionType,
  MultipleChoiceOptions,
  MultipleChoiceProposal,
  MultipleChoiceVote,
} from '@dao-dao/types/contracts/DaoProposalMultiple'

export type MultipleChoiceOptionFormData = {
  title: string
  description: string
  actionData: ActionKeyAndData[]
  metadata?: ProposalExecutionMetadata
}

export type NewProposalForm = {
  title: string
  description: string
  choices: MultipleChoiceOptionFormData[]
  vote?: MultipleChoiceVote
}

export type NewProposalData = {
  title: string
  description: string
  choices: MultipleChoiceOptions
  vote?: MultipleChoiceVote
}

export interface PercentOrMajorityValue {
  majority: boolean
  // Will be used when `majority` is false.
  value: number
}

// Has vote percentages as well as choice info.
export type ProcessedMultipleChoiceOption = {
  description: string
  index: number
  msgs: UnifiedCosmosMsg[]
  optionType: MultipleChoiceOptionType
  title: string
  turnoutVotePercentage: number
  color?: string
}

export interface VotesInfo {
  quorum: ProcessedTQ
  isTie: boolean
  processedChoices: ProcessedMultipleChoiceOption[]
  // Undefined if a tie, including when no votes have been cast.
  winningChoice: ProcessedMultipleChoiceOption | undefined
  totalVotingPower: number
  turnoutTotal: number
  turnoutPercent: number
  quorumReached: boolean
}

export interface PublishProposalOptions {
  // If set, a failed simulation will make future attempts to publish a
  // proposal bypass the simulation check for the specified duration. This
  // allows the user to confirm they want to publish a proposal even if the
  // simulation fails, in case the actions will be valid at the some point in
  // the future but are not yet.
  failedSimulationBypassSeconds?: number
}

export type SimulateProposal = (
  newProposalData: NewProposalData
) => Promise<void>

export type PublishProposal = (
  newProposalData: NewProposalData,
  options?: PublishProposalOptions
) => Promise<{
  proposalNumber: number
  proposalId: string
}>

export interface MakeUsePublishProposalOptions {
  proposalModule: IProposalModuleBase
  depositInfoSelector: DepositInfoSelector
}

export type UsePublishProposal = () => {
  simulateProposal: SimulateProposal
  publishProposal: PublishProposal
  /**
   * If defined, the current wallet cannot propose for this reason. If
   * undefined, the current wallet can propose.
   */
  cannotProposeReason?: string
  depositUnsatisfied: boolean
  simulationBypassExpiration: Date | undefined
}

export type ProposalWithMetadata = MultipleChoiceProposal & {
  timestampInfo: ProposalTimestampInfo
  votingOpen: boolean
  executedAt?: Date
  // If this proposal is in its veto timelock period, this is the date that the
  // timelock period expires.
  vetoTimelockExpiration?: Date
}

export type MultipleChoiceOptionData = {
  choice: CheckedMultipleChoiceOption
  voteOption: ProposalVoteOption<MultipleChoiceVote>
}

export type DaoCreationExtraVotingConfig = {
  // If defined, use this version of the contracts instead of the latest.
  overrideContractVersion?: ContractVersion
}
