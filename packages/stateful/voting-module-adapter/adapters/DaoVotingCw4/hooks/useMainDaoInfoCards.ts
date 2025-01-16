import { useTranslation } from 'react-i18next'

import { useChain } from '@dao-dao/stateless'
import { DaoInfoCard } from '@dao-dao/types'
import { isSecretNetwork } from '@dao-dao/utils'

import { useLoadingVotingModuleInfo } from './useLoadingVotingModuleInfo'

export const useMainDaoInfoCards = (): DaoInfoCard[] => {
  const { t } = useTranslation()
  const { chainId } = useChain()

  const loadingMembers = useLoadingVotingModuleInfo({
    fetchMembers: true,
  })

  // Can't view members on Secret Network.
  return isSecretNetwork(chainId)
    ? []
    : [
        {
          label: t('title.members'),
          tooltip: t('info.membersTooltip'),
          loading: loadingMembers.loading,
          value: loadingMembers.loading
            ? undefined
            : loadingMembers.errored
              ? '<error>'
              : (loadingMembers.data.members?.length ?? '<error>'),
        },
      ]
}
