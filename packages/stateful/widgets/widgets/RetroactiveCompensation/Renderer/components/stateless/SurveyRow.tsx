import clsx from 'clsx'
import { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ProposalWalletVote,
  Tooltip,
  useDao,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import { LinkWrapperProps, WidgetId } from '@dao-dao/types'
import { formatDateTimeTz } from '@dao-dao/utils'

import { PagePath, SurveyStatus, SurveyWithMetadata } from '../../types'

export type SurveyRowProps = {
  /**
   * The active survey.
   */
  survey: SurveyWithMetadata
  /**
   * Whether or not a wallet is connected.
   */
  connected: boolean
  /**
   * Whether or not the current wallet was a member of the DAO when the survey
   * was created.
   */
  isMember: boolean
  /**
   * Stateful link wrapper component.
   */
  LinkWrapper: ComponentType<LinkWrapperProps>
}

export const SurveyRow = ({
  survey: {
    contribution,
    rated,
    survey: {
      uuid,
      status,
      name,
      contributionsOpenAt,
      contributionsCloseRatingsOpenAt,
      ratingsCloseAt,
    },
  },
  connected,
  isMember,
  LinkWrapper,
}: SurveyRowProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { getDaoPath } = useDaoNavHelpers()

  // Display upcoming date first, then date when contributions close. Even
  // during processing, show the date when contributions closed.
  const date =
    status === SurveyStatus.Inactive
      ? t('info.opensAtDate', {
          date: formatDateTimeTz(new Date(contributionsOpenAt)),
        })
      : status === SurveyStatus.AcceptingContributions
        ? t('info.closesAtDate', {
            date: formatDateTimeTz(new Date(contributionsCloseRatingsOpenAt)),
          })
        : isMember
          ? // If member and no longer accepting contributions, use ratings close date instead of contributions close date since that's more relevant.
            status === SurveyStatus.AcceptingRatings
            ? t('info.closesAtDate', {
                date: formatDateTimeTz(new Date(ratingsCloseAt)),
              })
            : t('info.closedAtDate', {
                date: formatDateTimeTz(new Date(ratingsCloseAt)),
              })
          : t('info.closedAtDate', {
              date: formatDateTimeTz(new Date(contributionsCloseRatingsOpenAt)),
            })

  const submitted =
    connected &&
    ((!isMember && !!contribution) ||
      (isMember &&
        (status === SurveyStatus.AcceptingContributions
          ? !!contribution
          : status === SurveyStatus.AcceptingRatings
            ? rated
            : // Always display pending/badge when awaiting completion.
              false)))
  const canPerformAction =
    connected &&
    (status === SurveyStatus.AcceptingContributions ||
      (isMember &&
        (status === SurveyStatus.AcceptingRatings ||
          status === SurveyStatus.AwaitingCompletion)))
  // Don't show if wallet not connected or inactive (upcoming).
  const statusDisplay = connected && status !== SurveyStatus.Inactive && (
    <ProposalWalletVote
      className={clsx(
        '!w-auto ring-2 ring-inset',
        submitted
          ? 'text-text-body ring-component-badge-valid'
          : canPerformAction
            ? 'text-text-body ring-component-badge-brand'
            : 'text-text-tertiary ring-border-secondary'
      )}
      label={
        submitted
          ? t('info.submitted')
          : canPerformAction
            ? t('info.pending')
            : // Did not submit when it was open.
              t('info.noSubmission')
      }
      showBadge={
        // True when isMember and status is awaiting completion, since submitted
        // is set to false.
        !submitted && canPerformAction
      }
    />
  )

  const tooltip = isMember
    ? undefined
    : status === SurveyStatus.AcceptingRatings ||
        status === SurveyStatus.AwaitingCompletion
      ? t('info.submissionsBeingRated')
      : undefined

  return (
    <Tooltip title={tooltip}>
      <LinkWrapper
        className={clsx(
          'block rounded-md bg-background-secondary cursor-pointer transition hover:bg-background-interactive-hover active:bg-background-interactive-pressed'
        )}
        href={getDaoPath(
          dao.coreAddress,
          [WidgetId.RetroactiveCompensation, PagePath.View, uuid].join('/')
        )}
        shallow
      >
        {/* Desktop */}
        <div className="hidden h-12 flex-row items-center gap-6 p-3 sm:flex">
          <p className="body-text grow truncate">{name}</p>

          <p className="caption-text shrink-0 break-words text-right font-mono">
            {date}
          </p>

          {statusDisplay}
        </div>

        {/* Mobile */}
        <div className="flex flex-col justify-between gap-2 rounded-md p-4 text-sm sm:hidden">
          <div className="flex flex-row items-start justify-between gap-3">
            <p className="body-text break-words">{name}</p>
            {statusDisplay}
          </div>

          <div className="flex flex-row items-center justify-between gap-6">
            <p className="caption-text shrink-0 break-words text-right font-mono">
              {date}
            </p>
          </div>
        </div>
      </LinkWrapper>
    </Tooltip>
  )
}
