import uniq from 'lodash.uniq'
import { useTranslation } from 'react-i18next'
import { useRecoilValueLoadable, waitForAll } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import { Cw1WhitelistSelectors } from '@dao-dao/state'
import {
  DaoInfoCards as StatelessDaoInfoCards,
  TokenAmountDisplay,
  useChain,
  useDao,
} from '@dao-dao/stateless'
import { PreProposeModuleType } from '@dao-dao/types'
import { formatDate, formatPercentOf100 } from '@dao-dao/utils'

import { useDaoGovernanceToken, useQueryLoadingData } from '../../hooks'
import { useVotingModuleAdapter } from '../../voting-module-adapter'
import { EntityDisplay } from '../EntityDisplay'
import { SuspenseLoader } from '../SuspenseLoader'

export const MainDaoInfoCards = () => {
  const {
    components: { MainDaoInfoCardsLoader },
  } = useVotingModuleAdapter()

  return (
    <SuspenseLoader fallback={<MainDaoInfoCardsLoader />}>
      <InnerMainDaoInfoCards />
    </SuspenseLoader>
  )
}

const InnerMainDaoInfoCards = () => {
  const { t } = useTranslation()
  const { chainId } = useChain()
  const {
    hooks: { useMainDaoInfoCards },
  } = useVotingModuleAdapter()
  const votingModuleCards = useMainDaoInfoCards()
  const tokenInfo = useDaoGovernanceToken()

  const dao = useDao()
  const { activeThreshold, created } = dao.info

  const tvlLoading = useQueryLoadingData(dao.tvlQuery, {
    amount: -1,
    timestamp: Date.now(),
  })

  // Get unique approvers from all proposal modules.
  const allApprovers = uniq(
    dao.proposalModules.flatMap(({ prePropose }) =>
      prePropose?.type === PreProposeModuleType.Approval
        ? prePropose.config.approver
        : []
    )
  )

  // Get unique vetoers from all proposal modules.
  const allVetoers = uniq(
    dao.proposalModules.flatMap(({ veto }) => (veto ? [veto.vetoer] : []))
  )

  // Attempt to load cw1-whitelist admins if the vetoer is set. Will only
  // succeed if the vetoer is a cw1-whitelist contract. Otherwise it returns
  // undefined.
  const cw1WhitelistAdminsLoadable = useRecoilValueLoadable(
    waitForAll(
      allVetoers.map((vetoer) =>
        Cw1WhitelistSelectors.adminsIfCw1Whitelist({
          chainId,
          contractAddress: vetoer,
        })
      )
    )
  )

  // If a vetoer is a cw1-whitelist contract, replace it with its admins.
  const flattenedVetoers = uniq(
    allVetoers.flatMap((vetoer, index) =>
      cw1WhitelistAdminsLoadable.state === 'hasValue' &&
      cw1WhitelistAdminsLoadable.contents[index]?.length
        ? (cw1WhitelistAdminsLoadable.contents[index] as string[])
        : [vetoer]
    )
  )

  return (
    <StatelessDaoInfoCards
      cards={[
        // Common items.
        ...(created
          ? [
              {
                label: t('title.established'),
                tooltip: t('info.establishedTooltip'),
                value: formatDate(new Date(created)),
              },
            ]
          : []),
        {
          label: t('title.treasury'),
          tooltip: t('info.estimatedTreasuryUsdValueTooltip'),
          value: (
            <TokenAmountDisplay
              amount={
                tvlLoading.loading ? { loading: true } : tvlLoading.data.amount
              }
              dateFetched={
                tvlLoading.loading
                  ? undefined
                  : new Date(tvlLoading.data.timestamp)
              }
              estimatedUsdValue
            />
          ),
        },
        // Voting module-specific cards.
        ...votingModuleCards,
        // Put active threshold last so it's closer to voting module cards which
        // may contain staking information.
        ...(activeThreshold
          ? [
              {
                label: t('title.activeThreshold'),
                tooltip: t('info.activeThresholdDescription'),
                value:
                  'percentage' in activeThreshold
                    ? formatPercentOf100(
                        Number(activeThreshold.percentage.percent) * 100
                      )
                    : tokenInfo && (
                        <TokenAmountDisplay
                          amount={HugeDecimal.from(
                            activeThreshold.absolute_count.count
                          )}
                          decimals={tokenInfo.decimals}
                          symbol={tokenInfo.symbol}
                        />
                      ),
              },
            ]
          : []),
        // Show approvers and vetoers from proposal modules here in the main
        // info section because it is very relevant and should be surfaced.
        ...allApprovers.map((approver) => ({
          label: t('title.approver'),
          tooltip: t('info.daoApproverExplanation'),
          value: <EntityDisplay address={approver} />,
        })),
        ...flattenedVetoers.map((vetoer) => ({
          label: t('title.vetoer'),
          tooltip: t('info.daoVetoerExplanation'),
          value: <EntityDisplay address={vetoer} />,
        })),
      ]}
    />
  )
}
