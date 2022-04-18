// Client-side proposal representation
import {
  Proposal,
  ProposalResponse,
  ProposalTallyResponse,
  Status,
  Threshold,
  ThresholdResponse,
  Votes,
} from '@dao-dao/types/contracts/cw3-dao'

export const MEMO_MAX_LEN = 255

const EmptyThreshold: Threshold = {
  threshold_quorum: {
    quorum: '0',
    threshold: '0',
  },
}

const EmptyVotes: Votes = {
  abstain: '',
  yes: '',
  no: '',
  veto: '',
}

export const EmptyProposal: Proposal = {
  title: '',
  description: '',
  expires: {
    at_time: `${new Date()}`,
  },
  deposit: '',
  msgs: [],
  proposer: '',
  start_height: 0,
  status: 'open',
  threshold: { ...EmptyThreshold },
  total_weight: '',
  votes: { ...EmptyVotes },
}

export const EmptyThresholdResponse: ThresholdResponse = {
  absolute_percentage: {
    percentage: '0',
    total_weight: '0',
  },
}

export const EmptyProposalTallyResponse: ProposalTallyResponse = {
  votes: [] as any,
  total_votes: '',
  threshold: EmptyThresholdResponse,
  status: 'pending',
  quorum: '',
  total_weight: '0',
}

export const EmptyProposalResponse: ProposalResponse = {
  ...EmptyProposal,
  id: -1,
  deposit_amount: '0',
  proposer: '',
  status: 'Draft' as Status,
  threshold: { ...EmptyThresholdResponse },
  total_weight: '0',
}
