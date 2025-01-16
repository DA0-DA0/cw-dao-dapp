import { useProcessTQ } from '@dao-dao/stateless'
import { LoadingData, ProcessedTQType } from '@dao-dao/types'

import { VotesInfo } from '../types'
import { useLoadingProposal } from './useLoadingProposal'

export const useLoadingVotesInfo = (): LoadingData<VotesInfo> => {
  const loadingProposal = useLoadingProposal()
  const processTQ = useProcessTQ()

  if (loadingProposal.loading) {
    return { loading: true }
  }

  const proposal = loadingProposal.data
  const { threshold, quorum } = processTQ(proposal.threshold)

  const yesVotes = Number(proposal.votes.yes)
  const noVotes = Number(proposal.votes.no)
  const abstainVotes = Number(proposal.votes.abstain)
  const turnoutTotal = yesVotes + noVotes + abstainVotes
  const totalVotingPower = Number(proposal.total_power)

  const turnoutPercent = (turnoutTotal / totalVotingPower) * 100
  const turnoutYesPercent = turnoutTotal ? (yesVotes / turnoutTotal) * 100 : 0
  const turnoutNoPercent = turnoutTotal ? (noVotes / turnoutTotal) * 100 : 0
  const turnoutAbstainPercent = turnoutTotal
    ? (abstainVotes / turnoutTotal) * 100
    : 0

  const totalYesPercent = (yesVotes / totalVotingPower) * 100
  const totalNoPercent = (noVotes / totalVotingPower) * 100
  const totalAbstainPercent = (abstainVotes / totalVotingPower) * 100

  const thresholdReached =
    !!threshold &&
    // All abstain fails, so we need at least 1 yes vote to reach threshold.
    yesVotes > 0 &&
    (threshold.type === ProcessedTQType.Majority
      ? // Majority
        yesVotes >
        ((quorum ? turnoutTotal : totalVotingPower) - abstainVotes) / 2
      : threshold.type === ProcessedTQType.Absolute
        ? yesVotes >= threshold.value
        : // Percent
          yesVotes >=
          ((quorum ? turnoutTotal : totalVotingPower) - abstainVotes) *
            (threshold.value / 100))
  const quorumReached =
    !!quorum &&
    (quorum.type === ProcessedTQType.Majority
      ? // Majority
        turnoutTotal > totalVotingPower / 2
      : // Percent
        turnoutPercent >= quorum.value)

  return {
    loading: false,
    data: {
      threshold,
      quorum,
      // Raw info
      yesVotes,
      noVotes,
      abstainVotes,
      totalVotingPower,
      turnoutTotal,
      // Turnout percents
      turnoutPercent,
      turnoutYesPercent,
      turnoutNoPercent,
      turnoutAbstainPercent,
      // Total percents
      totalYesPercent,
      totalNoPercent,
      totalAbstainPercent,
      // Meta
      thresholdReached,
      quorumReached,
    },
  }
}
