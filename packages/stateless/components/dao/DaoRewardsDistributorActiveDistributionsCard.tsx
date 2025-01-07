import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DaoRewardsDistributorActiveDistributionsCardProps } from '@dao-dao/types'
import {
  getFallbackImage,
  getHumanReadableRewardDistributionLabel,
  getUniqueRewardDistributionKey,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

import { useQuerySyncedState } from '../../hooks'
import { Button } from '../buttons'
import { ErrorPage } from '../error'
import { SwitchCard } from '../inputs'
import { LineLoaders } from '../LineLoader'

export const DaoRewardsDistributorActiveDistributionsCard = ({
  className,
  distributions,
  DaoRewardDistributionInfoModal,
}: DaoRewardsDistributorActiveDistributionsCardProps) => {
  const { t } = useTranslation()

  const [selected, setSelected] = useQuerySyncedState<string | undefined>({
    param: 'distribution',
    defaultValue: undefined,
  })

  const selectedDistribution =
    distributions.loading || distributions.errored
      ? undefined
      : selected
        ? distributions.data.find(
            (d) => selected === getUniqueRewardDistributionKey(d)
          )
        : undefined

  const [showPaused, setShowPaused] = useState(false)
  const distributionsToShow =
    distributions.loading || distributions.errored
      ? []
      : showPaused
        ? distributions.data
        : distributions.data.filter(
            (d) => !('paused' in d.active_epoch.emission_rate)
          )
  const pausedDistributionsExist =
    !distributions.loading &&
    !distributions.errored &&
    distributions.data.some((d) => 'paused' in d.active_epoch.emission_rate)

  return (
    <>
      <div
        className={clsx(
          'bg-background-tertiary flex flex-col rounded-md p-4 gap-2',
          className
        )}
      >
        <p className="caption-text">
          {distributions.loading || distributions.errored
            ? t('title.activeDistributions')
            : showPaused && pausedDistributionsExist
              ? t('title.numDistributions', {
                  count: distributions.data.length,
                })
              : t('title.numActiveDistributions', {
                  count: distributionsToShow.length,
                })}
        </p>

        {distributions.loading ? (
          <LineLoaders lines={3} type="command" />
        ) : distributions.errored ? (
          <ErrorPage error={distributions.error} />
        ) : (
          <div className="styled-scrollbar flex flex-col gap-1 max-h-64 overflow-y-auto -mb-4 pb-4">
            {distributionsToShow.map((distribution) => (
              <Button
                key={distribution.id}
                onClick={() =>
                  setSelected(getUniqueRewardDistributionKey(distribution))
                }
                variant="ghost"
              >
                <div
                  className="h-6 w-6 shrink-0 rounded-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${toAccessibleImageUrl(
                      distribution.token.imageUrl ||
                        getFallbackImage(distribution.token.denomOrAddress)
                    )})`,
                  }}
                ></div>

                <p className="truncate">
                  {getHumanReadableRewardDistributionLabel(t, distribution)}
                </p>
              </Button>
            ))}
          </div>
        )}

        {pausedDistributionsExist && (
          <SwitchCard
            containerClassName="self-start mt-2"
            enabled={showPaused}
            label={t('title.showPaused')}
            onClick={() => setShowPaused((s) => !s)}
            sizing="sm"
          />
        )}
      </div>

      <DaoRewardDistributionInfoModal
        distribution={selectedDistribution}
        onClose={() => setSelected(undefined)}
      />
    </>
  )
}
