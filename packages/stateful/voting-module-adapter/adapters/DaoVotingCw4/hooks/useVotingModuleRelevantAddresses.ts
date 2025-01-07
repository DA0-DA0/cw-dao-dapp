import { useTranslation } from 'react-i18next'

import { VotingModuleRelevantAddress } from '@dao-dao/types'

import { useLoadingVotingModuleInfo } from './useLoadingVotingModuleInfo'

export const useVotingModuleRelevantAddresses =
  (): VotingModuleRelevantAddress[] => {
    const { t } = useTranslation()
    const loadingInfo = useLoadingVotingModuleInfo()

    return [
      {
        label: t('info.groupAddress'),
        address: loadingInfo.loading
          ? '...'
          : loadingInfo.errored
            ? '<error>'
            : loadingInfo.data.cw4GroupAddress,
      },
    ]
  }
