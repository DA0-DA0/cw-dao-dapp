import { Add, Circle, Close, CopyAllOutlined } from '@mui/icons-material'
import clsx from 'clsx'
import cloneDeep from 'lodash.clonedeep'
import { ComponentType, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ActionsEditor,
  Button,
  DropdownIconButton,
  IconButton,
  InputErrorMessage,
  ProposalExecutionMetadataEditor,
  TextAreaInput,
  TextInput,
} from '@dao-dao/stateless'
import {
  MultipleChoiceNewProposalForm,
  MultipleChoiceOptionFormData,
  SuspenseLoaderProps,
} from '@dao-dao/types'
import { validateRequired } from '@dao-dao/utils'

export type MultipleChoiceOptionEditorProps = {
  optionIndex: number
  removeOption: () => void
  addOption: (value: Partial<MultipleChoiceOptionFormData>) => void
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
}

export const MultipleChoiceOptionEditor = ({
  optionIndex,
  removeOption,
  addOption,
  SuspenseLoader,
}: MultipleChoiceOptionEditorProps) => {
  const { t } = useTranslation()

  const {
    register,
    watch,
    getValues,
    formState: { errors },
  } = useFormContext<MultipleChoiceNewProposalForm>()

  const errorsOption = errors?.choices?.[optionIndex]

  const [expanded, setExpanded] = useState(true)
  const toggleExpanded = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
  }

  const description = watch(`choices.${optionIndex}.description`)

  // Default to if description exists, in case of duplication.
  const [showingDescription, setShowingDescription] = useState(!!description)

  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center gap-6">
        <div className="flex grow flex-row items-center gap-2">
          <DropdownIconButton open={expanded} toggle={toggleExpanded} />

          <Circle
            className="!h-4 !w-4"
            style={{
              color:
                MULTIPLE_CHOICE_OPTION_COLORS[
                  optionIndex % MULTIPLE_CHOICE_OPTION_COLORS.length
                ],
            }}
          />

          <div className="flex grow flex-col gap-1">
            <TextInput
              className="!title-text"
              error={errorsOption?.title}
              fieldName={`choices.${optionIndex}.title`}
              ghost
              maxLength={64}
              placeholder={t('form.multipleChoiceOptionTitlePlaceholder')}
              register={register}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={errorsOption?.title} />
          </div>
        </div>

        <div className="flex flex-row items-center gap-1">
          <IconButton
            Icon={CopyAllOutlined}
            onClick={() =>
              addOption(cloneDeep(getValues(`choices.${optionIndex}`)))
            }
            variant="ghost"
          />
          <IconButton Icon={Close} onClick={removeOption} variant="ghost" />
        </div>
      </div>

      <div
        className={clsx(
          'ml-[calc(0.75rem-1.5px)] mt-4 flex flex-col gap-4 border-l-[3px] border-border-interactive-focus pt-1 pl-5',
          !expanded && 'hidden'
        )}
      >
        {showingDescription ? (
          <>
            <p className="primary-text text-text-body">
              {t('form.description')}
            </p>

            <div className="flex flex-col">
              <TextAreaInput
                autoFocus
                error={errorsOption?.description}
                fieldName={`choices.${optionIndex}.description`}
                placeholder={t(
                  'form.multipleChoiceOptionDescriptionPlaceholder'
                )}
                register={register}
                rows={5}
              />
              <InputErrorMessage error={errorsOption?.description} />
            </div>
          </>
        ) : (
          <Button
            className="self-start"
            onClick={() => setShowingDescription(true)}
            variant="ghost"
          >
            <Add className="text-icon-secondary" />
            {t('button.addADescriptionOptional')}
          </Button>
        )}

        <p className="title-text mb-1">{t('title.actions')}</p>

        <ActionsEditor
          SuspenseLoader={SuspenseLoader}
          actionDataErrors={errorsOption?.actionData}
          actionDataFieldName={`choices.${optionIndex}.actionData`}
        />

        <ProposalExecutionMetadataEditor
          className="mt-2"
          errors={errorsOption}
          fieldNamePrefix={`choices.${optionIndex}.`}
        />
      </div>
    </div>
  )
}

export const MULTIPLE_CHOICE_OPTION_COLORS = [
  '#8B2EFF',
  '#4F00FF',
  '#004EFF',
  '#00B3FF',
  '#00FFAE',
  '#9BFF00',
  '#FCFF67',
  '#D9D9D9',
  '#FFBA00',
  '#FF6E00',
  '#FF2E00',
]
