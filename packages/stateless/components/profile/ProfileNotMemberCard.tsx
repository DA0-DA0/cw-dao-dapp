import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { MembershipPill } from './MembershipPill'
import {
  ProfileCardWrapper,
  ProfileCardWrapperProps,
} from './ProfileCardWrapper'

export interface ProfileNotMemberCardProps
  extends Omit<
    ProfileCardWrapperProps,
    | 'children'
    | 'underHeaderComponent'
    | 'childContainerClassName'
    | 'established'
    | 'compact'
  > {
  daoName: string
  established: Date
  membershipInfo: ReactNode
}

export const ProfileNotMemberCard = ({
  daoName,
  established,
  membershipInfo,
  ...wrapperProps
}: ProfileNotMemberCardProps) => {
  const { t } = useTranslation()

  return (
    <ProfileCardWrapper
      established={established}
      underHeaderComponent={
        <MembershipPill daoName={daoName} isMember={false} />
      }
      {...wrapperProps}
    >
      <p className="link-text mb-1">{t('title.membership')}</p>

      {membershipInfo}
    </ProfileCardWrapper>
  )
}
