import { useTranslation } from 'react-i18next'
import TimeAgo from 'react-timeago'

import { GovProposal, LoadingData, ProposalTimestampInfo } from '@dao-dao/types'
import { ProposalStatus } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { formatDate, formatDateTimeTz } from '@dao-dao/utils'

import { useTranslatedTimeDeltaFormatter } from './useTranslatedTimeDeltaFormatter'

export const useLoadingGovProposalTimestampInfo = (
  // If undefined, returns loading.
  proposal: GovProposal['proposal'] | undefined
): LoadingData<ProposalTimestampInfo> => {
  const { t } = useTranslation()
  const timeAgoFormatter = useTranslatedTimeDeltaFormatter({ words: false })

  if (!proposal) {
    return { loading: true }
  }

  const depositOrVotingEndDate =
    (proposal.status === ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD
      ? proposal.depositEndTime
      : proposal.votingEndTime) || new Date(0)

  const dateDisplay: ProposalTimestampInfo['display'] | undefined =
    proposal.status === ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD ||
    proposal.status === ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD
      ? {
          label: t('title.timeLeft'),
          tooltip: formatDateTimeTz(depositOrVotingEndDate),
          content: (
            <TimeAgo
              date={depositOrVotingEndDate}
              formatter={timeAgoFormatter}
            />
          ),
        }
      : proposal.status === ProposalStatus.PROPOSAL_STATUS_PASSED ||
          proposal.status === ProposalStatus.PROPOSAL_STATUS_REJECTED
        ? {
            label:
              proposal.status === ProposalStatus.PROPOSAL_STATUS_PASSED
                ? t('proposalStatusTitle.passed')
                : t('proposalStatusTitle.rejected'),
            tooltip: formatDateTimeTz(proposal.votingEndTime || new Date(0)),
            content: formatDate(proposal.votingEndTime || new Date(0)),
          }
        : undefined

  const timestampInfo: ProposalTimestampInfo = {
    display: dateDisplay,
    expirationDate: depositOrVotingEndDate,
  }

  return {
    loading: false,
    data: timestampInfo,
  }
}
