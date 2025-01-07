import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  ApprovalProposalContext,
  ApprovalProposalContextType,
} from '@dao-dao/types'

import { Tooltip } from './tooltip'

export type ApprovalBadgeProps = {
  size: 'sm' | 'lg'
  context: ApprovalProposalContext
  tooltip?: boolean
  className?: string
}

export const ApprovalBadge = ({
  size,
  context,
  tooltip,
  className,
}: ApprovalBadgeProps) => {
  const { t } = useTranslation()

  // No need to show badge when rejected since the status is clear enough and
  // this badge makes it stand out.
  if (
    context.type === ApprovalProposalContextType.Approval &&
    context.status === 'rejected'
  ) {
    return null
  }

  return (
    <Tooltip
      title={
        tooltip
          ? context.type === ApprovalProposalContextType.Approval
            ? t('info.approvalProposalExplanation', {
                context: context.status,
              })
            : t('info.approverProposalExplanation', {
                context: context.status,
              })
          : undefined
      }
    >
      <p
        className={clsx(
          {
            'body-text rounded-md': size === 'sm',
            'title-text rounded-lg': size === 'lg',
          },
          'flex shrink-0 flex-row items-center bg-background-primary py-1 px-2',
          className
        )}
      >
        {context.type === 'approval'
          ? context.status === 'pending'
            ? t('title.needsApproval')
            : context.status === 'approved'
              ? t('title.accepted')
              : t('title.denied')
          : t('title.approval')}
      </p>
    </Tooltip>
  )
}
