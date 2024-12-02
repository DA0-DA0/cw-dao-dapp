import clsx from 'clsx'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { InputLabel, ProposalVoteButton, Switch } from '@dao-dao/stateless'
import { ProposalVoteOption } from '@dao-dao/types'

export type ProposalInstantVoterProps<Vote> = {
  /**
   * Vote options.
   */
  options: ProposalVoteOption<Vote>[]
  /**
   * How to determine if a given vote option is selected.
   */
  isSelected: (option: Vote, value: Vote) => boolean
  /**
   * Field name for the vote form field.
   */
  fieldName: string
  /**
   * Optional container class name.
   */
  className?: string
}

/**
 * A form for editing proposal execution metadata. It expects to be within a
 * form context whose data has a `metadata` field with type
 * `ProposalExecutionMetadata`.
 */
export const ProposalInstantVoter = <Vote extends unknown>({
  options,
  isSelected,
  fieldName,
  className,
}: ProposalInstantVoterProps<Vote>) => {
  const { t } = useTranslation()

  const { watch, setValue } = useFormContext<{
    vote: any
  }>()

  const voteFieldName = fieldName as 'vote'
  const vote = watch('vote')

  const toggle = () =>
    vote
      ? setValue(voteFieldName, undefined)
      : setValue(voteFieldName, options[0].value)

  return (
    <div
      className={clsx(
        'flex flex-col gap-4 animate-fade-in items-start',
        className
      )}
    >
      <div className="flex flex-row gap-3 items-center">
        <Switch enabled={!!vote} onClick={toggle} sizing="md" />

        <InputLabel
          name={t('title.instantVote')}
          onClick={toggle}
          title
          tooltip={t('info.instantVoteTooltip')}
        />
      </div>

      <div className="flex flex-col gap-1 min-w-56">
        {options.map((option, index) => (
          <ProposalVoteButton
            key={index}
            onClick={() =>
              vote && isSelected(option.value, vote)
                ? setValue(voteFieldName, undefined)
                : setValue(voteFieldName, option.value)
            }
            option={option}
            pressed={!!vote && isSelected(option.value, vote)}
          />
        ))}
      </div>
    </div>
  )
}
