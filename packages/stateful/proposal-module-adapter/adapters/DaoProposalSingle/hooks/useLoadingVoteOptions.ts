import { Check, Close, Texture } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import {
  LoadingData,
  PreProposeModuleType,
  ProposalVoteOption,
} from '@dao-dao/types'
import { Vote } from '@dao-dao/types/contracts/DaoProposalSingle.common'

import { useProposalModuleAdapterCommonOptions } from '../../../react/context'

export const useLoadingVoteOptions = (): LoadingData<
  ProposalVoteOption<Vote>[]
> => {
  const { t } = useTranslation()

  // Change labels for pre-propose-approver proposals that are responsible for
  // approving another proposal, to make it more clear what the actions do.
  const {
    proposalModule: { prePropose },
  } = useProposalModuleAdapterCommonOptions()
  const isPreProposeApproverProposal =
    prePropose?.type === PreProposeModuleType.Approver

  return {
    loading: false,
    data: [
      {
        Icon: Check,
        label: isPreProposeApproverProposal
          ? t('button.approve')
          : t('info.yesVote'),
        value: 'yes',
      },
      {
        Icon: Close,
        label: isPreProposeApproverProposal
          ? t('button.reject')
          : t('info.noVote'),
        value: 'no',
      },
      {
        Icon: Texture,
        label: t('info.abstainVote'),
        value: 'abstain',
      },
    ],
  }
}
