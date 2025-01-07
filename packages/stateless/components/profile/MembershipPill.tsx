import { Check, Close } from '@mui/icons-material'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

export interface MembershipPillProps {
  isMember: boolean
  // We should use LoadingData<boolean> for isMember instead, but many
  // components use this component with a boolean, so we need to clean those up
  // before changing this. For now, add an optional flag to indicate loading.
  loadingIsMember?: boolean
  daoName: string
  // Only display text.
  ghost?: boolean
}

export const MembershipPill = ({
  isMember,
  loadingIsMember,
  daoName,
  ghost,
}: MembershipPillProps) => {
  const { t } = useTranslation()

  const text = loadingIsMember
    ? t('info.loadingMembership')
    : isMember
      ? t('title.memberOfDao', { daoName })
      : t('title.notAMember')
  const Icon = isMember ? Check : Close

  return (
    <div
      className={clsx(
        'link-text max-w-full',
        ghost
          ? 'caption-text text-text-secondary'
          : 'flex flex-row items-center gap-2 rounded-full border-2 border-border-primary py-1 px-[10px]',
        !isMember && 'text-text-interactive-disabled',
        loadingIsMember && 'animate-pulse'
      )}
    >
      <p className="truncate">{text}</p>
      {!ghost && !loadingIsMember && <Icon className="!h-4 !w-4 shrink-0" />}
    </div>
  )
}
