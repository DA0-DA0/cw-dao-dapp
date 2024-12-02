import { Add, Block, Circle } from '@mui/icons-material'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ProposalInstantVoter } from '@dao-dao/stateless'
import { Feature } from '@dao-dao/types'

import { SuspenseLoader } from '../../../../../components'
import { useMembership } from '../../../../../hooks'
import { useProposalModuleAdapterCommonOptions } from '../../../../react/context'
import {
  MULTIPLE_CHOICE_OPTION_COLORS,
  MultipleChoiceOptionEditor,
} from '../../components/MultipleChoiceOptionEditor'
import { NewProposalForm } from '../../types'

export const NewProposalMain = () => {
  const { t } = useTranslation()
  const { control, watch, setValue } = useFormContext<NewProposalForm>()
  const { proposalModule } = useProposalModuleAdapterCommonOptions()
  const { isMember = false } = useMembership()

  const {
    fields: multipleChoiceFields,
    append: _addOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: 'choices',
    shouldUnregister: true,
  })

  const choices = watch('choices') ?? []
  const vote = watch('vote')

  const addOption = (...params: Parameters<typeof _addOption>) => {
    // If instant vote is set to "None of the Above", which is always
    // last, correct it.
    if (vote && vote.option_id === choices.length) {
      setValue('vote', { option_id: vote.option_id + 1 })
    }

    _addOption(...params)
  }

  return (
    <div className="flex flex-col gap-8">
      {choices.length > 0 && (
        <div className="flex flex-col items-stretch gap-6">
          {multipleChoiceFields.map(({ id }, index) => (
            <MultipleChoiceOptionEditor
              key={id}
              SuspenseLoader={SuspenseLoader}
              addOption={addOption}
              optionIndex={index}
              removeOption={() => {
                removeOption(index)

                if (vote) {
                  // If instant vote is set to this option, remove it.
                  if (vote.option_id === index) {
                    setValue('vote', undefined)
                  }
                  // If instant vote is set to a latter option, correct it.
                  else if (vote.option_id > index) {
                    setValue('vote', { option_id: vote.option_id - 1 })
                  }
                }
              }}
            />
          ))}
        </div>
      )}

      <div>
        <div
          className="flex cursor-pointer flex-row items-center gap-2 border-t border-border-secondary py-10"
          onClick={() =>
            addOption({
              title: '',
              description: '',
              actionData: [],
            })
          }
        >
          <Add className="!h-6 !w-6 text-icon-primary" />

          <Circle
            className="!h-4 !w-4"
            style={{
              color:
                MULTIPLE_CHOICE_OPTION_COLORS[
                  choices.length % MULTIPLE_CHOICE_OPTION_COLORS.length
                ],
            }}
          />

          <p className="title-text">{t('button.addNewOption')}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-border-secondary pt-10 pb-2">
          <div className="flex flex-row items-center gap-2">
            <div className="h-6 w-6"></div>

            <Block className="!h-4 !w-4 text-icon-primary" />

            <p className="title-text">{t('title.noneOfTheAbove')}</p>
          </div>

          <p className="caption-text ml-14">
            {t('info.cannotRemoveNoneOption')}
          </p>
        </div>
      </div>

      {isMember && proposalModule.supports(Feature.CastVoteOnProposalCreation) && (
        <ProposalInstantVoter
          className="pt-10 border-t border-border-secondary"
          fieldName="vote"
          isSelected={(option, vote) => option.option_id === vote.option_id}
          options={[
            ...choices.map(({ title }, index) => ({
              Icon: Circle,
              label: title,
              value: { option_id: index },
              color:
                MULTIPLE_CHOICE_OPTION_COLORS[
                  index % MULTIPLE_CHOICE_OPTION_COLORS.length
                ],
            })),
            // "None of the Above" is automatically added.
            {
              Icon: Block,
              label: 'None of the Above',
              value: { option_id: choices.length },
              color: 'var(--icon-tertiary)',
            },
          ]}
        />
      )}
    </div>
  )
}
