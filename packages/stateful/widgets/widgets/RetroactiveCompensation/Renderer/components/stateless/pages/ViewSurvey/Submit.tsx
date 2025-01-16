import { Publish } from '@mui/icons-material'
import { ComponentType } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button, Loader, MarkdownRenderer, Tooltip } from '@dao-dao/stateless'
import { Entity, LoadingData, TransProps } from '@dao-dao/types'
import { formatDateTimeTz } from '@dao-dao/utils'

import {
  ContributionFormData,
  SurveyStatus,
  SurveyWithMetadata,
} from '../../../../types'
import { extractContributionFormDataFromSurvey } from '../../../../utils'
import { ContributionFormInput } from '../../ContributionFormInput'

export type SubmitProps = {
  /**
   * Whether or not a wallet is connected.
   */
  connected: boolean
  /**
   * The active survey.
   */
  status: SurveyWithMetadata
  /**
   * Callback to submit form data.
   */
  onSubmit: (data: ContributionFormData) => Promise<void>
  /**
   * Whether or not the form is being submitted.
   */
  loading: boolean
  /**
   * The wallet entity.
   */
  loadingEntity: LoadingData<Entity>
  /**
   * Wallet entity display.
   */
  EntityDisplay: ComponentType
  /**
   * Connect wallet button.
   */
  ConnectWallet: ComponentType
  /**
   * Stateful i18n translation component.
   */
  Trans: ComponentType<TransProps>
}

export const Submit = ({
  connected,
  status,
  onSubmit,
  loading,
  loadingEntity,
  EntityDisplay,
  ConnectWallet,
  Trans,
}: SubmitProps) => {
  const { survey } = status

  const { t } = useTranslation()

  const formMethods = useForm<ContributionFormData>({
    defaultValues: extractContributionFormDataFromSurvey(status),
  })

  const contributed = !!status.contribution

  const dateText =
    survey.status === SurveyStatus.Inactive
      ? t('info.intakeOpensAtAndClosesAt', {
          openDate: formatDateTimeTz(new Date(survey.contributionsOpenAt)),
          closeDate: formatDateTimeTz(
            new Date(survey.contributionsCloseRatingsOpenAt)
          ),
        })
      : t('info.intakeClosesAt', {
          date: formatDateTimeTz(
            new Date(survey.contributionsCloseRatingsOpenAt)
          ),
        })

  return (
    <form
      className="flex grow flex-col gap-6"
      onSubmit={formMethods.handleSubmit(onSubmit)}
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

        <MarkdownRenderer
          className="min-w-0"
          markdown={survey.contributionInstructions}
        />

        {connected ? (
          loadingEntity.loading ? (
            <Loader />
          ) : (
            <div className="flex min-w-[18rem] grow flex-col gap-4 pb-10">
              <div className="flex flex-col gap-2">
                <p className="primary-text text-text-body">
                  {t('title.yourSubmission')}
                </p>

                <EntityDisplay />

                {!loadingEntity.data.name && (
                  <p className="caption-text text-text-interactive-error">
                    {t('error.compensationCycleNeedsProfileName')}
                  </p>
                )}
              </div>

              <FormProvider {...formMethods}>
                <ContributionFormInput Trans={Trans} survey={survey} />
              </FormProvider>

              {contributed && (
                <p className="caption-text self-end text-right text-text-interactive-valid">
                  {t('form.contributionSubmitted')}
                </p>
              )}

              {survey.status === SurveyStatus.Inactive && (
                <p className="caption-text self-end text-right text-text-interactive-error">
                  {t('info.intakeOpensAt', {
                    date: formatDateTimeTz(
                      new Date(survey.contributionsOpenAt)
                    ),
                  })}
                </p>
              )}

              <Tooltip
                title={
                  survey.status === SurveyStatus.Inactive
                    ? t('info.intakeOpensAt', {
                        date: formatDateTimeTz(
                          new Date(survey.contributionsOpenAt)
                        ),
                      })
                    : !loadingEntity.data.name
                      ? t('error.compensationCycleNeedsProfileName')
                      : undefined
                }
              >
                <Button
                  className="self-end"
                  disabled={
                    survey.status === SurveyStatus.Inactive ||
                    !loadingEntity.data.name
                  }
                  loading={loading}
                  type="submit"
                >
                  <p>{contributed ? t('button.update') : t('button.submit')}</p>
                  <Publish className="!h-4 !w-4" />
                </Button>
              </Tooltip>
            </div>
          )
        ) : (
          <div className="flex grow flex-row items-start justify-end">
            <ConnectWallet />
          </div>
        )}
      </div>
    </form>
  )
}
