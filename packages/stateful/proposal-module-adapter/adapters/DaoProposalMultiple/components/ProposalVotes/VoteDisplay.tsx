import { useTranslation } from 'react-i18next'

import {
  MultipleChoiceProposal,
  MultipleChoiceVote,
} from '@dao-dao/types/contracts/DaoProposalMultiple'

import { useVoteOptions } from '../../hooks/useVoteOptions'
import { MULTIPLE_CHOICE_OPTION_COLORS } from '../ui/MultipleChoiceOption'

interface VoteDisplayProps {
  vote: MultipleChoiceVote
  proposal?: MultipleChoiceProposal
}

export const VoteDisplay = ({ vote, proposal }: VoteDisplayProps) => {
  const { t } = useTranslation()
  const voteOptions = useVoteOptions(proposal!)
  const voteOption = voteOptions.find(
    ({ value }) => value.option_id === vote.option_id
  )

  if (!voteOption) {
    throw new Error(t('error.loadingData'))
  }

  const { label } = voteOption

  return (
    <div className="inline-flex w-full flex-row items-center gap-3 font-sans text-xs font-medium">
      <p
        className={
          voteOption.style
            ? 'text-icon-interactive-valid'
            : 'text-icon-secondary'
        }
        style={{
          color:
            MULTIPLE_CHOICE_OPTION_COLORS[
              vote.option_id % MULTIPLE_CHOICE_OPTION_COLORS.length
            ],
        }}
      >
        {label}
      </p>
    </div>
  )
}
