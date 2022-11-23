import { Publish } from '@mui/icons-material'
import { ComponentType } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  Button,
  InputErrorMessage,
  MarkdownPreview,
  TextAreaInput,
  Tooltip,
} from '@dao-dao/stateless'
import { WalletProfile } from '@dao-dao/types'
import { formatDateTimeTz, validateRequired } from '@dao-dao/utils'

import { Status, SurveyStatus } from '../../types'

interface ContributionFormData {
  contribution: string
}

export interface ContributionFormProps {
  status: Status
  onSubmit: (contribution: string) => Promise<void>
  loading: boolean
  walletProfile: WalletProfile
  ProfileDisplay: ComponentType
}

export const ContributionForm = ({
  status: { survey, contribution: existingContribution },
  onSubmit,
  loading,
  walletProfile,
  ProfileDisplay,
}: ContributionFormProps) => {
  const { t } = useTranslation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContributionFormData>({
    defaultValues: {
      contribution: existingContribution || '',
    },
  })

  const contributed = !!existingContribution

  const dateText =
    survey.status === SurveyStatus.Inactive
      ? t('info.surveyOpensAtAndClosesAt', {
          openDate: formatDateTimeTz(new Date(survey.contributionsOpenAt)),
          closeDate: formatDateTimeTz(
            new Date(survey.contributionsCloseRatingsOpenAt)
          ),
        })
      : t('info.surveyClosesAt', {
          date: formatDateTimeTz(
            new Date(survey.contributionsCloseRatingsOpenAt)
          ),
        })

  return (
    <form
      className="flex grow flex-col gap-6"
      onSubmit={handleSubmit(({ contribution }) => onSubmit(contribution))}
    >
      {/* Hidden on small screens. Moves below so it is centered with the column. */}
      <div className="hidden max-w-prose space-y-1 break-words lg:block">
        <p className="hero-text">{survey.name}</p>
        <p className="caption-text italic">{dateText}</p>
      </div>

      <div className="mx-auto flex max-w-prose flex-col gap-6 lg:mx-0 lg:max-w-full lg:flex-row">
        {/* Hidden on large screens. Moves to top so it is above both the markdown and the contribution form. */}
        <div className="space-y-1 break-words lg:hidden">
          <p className="hero-text">{survey.name}</p>
          <p className="caption-text italic">{dateText}</p>
        </div>

        <MarkdownPreview
          className="min-w-0"
          markdown={survey.contributionInstructions}
        />

        <div className="flex grow flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="primary-text text-text-body">{t('title.you')}</p>

            <ProfileDisplay />

            <p className="caption-text italic">
              {t('info.surveyProfileExplanation')}
            </p>

            {!walletProfile.name && (
              <p className="caption-text text-text-interactive-error">
                {t('error.surveyNeedsProfileName')}
              </p>
            )}
          </div>

          {contributed && (
            <p className="legend-text text-text-interactive-valid">
              {t('form.contributionSubmitted')}
            </p>
          )}

          <div className="flex flex-col">
            <TextAreaInput
              error={errors.contribution}
              fieldName="contribution"
              placeholder={t('form.iContributedPlaceholder')}
              register={register}
              rows={10}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={errors.contribution} />
          </div>

          <Tooltip
            title={
              survey.status === SurveyStatus.Inactive
                ? t('info.surveyOpensAt', {
                    date: formatDateTimeTz(
                      new Date(survey.contributionsOpenAt)
                    ),
                  })
                : !walletProfile.name
                ? t('error.surveyNeedsProfileName')
                : undefined
            }
          >
            <Button
              className="mb-10 self-end"
              disabled={
                survey.status === SurveyStatus.Inactive || !walletProfile.name
              }
              loading={loading}
              type="submit"
            >
              <p>{contributed ? t('button.update') : t('button.submit')}</p>
              <Publish className="!h-4 !w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </form>
  )
}
