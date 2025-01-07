import { useTranslation } from 'react-i18next'
import { constSelector } from 'recoil'

import { DaoPreProposeApprovalSingleSelectors } from '@dao-dao/state/recoil'
import { useCachedLoading, useCachedLoadingWithError } from '@dao-dao/stateless'
import {
  LoadingData,
  PreProposeApprovalProposalWithMeteadata,
  PreProposeModuleType,
  ProposalTimestampInfo,
} from '@dao-dao/types'
import { Proposal as DaoPreProposeApprovalSingleProposal } from '@dao-dao/types/contracts/DaoPreProposeApprovalSingle'
import { formatDate, formatDateTimeTz } from '@dao-dao/utils'

import { useProposalModuleAdapterOptions } from '../../../react'
import { approverIdForPreProposeApprovalIdSelector } from '../selectors'

export const useLoadingPreProposeApprovalProposal =
  (): LoadingData<PreProposeApprovalProposalWithMeteadata> => {
    const { t } = useTranslation()
    const {
      chain: { chainId },
      proposalModule: { prePropose },
      proposalNumber,
    } = useProposalModuleAdapterOptions()

    const loadingProposal = useCachedLoading(
      prePropose
        ? DaoPreProposeApprovalSingleSelectors.queryExtensionSelector({
            chainId,
            contractAddress: prePropose.address,
            params: [
              {
                msg: {
                  proposal: {
                    id: proposalNumber,
                  },
                },
              },
            ],
          })
        : undefined,
      undefined,
      (err) => console.error(err)
    ) as LoadingData<DaoPreProposeApprovalSingleProposal>

    // Retrieve proposal ID in approver DAO if exists.
    const approverProposalId = useCachedLoadingWithError(
      prePropose?.type === PreProposeModuleType.Approval &&
        !!prePropose.config.preProposeApproverContract
        ? approverIdForPreProposeApprovalIdSelector({
            chainId,
            preProposeAddress: prePropose.address,
            proposalNumber,
            isPreProposeApprovalProposal: true,
            approver: prePropose.config.approver,
            preProposeApproverContract:
              prePropose.config.preProposeApproverContract,
          })
        : constSelector(undefined)
    )

    if (
      loadingProposal.loading ||
      !loadingProposal.data ||
      approverProposalId.loading
    ) {
      return { loading: true }
    }

    const { status, createdAt, completedAt } = loadingProposal.data

    const createdDate = typeof createdAt === 'string' && new Date(createdAt)
    const completedDate =
      typeof completedAt === 'string' && new Date(completedAt)

    const timestampDisplay: ProposalTimestampInfo['display'] | undefined =
      'pending' in status && createdDate
        ? {
            label: t('title.proposed'),
            tooltip: formatDateTimeTz(createdDate),
            content: formatDate(createdDate),
          }
        : completedDate
          ? {
              label:
                'rejected' in status ? t('title.denied') : t('title.accepted'),
              tooltip: formatDateTimeTz(completedDate),
              content: formatDate(completedDate),
            }
          : undefined

    return {
      loading: false,
      updating: loadingProposal.updating,
      data: {
        ...loadingProposal.data,
        timestampDisplay,
        // On error, just return undefined so we still render the proposal.
        approverProposalId: approverProposalId.errored
          ? undefined
          : approverProposalId.data,
      },
    }
  }
