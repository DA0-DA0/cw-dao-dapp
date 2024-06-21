import { useLoadingPromise } from '@dao-dao/stateless'
import { LoadingData, WalletVoteInfo } from '@dao-dao/types'
import { Vote } from '@dao-dao/types/contracts/DaoProposalSingle.common'

import { useWalletWithSecretNetworkPermit } from '../../../../hooks'
import { useProposalModuleAdapterContext } from '../../../react'
import { useLoadingProposal } from './useLoadingProposal'

export const useLoadingWalletVoteInfo = ():
  | undefined
  | LoadingData<WalletVoteInfo<Vote>> => {
  const {
    proposalModule,
    options: { proposalNumber, isPreProposeApprovalProposal },
  } = useProposalModuleAdapterContext()
  const {
    address: walletAddress,
    permit,
    isSecretNetwork,
  } = useWalletWithSecretNetworkPermit({
    dao: proposalModule.dao.coreAddress,
  })

  const loadingProposal = useLoadingProposal()

  const walletVoteLoading = useLoadingPromise({
    // Loading state if wallet not connected.
    promise: walletAddress
      ? () =>
          proposalModule.getVote({
            proposalId: proposalNumber,
            voter: walletAddress,
          })
      : undefined,
    // Refresh when permit, proposal module, or wallet changes.
    deps: [permit, proposalModule, walletAddress],
  })

  const walletVotingPowerWhenProposalCreatedLoading = useLoadingPromise({
    // Loading state if proposal not loaded or wallet not connected.
    promise:
      !loadingProposal.loading && walletAddress
        ? () =>
            proposalModule.dao.getVotingPower(
              walletAddress,
              loadingProposal.data.start_height
            )
        : undefined,
    // Refresh when permit, proposal module, or wallet changes.
    deps: [permit, proposalModule, walletAddress],
  })

  const totalVotingPowerWhenProposalCreatedLoading = useLoadingPromise({
    // Loading state if proposal not loaded.
    promise: !loadingProposal.loading
      ? () =>
          proposalModule.dao.getTotalVotingPower(
            loadingProposal.data.start_height
          )
      : undefined,
    // Refresh when proposal module changes.
    deps: [proposalModule],
  })

  // Return undefined when no permit on Secret Network or when pre-propose
  // proposal (which doesn't have voting).
  if ((isSecretNetwork && !permit) || isPreProposeApprovalProposal) {
    return undefined
  }

  if (
    loadingProposal.loading ||
    walletVoteLoading.loading ||
    walletVotingPowerWhenProposalCreatedLoading.loading ||
    totalVotingPowerWhenProposalCreatedLoading.loading
  ) {
    return {
      loading: true,
    }
  }

  const proposal = loadingProposal.data
  const walletVote =
    (!walletVoteLoading.errored && walletVoteLoading.data?.vote) || undefined
  const walletVotingPowerWhenProposalCreated =
    walletVotingPowerWhenProposalCreatedLoading.errored
      ? 0
      : Number(walletVotingPowerWhenProposalCreatedLoading.data)
  const couldVote = walletVotingPowerWhenProposalCreated > 0
  const totalVotingPowerWhenProposalCreated =
    totalVotingPowerWhenProposalCreatedLoading.errored
      ? 0
      : Number(totalVotingPowerWhenProposalCreatedLoading.data)

  const canVote =
    couldVote && proposal.votingOpen && (!walletVote || proposal.allow_revoting)

  return {
    loading: false,
    data: {
      vote: walletVote,
      // If wallet could vote when this was open.
      couldVote,
      // If wallet can vote now.
      canVote,
      votingPowerPercent:
        (totalVotingPowerWhenProposalCreated === 0
          ? 0
          : walletVotingPowerWhenProposalCreated /
            totalVotingPowerWhenProposalCreated) * 100,
    },
  }
}
