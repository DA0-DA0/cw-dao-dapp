import {
  Close,
  GavelRounded,
  Speed,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import { ComponentType, useState } from 'react'
import {
  FieldValues,
  SubmitErrorHandler,
  SubmitHandler,
  UnpackNestedValue,
  useFormContext,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import TimeAgo from 'react-timeago'

import {
  ActiveThreshold,
  BaseNewProposalProps,
  LoadingData,
} from '@dao-dao/types'
import {
  formatDateTime,
  formatPercentOf100,
  formatTime,
  processError,
} from '@dao-dao/utils'

import { useHoldingKey } from '../../hooks'
import { Button } from '../buttons'
import { IconButton } from '../icon_buttons'
import { FilterableItem, FilterableItemPopup } from '../popup'
import { Tooltip } from '../tooltip'

enum ProposeSubmitValue {
  Preview = 'Preview',
  Submit = 'Submit',
}

type BaseProps<FormData extends FieldValues = any> = Omit<
  BaseNewProposalProps<FormData>,
  'onCreateSuccess'
>

export type NewProposalProps<
  FormData extends FieldValues = any,
  ProposalData extends unknown = any
> = BaseProps<FormData> & {
  content: {
    Header: ComponentType
    Main: ComponentType<Pick<BaseProps<FormData>, 'actionsReadOnlyMode'>>
    Preview: ComponentType
  }
  getProposalDataFromFormData: (
    formData: UnpackNestedValue<FormData>
  ) => Promise<ProposalData>
  createProposal: (newProposalData: ProposalData) => Promise<void>
  simulateProposal: (newProposalData: ProposalData) => Promise<void>
  proposalTitle: string
  isWalletConnecting: boolean
  additionalSubmitError?: string
  isPaused: boolean
  isActive: boolean
  activeThreshold: ActiveThreshold | null
  isMember: LoadingData<boolean>
  /**
   * If defined, this is the reason why the user cannot propose.
   */
  cannotProposeReason?: string
  depositUnsatisfied: boolean
  connected: boolean
  simulationBypassExpiration?: Date
}

export const NewProposal = <
  FormData extends FieldValues = any,
  ProposalData extends unknown = any
>({
  content: { Header, Main, Preview },
  getProposalDataFromFormData,
  createProposal,
  simulateProposal,
  proposalTitle,
  isWalletConnecting,
  additionalSubmitError,
  isPaused,
  isActive,
  activeThreshold,
  isMember,
  cannotProposeReason,
  depositUnsatisfied,
  connected,
  draft,
  saveDraft,
  drafts,
  loadDraft,
  unloadDraft,
  draftSaving,
  deleteDraft,
  simulationBypassExpiration,
  proposalModuleSelector,
  actionsReadOnlyMode,
  ProposalDaoInfoCards,
}: NewProposalProps<FormData, ProposalData>) => {
  const { t } = useTranslation()

  const { getValues, handleSubmit } = useFormContext<FormData>()

  const [showPreview, setShowPreview] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const holdingAltForSimulation = useHoldingKey({ key: 'alt' })
  const holdingShiftForForce = useHoldingKey({ key: 'shift' })

  const [loading, setLoading] = useState(false)

  const onSubmitForm: SubmitHandler<FormData> = async (formData, event) => {
    setSubmitError('')

    const nativeEvent = event?.nativeEvent as SubmitEvent
    const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value

    if (submitterValue === ProposeSubmitValue.Preview) {
      return
    }

    setLoading(true)
    try {
      const data = await getProposalDataFromFormData(formData)
      if (holdingAltForSimulation) {
        await simulateProposal(data)
      } else {
        await createProposal(data)
      }
    } catch (err) {
      console.error(err)
      setSubmitError(
        processError(err, {
          forceCapture: false,
        })
      )
    } finally {
      setLoading(false)
    }
  }

  const onSubmitError: SubmitErrorHandler<FormData> = async (errors) => {
    console.error('Form errors', errors)

    // Even on error, try to simulate proposal.
    if (holdingAltForSimulation) {
      setLoading(true)
      try {
        const data = await getProposalDataFromFormData(getValues())
        await simulateProposal(data)
      } catch (err) {
        console.error(err)
        setSubmitError(
          processError(err, {
            forceCapture: false,
          })
        )
      } finally {
        setLoading(false)
      }

      // Even on error, force publish if holding shift.
    } else if (holdingShiftForForce) {
      setLoading(true)
      try {
        const data = await getProposalDataFromFormData(getValues())
        await createProposal(data)
      } catch (err) {
        console.error(err)
        setSubmitError(
          processError(err, {
            forceCapture: false,
          })
        )
      } finally {
        setLoading(false)
      }

      // If not simulating or forcing, show error to check for errors.
    } else {
      setSubmitError(t('error.correctErrorsAbove'))
    }
  }

  return (
    <form
      className="flex flex-col gap-8"
      noValidate={holdingAltForSimulation || holdingShiftForForce}
      onSubmit={handleSubmit(onSubmitForm, onSubmitError)}
    >
      <Header />

      {!actionsReadOnlyMode && proposalModuleSelector}

      <div className="-mt-6">
        <ProposalDaoInfoCards />
      </div>

      <Main actionsReadOnlyMode={actionsReadOnlyMode} />

      <div className="flex flex-col gap-2 border-y border-border-secondary py-6">
        <div className="flex flex-row items-center justify-between gap-6">
          <p className="title-text text-text-body">
            {t('info.reviewYourProposal')}
          </p>

          <div className="flex flex-row items-center justify-end gap-2">
            <Button
              disabled={loading}
              onClick={() => setShowPreview((p) => !p)}
              type="submit"
              value={ProposeSubmitValue.Preview}
              variant="secondary"
            >
              {showPreview ? (
                <>
                  {t('button.hidePreview')}
                  <VisibilityOff className="!h-5 !w-5" />
                </>
              ) : (
                <>
                  {t('button.preview')}
                  <Visibility className="!h-5 !w-5" />
                </>
              )}
            </Button>

            <Tooltip
              title={
                holdingAltForSimulation
                  ? undefined
                  : holdingShiftForForce
                  ? t('info.forcePublishTooltip')
                  : !connected
                  ? t('error.logInToContinue')
                  : depositUnsatisfied
                  ? t('error.notEnoughForDeposit')
                  : isPaused
                  ? t('error.daoIsPaused')
                  : !isActive && activeThreshold
                  ? t('error.daoIsInactive', {
                      context:
                        'percentage' in activeThreshold
                          ? 'percent'
                          : 'absolute',
                      percent:
                        'percentage' in activeThreshold
                          ? formatPercentOf100(
                              Number(activeThreshold.percentage.percent) * 100
                            )
                          : undefined,
                      count:
                        'percentage' in activeThreshold
                          ? undefined
                          : Number(activeThreshold.absolute_count.count),
                    })
                  : additionalSubmitError
              }
            >
              <Button
                disabled={
                  // Only worry about these wallet-specific conditions if not
                  // simulating.
                  (!holdingAltForSimulation &&
                    (!connected ||
                      !!cannotProposeReason ||
                      depositUnsatisfied ||
                      isPaused ||
                      !isActive)) ||
                  // If additional error exists, disable button.
                  !!additionalSubmitError
                }
                loading={loading}
                type="submit"
                value={ProposeSubmitValue.Submit}
              >
                {holdingAltForSimulation ? (
                  <>
                    <p>{t('button.simulate')}</p>
                    <Speed className="!h-5 !w-5" />
                  </>
                ) : holdingShiftForForce ? (
                  <>
                    <p>{t('button.forcePublish')}</p>
                    <GavelRounded className="!h-4 !w-4" />
                  </>
                ) : (
                  <>
                    <p>
                      {simulationBypassExpiration ? (
                        // If bypassing simulation, change button label and show
                        // a countdown until simulation bypass expires.
                        <TimeAgo
                          date={simulationBypassExpiration}
                          formatter={(value, _, suffix) =>
                            suffix === 'from now'
                              ? t('button.publishAnywayWithCountdown', {
                                  secondsRemaining: value,
                                })
                              : // In case the countdown expires before the re-render,
                                // just show the original button label.
                                t('button.publish')
                          }
                        />
                      ) : (
                        t('button.publish')
                      )}
                    </p>
                    <GavelRounded className="!h-4 !w-4" />
                  </>
                )}
              </Button>
            </Tooltip>
          </div>
        </div>

        {!!cannotProposeReason && !isMember.loading && !isWalletConnecting && (
          <p className="secondary-text max-w-prose self-end text-right text-text-interactive-error">
            {cannotProposeReason}
          </p>
        )}

        {simulationBypassExpiration && (
          <p className="secondary-text max-w-prose self-end text-right text-text-interactive-warning-body">
            {t('info.bypassSimulationExplanation')}
          </p>
        )}

        {!!submitError && (
          <p className="secondary-text self-end text-right text-text-interactive-error">
            {submitError}
          </p>
        )}

        {showPreview && (
          <div className="mt-4 rounded-md border border-border-secondary p-6">
            <Preview />
          </div>
        )}
      </div>

      <div className="flex flex-row items-center justify-end gap-2">
        {draft ? (
          <>
            <p
              className={clsx(
                'caption-text italic',
                draftSaving && 'animate-pulse'
              )}
            >
              {draftSaving
                ? t('info.draftSaving')
                : t('info.draftSavedAtTime', {
                    time: formatTime(new Date(draft.lastUpdatedAt)),
                  })}
            </p>

            <Tooltip
              title={draftSaving ? undefined : t('info.draftStillSaved')}
            >
              <Button
                className="caption-text -ml-1"
                disabled={draftSaving}
                onClick={unloadDraft}
                variant="underline"
              >
                {t('button.resetQuestion')}
              </Button>
            </Tooltip>
          </>
        ) : (
          <>
            {drafts.length > 0 && !!loadDraft && (
              <FilterableItemPopup
                filterableItemKeys={FILTERABLE_KEYS}
                items={drafts.map(
                  ({ name, createdAt, lastUpdatedAt }, index) => ({
                    key: createdAt,
                    label: name,
                    description: (
                      <>
                        {t('title.created')}:{' '}
                        {formatDateTime(new Date(createdAt))}
                        <br />
                        {t('title.lastUpdated')}:{' '}
                        {formatDateTime(new Date(lastUpdatedAt))}
                      </>
                    ),
                    rightNode: (
                      <Tooltip title={t('button.deleteDraft')}>
                        <IconButton
                          Icon={Close}
                          onClick={(event) => {
                            // Don't click on item button.
                            event.stopPropagation()
                            deleteDraft(index)
                          }}
                          variant="ghost"
                        />
                      </Tooltip>
                    ),
                  })
                )}
                onSelect={(_, index) => loadDraft(index)}
                searchPlaceholder={t('info.searchDraftPlaceholder')}
                trigger={{
                  type: 'button',
                  props: {
                    variant: 'secondary',
                    children: t('button.loadDraft'),
                  },
                }}
              />
            )}

            <Tooltip
              title={
                proposalTitle ? undefined : t('info.enterNameBeforeSavingDraft')
              }
            >
              <Button
                disabled={!proposalTitle}
                onClick={saveDraft}
                variant="secondary"
              >
                {t('button.saveDraft')}
              </Button>
            </Tooltip>
          </>
        )}
      </div>
    </form>
  )
}

const FILTERABLE_KEYS: Fuse.FuseOptionKey<FilterableItem>[] = ['label']
