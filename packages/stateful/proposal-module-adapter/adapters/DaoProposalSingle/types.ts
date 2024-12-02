import {
  ActionKeyAndData,
  DepositInfoSelector,
  IProposalModuleBase,
  NeutronTimelockOverrule,
  PercentOrMajorityValue,
  ProcessedTQ,
  ProposalExecutionMetadata,
  ProposalTimestampInfo,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import { Proposal } from '@dao-dao/types/contracts/CwProposalSingle.v1'
import {
  SingleChoiceProposal,
  Vote,
} from '@dao-dao/types/contracts/DaoProposalSingle.v2'

export type NewProposalForm = {
  title: string
  description: string
  actionData: ActionKeyAndData[]
  metadata?: ProposalExecutionMetadata
  vote?: Vote
}

// Converted data from actions into Cosmos messages.
export type NewProposalData = {
  title: string
  description: string
  msgs: UnifiedCosmosMsg[]
  vote?: Vote
}

export type DaoCreationExtraVotingConfig = {
  /**
   * Whether or not the single choice config should use a quorum.
   */
  quorumEnabled: boolean
  /**
   * The configured threshold. If quorum is enabled, this threshold only applies
   * to the voters who turnout on a proposal. If quorum is disabled, this is an
   * absolute threshold of all possible voters.
   */
  threshold: PercentOrMajorityValue
}

export interface VotesInfo {
  threshold: ProcessedTQ
  quorum?: ProcessedTQ
  // Raw info
  yesVotes: number
  noVotes: number
  abstainVotes: number
  totalVotingPower: number
  turnoutTotal: number
  // Turnout percents
  turnoutPercent: number
  turnoutYesPercent: number
  turnoutNoPercent: number
  turnoutAbstainPercent: number
  // Total percents
  totalYesPercent: number
  totalNoPercent: number
  totalAbstainPercent: number
  // Meta
  thresholdReached: boolean
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
  // Whether or not a pre-propose-approval proposal was created. If this is
  // true, the proposal ID should contain an asterisk (*) between the proposal
  // module prefix and proposal number.
  isPreProposeApprovalProposal: boolean
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

export type ProposalWithMetadata = (Proposal | SingleChoiceProposal) & {
  timestampInfo: ProposalTimestampInfo
  votingOpen: boolean
  executedAt?: Date
  // If this proposal was approved by a pre-propose-approver in another DAO,
  // this is the approver proposal ID.
  approverProposalId?: string
  // If this proposal is a pre-propose-approver proposal that approved a
  // pre-propose-approval proposal in another DAO, this is the created proposal
  // ID.
  approvedProposalId?: string
  // If this proposal is in its veto timelock period, this is the date that the
  // timelock period expires.
  vetoTimelockExpiration?: Date
  // If this is a proposal in a Neutron fork SubDAO with timelock, this is the
  // overrule proposal and its DAO created once executed and thus timelocked.
  neutronTimelockOverrule?: NeutronTimelockOverrule
}
