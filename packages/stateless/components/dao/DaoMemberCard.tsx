import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { ChainId } from '@dao-dao/types'
import { DaoMemberCardProps } from '@dao-dao/types/components/DaoMemberCard'
import { formatPercentOf100 } from '@dao-dao/utils'

import { ChainLogo } from '../ChainLogo'
import { CopyableAddress } from '../CopyableAddress'
import { ProfileImage } from '../profile'
import { Tooltip } from '../tooltip'

export const DaoMemberCard = ({
  address,
  balance,
  votingPowerPercent,
  profileData: { profile, loading: profileLoading },
}: DaoMemberCardProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col justify-between rounded-md border border-border-primary">
      <div className="flex flex-col items-center px-6 pt-10 pb-8">
        {/* Image */}
        <ProfileImage
          imageUrl={profile.imageUrl}
          loading={profileLoading}
          size="lg"
        />

        {/* Name */}
        <div className="mt-4 mb-2 flex flex-row items-center gap-2">
          {!profileLoading && profile.nameSource === 'stargaze' && (
            <Tooltip title={t('title.stargazeNames')}>
              <ChainLogo chainId={ChainId.StargazeMainnet} />
            </Tooltip>
          )}

          <p
            className={clsx(
              'title-text text-text-body',
              profileLoading && 'animate-pulse'
            )}
          >
            {profileLoading ? '...' : profile.name}
          </p>
        </div>

        {/* Address */}
        <CopyableAddress address={address} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border-interactive-disabled p-4">
        {/* Voting power */}
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="secondary-text">{t('title.votingPower')}</p>

          <p
            className={clsx(
              'body-text font-mono',
              votingPowerPercent.loading && 'animate-pulse'
            )}
          >
            {votingPowerPercent.loading
              ? '...'
              : formatPercentOf100(votingPowerPercent.data)}
          </p>
        </div>

        {/* Balance */}
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="secondary-text text-text-tertiary">{balance.label}</p>
          <p
            className={clsx(
              'caption-text font-mono',
              balance.value.loading && 'animate-pulse'
            )}
          >
            {balance.value.loading
              ? '...'
              : balance.value.data + (balance.unit ? ' ' + balance.unit : '')}
          </p>
        </div>
      </div>
    </div>
  )
}
