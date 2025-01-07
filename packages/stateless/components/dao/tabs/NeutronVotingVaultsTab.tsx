import { ComponentType, Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import {
  LoadingDataWithError,
  StatefulDaoVotingVaultCardProps,
  VotingVaultWithInfo,
} from '@dao-dao/types'

import { ErrorPage } from '../../error'
import { GridCardContainer } from '../../GridCardContainer'
import { DaoVotingVaultCardLoader } from '../DaoVotingVaultCard'

export type NeutronVotingVaultsTabProps = {
  totalVotingPower: LoadingDataWithError<number>
  loadingVaults: LoadingDataWithError<VotingVaultWithInfo[]>
  DaoVotingVaultCard: ComponentType<StatefulDaoVotingVaultCardProps>
}

export const NeutronVotingVaultsTab = ({
  totalVotingPower,
  loadingVaults,
  DaoVotingVaultCard,
}: NeutronVotingVaultsTabProps) => {
  const { t } = useTranslation()

  return (
    <>
      {/* header min-height of 3.5rem standardized across all tabs */}
      <div className="mb-6 flex min-h-[3.5rem] flex-row flex-wrap items-center gap-x-4 gap-y-1 border-b border-b-border-secondary pb-6">
        <p className="title-text text-text-body">{t('title.votingVaults')}</p>
        <p className="secondary-text">{t('info.votingVaultsExplanation')}</p>
      </div>

      {loadingVaults.loading ? (
        <GridCardContainer>
          {[...Array(9)].map((_, index) => (
            <DaoVotingVaultCardLoader key={index} />
          ))}
        </GridCardContainer>
      ) : loadingVaults.errored ? (
        <ErrorPage error={loadingVaults.error} />
      ) : totalVotingPower.errored ? (
        <ErrorPage error={totalVotingPower.error} />
      ) : (
        <>
          <GridCardContainer>
            {loadingVaults.data
              .filter((vault) => vault.state === 'Active')
              .sort((a, b) =>
                // Sort real vaults first.
                a.info.real === b.info.real
                  ? 0
                  : a.info.real && !b.info.real
                    ? -1
                    : 1
              )
              .map((vault) => (
                <DaoVotingVaultCard
                  key={vault.address}
                  totalVotingPower={totalVotingPower}
                  vault={vault}
                />
              ))}
          </GridCardContainer>
        </>
      )}
    </>
  )
}
