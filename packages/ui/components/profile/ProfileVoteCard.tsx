import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { formatPercentOf100 } from '@dao-dao/utils'

import { Button } from '../Button'
import { MembershipPill } from './MembershipPill'
import { ProfileCardWrapper } from './ProfileCardWrapper'
import { ProfileVoteButton } from './ProfileVoteButton'

export interface ProfileVoteCardProps {
  variant: 'abstain' | 'noWithVeto' | 'no' | 'yes' | 'unselected'
  loading?: boolean
  votingPower: number
  daoName: string
  walletName: string
  profileImgUrl: string
}

export const ProfileVoteCard = ({
  variant,
  loading,
  votingPower,
  daoName,
  walletName,
  profileImgUrl,
}: ProfileVoteCardProps) => {
  const { t } = useTranslation()

  return (
    <ProfileCardWrapper
      compact
      imgUrl={profileImgUrl}
      underHeaderComponent={<MembershipPill daoName={daoName} ghost isMember />}
      walletName={walletName}
    >
      <div className="flex flex-row justify-between items-center secondary-text">
        <p>{t('title.votingPower')}</p>
        <p className="font-mono text-text-primary">
          {formatPercentOf100(votingPower)}
        </p>
      </div>

      <div className="flex flex-row justify-between items-center mt-3 mb-4 secondary-text">
        <p>{t('title.vote')}</p>
        <p className="font-mono text-text-primary">{t('info.pending')}</p>
      </div>

      <ProfileVoteButton pressed={variant === 'yes'} variant="yes" />

      <ProfileVoteButton pressed={variant === 'abstain'} variant="abstain" />

      <ProfileVoteButton pressed={variant === 'no'} variant="no" />

      <ProfileVoteButton
        pressed={variant === 'noWithVeto'}
        variant="noWithVeto"
      />

      <Button
        className="mt-4"
        contentContainerClassName={clsx('justify-center', {
          'primary-text': variant === 'unselected',
        })}
        disabled={variant === 'unselected'}
        loading={loading}
        size="lg"
        variant={variant === 'unselected' || loading ? 'secondary' : 'primary'}
      >
        {t('button.castYourVote')}
      </Button>
    </ProfileCardWrapper>
  )
}
