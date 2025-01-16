import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { indexerQueries } from '@dao-dao/state'
import { TokenAmountDisplay, useVotingModule } from '@dao-dao/stateless'
import { DaoInfoCard } from '@dao-dao/types'
import {
  convertDurationToHumanReadableString,
  formatPercentOf100,
  isSecretNetwork,
} from '@dao-dao/utils'

import { useQueryLoadingDataWithError } from '../../../../hooks'
import { useGovernanceTokenInfo } from './useGovernanceTokenInfo'
import { useStakingInfo } from './useStakingInfo'

export const useMainDaoInfoCards = (): DaoInfoCard[] => {
  const { t } = useTranslation()
  const votingModule = useVotingModule()

  const { loadingTotalStakedValue, unstakingDuration } = useStakingInfo({
    fetchTotalStakedValue: true,
  })

  if (loadingTotalStakedValue === undefined) {
    throw new Error(t('error.loadingData'))
  }

  const {
    governanceToken: { decimals, symbol },
    supply,
  } = useGovernanceTokenInfo()

  const queryClient = useQueryClient()
  const loadingMembers = useQueryLoadingDataWithError(
    indexerQueries.queryContract(queryClient, {
      chainId: votingModule.chainId,
      contractAddress: votingModule.address,
      formula: 'daoVotingCw20Staked/topStakers',
      noFallback: true,
    })
  )

  return [
    // Can't view members on Secret Network.
    ...(isSecretNetwork(votingModule.chainId)
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
                : (loadingMembers.data?.length ?? '<error>'),
          },
        ]),
    {
      label: t('title.totalSupply'),
      tooltip: t('info.totalSupplyTooltip', {
        tokenSymbol: symbol,
      }),
      value: (
        <TokenAmountDisplay
          amount={supply}
          decimals={decimals}
          symbol={symbol}
        />
      ),
    },
    {
      label: t('title.totalStaked'),
      tooltip: t('info.totalStakedTooltip', {
        tokenSymbol: symbol,
      }),
      value: (
        <TokenAmountDisplay
          amount={loadingTotalStakedValue}
          decimals={decimals}
          suffix={
            loadingTotalStakedValue.loading
              ? undefined
              : ` (${formatPercentOf100(
                  loadingTotalStakedValue.data.div(supply).times(100).toNumber()
                )})`
          }
          suffixClassName="text-text-secondary"
          symbol={symbol}
        />
      ),
    },
    {
      label: t('title.unstakingPeriod'),
      tooltip: t('info.unstakingPeriodTooltip', {
        tokenSymbol: symbol,
      }),
      value: unstakingDuration
        ? convertDurationToHumanReadableString(t, unstakingDuration)
        : t('info.none'),
    },
  ]
}
