import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { daoVotingSgCommunityNftExtraQueries } from '@dao-dao/state'
import { useVotingModule } from '@dao-dao/stateless'
import { DaoInfoCard } from '@dao-dao/types'

import { useQueryLoadingDataWithError } from '../../../../hooks'

export const useMainDaoInfoCards = (): DaoInfoCard[] => {
  const { t } = useTranslation()
  const votingModule = useVotingModule()

  const queryClient = useQueryClient()
  const loadingMembers = useQueryLoadingDataWithError(
    daoVotingSgCommunityNftExtraQueries.allVoters(queryClient, {
      chainId: votingModule.chainId,
      address: votingModule.address,
    })
  )

  return [
    {
      label: t('title.members'),
      tooltip: t('info.membersTooltip'),
      loading: loadingMembers.loading,
      value: loadingMembers.loading
        ? undefined
        : loadingMembers.errored
          ? '<error>'
          : (loadingMembers.data?.length ?? '<error>'),
    },
  ]
}
