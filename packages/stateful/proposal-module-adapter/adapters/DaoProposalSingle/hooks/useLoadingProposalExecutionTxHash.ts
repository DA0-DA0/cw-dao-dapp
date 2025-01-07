import { constSelector } from 'recoil'

import { proposalExecutionTXHashSelector } from '@dao-dao/state'
import { useCachedLoading } from '@dao-dao/stateless'
import { PreProposeModuleType, ProposalStatusEnum } from '@dao-dao/types'

import { useProposalModuleAdapterOptions } from '../../../react'
import { useLoadingProposal } from './useLoadingProposal'

export const useLoadingProposalExecutionTxHash = () => {
  const {
    proposalModule: { address: proposalModuleAddress, prePropose },
    proposalNumber,
    chain: { chainId },
  } = useProposalModuleAdapterOptions()

  const loadingProposal = useLoadingProposal()

  return useCachedLoading(
    loadingProposal.loading
      ? // Returns loading when undefined passed to indicate we are still loading.
        undefined
      : loadingProposal.data.status === ProposalStatusEnum.Executed ||
          loadingProposal.data.status === ProposalStatusEnum.ExecutionFailed
        ? // If Neutron fork SubDAO with timelock, get execution event from
          // timelock module since that is the one that executes the actual
          // messages in the proposal.
          prePropose?.type === PreProposeModuleType.NeutronSubdaoSingle
          ? proposalExecutionTXHashSelector({
              chainId,
              contractAddress: prePropose.config.timelockAddress,
              proposalId: proposalNumber,
              isNeutronTimelockExecute: true,
            })
          : // If in an execute state, load the execution TX hash.
            proposalExecutionTXHashSelector({
              chainId,
              contractAddress: proposalModuleAddress,
              proposalId: proposalNumber,
            })
        : // Returns not loading with undefined value when undefined selector passed, indicating there is no data available.
          constSelector(undefined),
    undefined
  )
}
