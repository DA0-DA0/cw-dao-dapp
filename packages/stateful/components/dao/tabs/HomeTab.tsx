import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { waitForAll } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  DaoSplashHeader,
  useAppContext,
  useCachedLoadable,
  useDao,
} from '@dao-dao/stateless'
import { CheckedDepositInfo, DaoPageMode, WidgetId } from '@dao-dao/types'
import { getDaoRewardDistributors } from '@dao-dao/utils'

import {
  useDaoGovernanceToken,
  useDaoWithWalletSecretNetworkPermit,
} from '../../../hooks'
import { matchAndLoadCommon } from '../../../proposal-module-adapter'
import { useVotingModuleAdapter } from '../../../voting-module-adapter'
import { useWidget } from '../../../widgets'
import { ButtonLink } from '../../ButtonLink'
import { ConnectWallet } from '../../ConnectWallet'
import { LinkWrapper } from '../../LinkWrapper'
import { CreateDaoPermit } from '../CreateDaoPermit'
import { DaoRewardsDistributorActiveDistributionsCard } from '../DaoRewardsDistributorActiveDistributionsCard'
import { DaoRewardsDistributorClaimCard } from '../DaoRewardsDistributorClaimCard'
import { DaoVoteDelegationCard } from '../DaoVoteDelegationCard'
import { DaoWidgets } from '../DaoWidgets'
import { MainDaoInfoCards } from '../MainDaoInfoCards'

export const HomeTab = () => {
  const { t } = useTranslation()
  const dao = useDao()
  const { mode } = useAppContext()
  const { isWalletConnected, isSecretNetworkPermitNeeded } =
    useDaoWithWalletSecretNetworkPermit()

  const {
    components: { ProfileCardMemberInfo },
  } = useVotingModuleAdapter()

  const depositInfoSelectors = useMemo(
    () =>
      dao.proposalModules.map(
        (proposalModule) =>
          matchAndLoadCommon(dao, proposalModule.address).selectors.depositInfo
      ),
    [dao]
  )
  const proposalModuleDepositInfosLoadable = useCachedLoadable(
    waitForAll(depositInfoSelectors)
  )

  const { denomOrAddress: governanceDenomOrAddress } =
    useDaoGovernanceToken() ?? {}

  // Get max deposit of governance token across all proposal modules.
  const maxGovernanceTokenProposalModuleDeposit =
    proposalModuleDepositInfosLoadable.state !== 'hasValue'
      ? HugeDecimal.zero
      : proposalModuleDepositInfosLoadable.contents
          .filter(
            (depositInfo): depositInfo is CheckedDepositInfo =>
              !!depositInfo &&
              ('cw20' in depositInfo.denom
                ? depositInfo.denom.cw20
                : depositInfo.denom.native) === governanceDenomOrAddress
          )
          // Get max.
          .reduce(
            (acc, { amount }) =>
              acc.gt(amount) ? acc : HugeDecimal.from(amount),
            HugeDecimal.zero
          )

  const hasVoteDelegation = !!useWidget(WidgetId.VoteDelegation)

  const hasRewardDistributors =
    getDaoRewardDistributors(dao.info.items).length > 0

  return (
    <div className="flex flex-col items-stretch gap-4">
      {mode === DaoPageMode.Sda && (
        <DaoSplashHeader
          ButtonLink={ButtonLink}
          LinkWrapper={LinkWrapper}
          dao={dao}
        />
      )}

      <div className="flex flex-col items-stretch lg:flex-row lg:items-start gap-x-2 gap-y-6 mt-2">
        <div className="flex flex-col gap-4 w-full md:w-2/3 lg:w-1/2">
          <p className="title-text">{t('title.membership')}</p>

          <div className="flex flex-col gap-2">
            <div className="rounded-md bg-background-tertiary p-4">
              {isWalletConnected && !isSecretNetworkPermitNeeded ? (
                <ProfileCardMemberInfo
                  maxGovernanceTokenDeposit={
                    maxGovernanceTokenProposalModuleDeposit.isPositive()
                      ? maxGovernanceTokenProposalModuleDeposit.toString()
                      : undefined
                  }
                />
              ) : isSecretNetworkPermitNeeded ? (
                <CreateDaoPermit />
              ) : (
                <>
                  <p className="body-text mb-3">
                    {t('info.logInToViewMembership')}
                  </p>

                  <ConnectWallet size="md" />
                </>
              )}
            </div>
          </div>

          {isWalletConnected &&
            !isSecretNetworkPermitNeeded &&
            hasVoteDelegation && <DaoVoteDelegationCard className="-mt-2" />}
        </div>

        {hasRewardDistributors && isWalletConnected && (
          <div className="flex flex-col gap-4 w-full md:w-2/3 lg:w-1/2">
            <p className="title-text">{t('title.rewards')}</p>

            <div className="flex flex-col gap-2">
              <DaoRewardsDistributorClaimCard />
              <DaoRewardsDistributorActiveDistributionsCard />
            </div>
          </div>
        )}
      </div>

      <p className="title-text mt-2 lg:mt-4">{t('title.details')}</p>

      <MainDaoInfoCards />

      <DaoWidgets />
    </div>
  )
}
