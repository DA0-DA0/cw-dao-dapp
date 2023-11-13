import { LoadingData } from '../misc'
import { ProfileNewProposalCardInfoLine } from '../proposal-module-adapter'
import { ProfileCardWrapperProps } from './ProfileCardWrapper'

export interface ProfileNewProposalCardAddress {
  label: string
  address: string
}

export interface ProfileNewProposalCardProps
  extends Omit<
    ProfileCardWrapperProps,
    | 'children'
    | 'underHeaderComponent'
    | 'childContainerClassName'
    | 'established'
    | 'compact'
  > {
  daoName: string
  isMember: LoadingData<boolean>
  info: LoadingData<{
    lines: ProfileNewProposalCardInfoLine[]
    addresses: ProfileNewProposalCardAddress[]
  }>
}
