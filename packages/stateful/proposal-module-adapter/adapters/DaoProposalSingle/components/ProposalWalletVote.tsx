import { useTranslation } from 'react-i18next'

import { ProposalWalletVote as StatelessProposalWalletVote } from '@dao-dao/stateless'
import {
  BaseProposalWalletVoteProps,
  PreProposeModuleType,
} from '@dao-dao/types'
import { Vote } from '@dao-dao/types/contracts/DaoProposalSingle.common'

import { useProposalModuleAdapterOptions } from '../../../react'

type VoteOrKey = Vote | 'pending' | 'hasNoVote'

export const ProposalWalletVote = ({
  vote,
  fallback,
}: BaseProposalWalletVoteProps<Vote>) => {
  const { t } = useTranslation()

  const key: VoteOrKey = vote ?? fallback
  const className = ProposalWalletVoteClassNameMap[key]

  // Change labels for pre-propose-approver proposals that are responsible for
  // approving another proposal, to make it more clear what the actions do.
  const {
    proposalModule: { prePropose },
  } = useProposalModuleAdapterOptions()
  const isPreProposeApproverProposal =
    prePropose?.type === PreProposeModuleType.Approver

  const label = t(
    `proposalVoteTitle.${
      key === 'hasNoVote'
        ? 'none'
        : isPreProposeApproverProposal
          ? (APPROVER_VOTE_MAP[key] ?? key)
          : key
    }`
  )

  return (
    <StatelessProposalWalletVote
      className={className}
      label={label}
      showBadge={key === 'pending'}
    />
  )
}

export const ProposalWalletVoteClassNameMap: Record<VoteOrKey, string> = {
  yes: 'text-text-body ring-2 ring-inset ring-component-badge-valid',
  no: 'text-text-body ring-2 ring-inset ring-component-badge-error',
  abstain: 'text-text-body ring-2 ring-inset ring-component-badge-primary',
  pending: 'text-text-body ring-2 ring-inset ring-component-badge-brand',
  hasNoVote: 'text-text-tertiary ring-2 ring-inset ring-border-secondary',
}

const APPROVER_VOTE_MAP: Partial<Record<VoteOrKey, string>> = {
  yes: 'approve',
  no: 'reject',
}
