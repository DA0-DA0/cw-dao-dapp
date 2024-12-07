import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import { TokenStakedVotingModule } from '@dao-dao/state/clients'
import { indexerQueries } from '@dao-dao/state/query'
import {
  MembersTab as StatelessMembersTab,
  useVotingModule,
} from '@dao-dao/stateless'
import { StatefulDaoMemberCardProps } from '@dao-dao/types'

import {
  ButtonLink,
  DaoMemberCard,
  EntityDisplay,
} from '../../../../components'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import { useGovernanceTokenInfo } from '../hooks/useGovernanceTokenInfo'

export const MembersTab = () => {
  const { t } = useTranslation()
  const votingModule = useVotingModule()
  const { governanceToken } = useGovernanceTokenInfo()

  const queryClient = useQueryClient()
  const members = useQueryLoadingDataWithError(
    indexerQueries.queryContract(queryClient, {
      chainId: votingModule.chainId,
      contractAddress: votingModule.address,
      formula:
        votingModule instanceof TokenStakedVotingModule
          ? 'daoVotingTokenStaked/topStakers'
          : 'daoVotingNativeStaked/topStakers',
      noFallback: true,
    }),
    (data) =>
      data?.map(
        ({
          address,
          balance,
          votingPowerPercent,
        }: any): StatefulDaoMemberCardProps => ({
          address,
          balanceLabel: t('title.staked'),
          balance: {
            loading: false,
            data: {
              amount: HugeDecimal.from(balance),
              token: governanceToken,
            },
          },
          votingPowerPercent: {
            loading: false,
            data: votingPowerPercent,
          },
        })
      ) ?? []
  )

  return (
    <StatelessMembersTab
      ButtonLink={ButtonLink}
      DaoMemberCard={DaoMemberCard}
      members={members}
      topVoters={{
        show: true,
        EntityDisplay,
      }}
    />
  )
}
