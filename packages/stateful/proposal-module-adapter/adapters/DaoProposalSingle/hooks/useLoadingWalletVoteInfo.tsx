import { useWallet } from '@noahsaso/cosmodal'

import { DaoCoreV2Selectors } from '@dao-dao/state'
import { useCachedLoadable } from '@dao-dao/stateless'
import { LoadingData, WalletVoteInfo } from '@dao-dao/types'
import { Status, Vote } from '@dao-dao/types/contracts/DaoProposalSingle.common'

import { useProposalModuleAdapterOptions } from '../../../react'
import { getVoteSelector } from '../contracts/DaoProposalSingle.common.recoil'
import { useLoadingProposal } from './useLoadingProposal'

export const useLoadingWalletVoteInfo = ():
  | undefined
  | LoadingData<WalletVoteInfo<Vote>> => {
  const { coreAddress, proposalModule, proposalNumber } =
    useProposalModuleAdapterOptions()
  const { address: walletAddress } = useWallet()

  const loadingProposal = useLoadingProposal()

  const walletVoteLoadable = useCachedLoadable(
    walletAddress
      ? getVoteSelector({
          contractAddress: proposalModule.address,
          params: [{ proposalId: proposalNumber, voter: walletAddress }],
        })
      : undefined
  )

  const walletVotingPowerWhenProposalCreatedLoadable = useCachedLoadable(
    walletAddress && !loadingProposal.loading
      ? DaoCoreV2Selectors.votingPowerAtHeightSelector({
          contractAddress: coreAddress,
          params: [
            {
              address: walletAddress,
              height: loadingProposal.data.start_height,
            },
          ],
        })
      : undefined
  )

  const totalVotingPowerWhenProposalCreatedLoadable = useCachedLoadable(
    !loadingProposal.loading
      ? DaoCoreV2Selectors.totalPowerAtHeightSelector({
          contractAddress: coreAddress,
          params: [
            {
              height: loadingProposal.data.start_height,
            },
          ],
        })
      : undefined
  )

  // Return undefined when not connected.
  if (!walletAddress) {
    return undefined
  }

  if (
    loadingProposal.loading ||
    walletVoteLoadable.state !== 'hasValue' ||
    walletVotingPowerWhenProposalCreatedLoadable.state !== 'hasValue' ||
    totalVotingPowerWhenProposalCreatedLoadable.state !== 'hasValue'
  ) {
    return {
      loading: true,
    }
  }

  const proposal = loadingProposal.data
  const walletVote = walletVoteLoadable.contents.vote?.vote ?? undefined
  const walletVotingPowerWhenProposalCreated = Number(
    walletVotingPowerWhenProposalCreatedLoadable.contents.power
  )
  const couldVote = walletVotingPowerWhenProposalCreated > 0
  const totalVotingPowerWhenProposalCreated = Number(
    totalVotingPowerWhenProposalCreatedLoadable.contents.power
  )

  return {
    loading: false,
    data: {
      vote: walletVote,
      // If wallet could vote when this was open.
      couldVote,
      // Can vote if proposal is open, has not already voted, or revoting is
      // allowed, and had voting power when proposal was created.
      canVote:
        proposal.status === Status.Open &&
        (proposal.allow_revoting || !walletVote) &&
        couldVote,
      votingPowerPercent:
        (totalVotingPowerWhenProposalCreated === 0
          ? 0
          : walletVotingPowerWhenProposalCreated /
            totalVotingPowerWhenProposalCreated) * 100,
    },
  }
}
