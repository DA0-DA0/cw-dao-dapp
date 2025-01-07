import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { ProposalWalletVote as StatelessProposalWalletVote } from '@dao-dao/stateless'
import { BaseProposalWalletVoteProps } from '@dao-dao/types'
import { MultipleChoiceVote } from '@dao-dao/types/contracts/DaoProposalMultiple'

import { useLoadingProposal } from '../hooks'

export const ProposalWalletVote = ({
  vote,
  fallback,
}: BaseProposalWalletVoteProps<MultipleChoiceVote>) => {
  const { t } = useTranslation()

  const proposal = useLoadingProposal()
  const label = proposal.loading
    ? '...'
    : vote === undefined
      ? t(`proposalVoteTitle.${fallback === 'hasNoVote' ? 'none' : fallback}`)
      : proposal.data.choices[vote.option_id].title

  const className = getProposalWalletVoteClassName(vote?.option_id, fallback)

  return (
    <StatelessProposalWalletVote
      className={clsx(className, proposal.loading && 'animate-pulse')}
      label={label}
      showBadge={!vote && fallback === 'pending'}
    />
  )
}

export const getProposalWalletVoteClassName = (
  optionId?: number,
  fallback?: string
) =>
  optionId !== undefined
    ? 'text-text-body ring-2 ring-inset ring-component-badge-primary'
    : fallback === 'pending'
      ? 'text-text-body ring-2 ring-inset ring-component-badge-brand'
      : // fallback === 'hasNoVote'
        'text-text-tertiary ring-2 ring-inset ring-border-secondary'
