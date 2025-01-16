import { constSelector } from 'recoil'

import {
  CwProposalSingleV1Selectors,
  DaoPreProposeSingleSelectors,
} from '@dao-dao/state'
import { useCachedLoadable } from '@dao-dao/stateless'
import {
  CheckedDepositInfo,
  ContractVersion,
  DepositRefundPolicy,
  LoadingData,
  PreProposeModuleType,
} from '@dao-dao/types'
import { ProposalResponse as ProposalV1Response } from '@dao-dao/types/contracts/CwProposalSingle.v1'
import { DepositInfoResponse as DepositInfoPreProposeResponse } from '@dao-dao/types/contracts/DaoPreProposeSingle'

import { useProposalModuleAdapterOptions } from '../../../react/context'

export const useLoadingDepositInfo = (): LoadingData<
  CheckedDepositInfo | undefined
> => {
  const {
    proposalModule: { address, version, prePropose },
    proposalNumber,
    chain: { chainId },
  } = useProposalModuleAdapterOptions()

  const selectorValue = useCachedLoadable<
    ProposalV1Response | DepositInfoPreProposeResponse | undefined
  >(
    // V1 does not support pre-propose.
    version === ContractVersion.V1
      ? CwProposalSingleV1Selectors.proposalSelector({
          chainId,
          contractAddress: address,
          params: [
            {
              proposalId: proposalNumber,
            },
          ],
        })
      : // Every other version supports pre-propose.
        prePropose &&
          // Approver does not have deposit info.
          prePropose.type !== PreProposeModuleType.Approver
        ? DaoPreProposeSingleSelectors.depositInfoSelector({
            chainId,
            contractAddress: prePropose.address,
            params: [
              {
                proposalId: proposalNumber,
              },
            ],
          })
        : constSelector(undefined)
  )

  if (selectorValue.state !== 'hasValue') {
    return { loading: true }
  }

  // Type-checked below.
  const proposalResponse = selectorValue.contents as
    | ProposalV1Response
    | undefined
  const depositInfoResponse = selectorValue.contents as
    | DepositInfoPreProposeResponse
    | undefined

  const depositInfo: CheckedDepositInfo | undefined =
    //! V1
    version === ContractVersion.V1 && proposalResponse?.proposal?.deposit_info
      ? {
          amount: proposalResponse.proposal.deposit_info.deposit,
          denom: {
            cw20: proposalResponse.proposal.deposit_info.token,
          },
          refund_policy: proposalResponse.proposal.deposit_info
            .refund_failed_proposals
            ? DepositRefundPolicy.Always
            : DepositRefundPolicy.OnlyPassed,
        }
      : // If has pre-propose, check deposit info response.
        prePropose
        ? (depositInfoResponse?.deposit_info ?? undefined)
        : undefined

  return {
    loading: false,
    data: depositInfo,
  }
}
