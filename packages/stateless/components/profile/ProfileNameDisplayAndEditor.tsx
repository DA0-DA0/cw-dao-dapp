import { Check, Close, Edit } from '@mui/icons-material'
import clsx from 'clsx'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  ChainId,
  LoadingData,
  PfpkProfileUpdateFunction,
  UnifiedProfile,
} from '@dao-dao/types'
import { processError } from '@dao-dao/utils'

import { Button } from '../buttons'
import { ChainLogo } from '../chain/ChainLogo'
import { IconButton } from '../icon_buttons'
import { TextInput } from '../inputs'
import { Loader } from '../logo'
import { Tooltip, TooltipInfoIcon } from '../tooltip'

export type ProfileNameDisplayAndEditorProps = {
  profile: LoadingData<UnifiedProfile>
  compact?: boolean
  updateProfile?: PfpkProfileUpdateFunction
  className?: string
  header?: boolean
  editingClassName?: string
  hideNoNameTooltip?: boolean
}

export const ProfileNameDisplayAndEditor = ({
  compact,
  profile,
  updateProfile,
  className,
  header,
  editingClassName,
  hideNoNameTooltip,
}: ProfileNameDisplayAndEditorProps) => {
  const { t } = useTranslation()

  const canEdit = !!updateProfile && !profile.loading && profile.data.nonce >= 0

  // If set, will show edit input.
  const [editingName, setEditingName] = useState<string | undefined>()
  const [savingName, setSavingName] = useState(false)

  const doUpdateName = useCallback(async () => {
    if (editingName === undefined || !canEdit) {
      return
    }

    setSavingName(true)
    try {
      // Empty names unset.
      await updateProfile({ name: editingName.trim() || null })
      // Stop editing on success.
      setEditingName(undefined)
    } catch (err) {
      console.error(err)
      toast.error(
        processError(err, {
          forceCapture: false,
        })
      )
    } finally {
      setSavingName(false)
    }
  }, [canEdit, editingName, updateProfile])

  const noNameSet = !profile.loading && profile.data.name === null

  const nameClassName = clsx('title-text', header && '!text-2xl !font-bold')
  // Height should match text line-height.
  const editingContainerClassName = header ? 'h-8 !min-w-72' : 'h-5'

  return (
    <div className={clsx(className, editingName && editingClassName)}>
      {canEdit && editingName !== undefined ? (
        <div
          className={clsx(
            'relative -mt-1 mb-1 flex flex-col items-center',
            compact ? 'pr-12' : 'min-w-40',
            editingContainerClassName
          )}
        >
          <TextInput
            // Auto focus does not work on mobile Safari by design
            // (https://bugs.webkit.org/show_bug.cgi?id=195884#c4).
            autoFocus
            className={clsx(
              'min-w-full border-b border-border-primary pb-0.5',
              !compact && 'text-center',
              nameClassName
            )}
            ghost
            onInput={(event) =>
              setEditingName((event.target as HTMLInputElement).value)
            }
            onKeyDown={(event) =>
              event.key === 'Escape'
                ? setEditingName(undefined)
                : event.key === 'Enter'
                  ? doUpdateName()
                  : undefined
            }
            size={1}
            value={editingName}
          />

          <div
            className={clsx(
              'absolute top-0 bottom-0 flex flex-row items-center gap-1',
              compact ? 'right-0' : '-right-12'
            )}
          >
            {savingName ? (
              <Loader fill={false} size={16} />
            ) : (
              <IconButton
                Icon={Check}
                onClick={doUpdateName}
                size="xs"
                variant="ghost"
              />
            )}

            <IconButton
              Icon={Close}
              onClick={() => setEditingName(undefined)}
              size="xs"
              variant="ghost"
            />
          </div>
        </div>
      ) : (
        <Button
          className="group relative"
          contentContainerClassName={clsx(canEdit && compact && 'pr-6')}
          disabled={!canEdit}
          onClick={() =>
            !profile.loading &&
            setEditingName(
              // Prefill name editor with current name from PFPK. If name from
              // other name service, allow overriding name, but default to
              // empty.
              profile.data.nameSource === 'pfpk'
                ? (profile.data.name ?? '')
                : ''
            )
          }
          variant="none"
        >
          {!profile.loading && profile.data.nameSource === 'stargaze' && (
            <Tooltip title={t('title.stargazeNames')}>
              <ChainLogo chainId={ChainId.StargazeMainnet} />
            </Tooltip>
          )}

          <p
            className={clsx(
              nameClassName,
              profile.loading && 'animate-pulse',
              noNameSet
                ? [
                    '!font-normal !italic !text-text-secondary',
                    !header && '!text-sm',
                  ]
                : '!text-text-body'
            )}
          >
            {profile.loading
              ? '...'
              : noNameSet
                ? canEdit
                  ? t('button.setDisplayName')
                  : t('info.noDisplayName')
                : profile.data.name}
          </p>

          {!canEdit && !profile.loading && noNameSet && !hideNoNameTooltip && (
            <TooltipInfoIcon
              className="-ml-1"
              size="xs"
              title={t('info.noDisplayNameTooltip')}
            />
          )}

          {canEdit && (
            <Edit
              className={clsx(
                'absolute !h-4 !w-6 pl-2 text-icon-secondary',
                compact ? 'right-0' : '-right-6',
                !noNameSet &&
                  'opacity-0 transition-opacity group-hover:opacity-100'
              )}
            />
          )}
        </Button>
      )}
    </div>
  )
}
