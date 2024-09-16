import { Check, DataObject } from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentType, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  ActionsMatchAndRender,
  Button,
  DropdownIconButton,
  MarkdownRenderer,
  RawActionsRenderer,
  Tooltip,
} from '@dao-dao/stateless'
import {
  ActionEncodeContext,
  ActionKeyAndData,
  ActionKeyAndDataNoId,
  SuspenseLoaderProps,
} from '@dao-dao/types'

import { MultipleChoiceOptionData } from '../types'

export type MultipleChoiceOptionViewerProps = {
  data: MultipleChoiceOptionData
  lastOption: boolean
  // If undefined, no winner picked yet.
  winner?: boolean
  // Used when previewing to force raw JSON display.
  preview?: boolean
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
} & (
  | {
      /**
       * Force raw JSON display and use existing action data instead of matching
       * and decoding messages from the choice data.
       */
      preview: true
      /**
       * Encode context.
       */
      encodeContext: ActionEncodeContext
      /**
       * Action keys and data to preview.
       */
      actionKeysAndData: ActionKeyAndDataNoId[]

      onLoad?: never
    }
  | {
      preview?: false
      encodeContext?: never
      actionKeysAndData?: never
      /**
       * Callback when all actions and data are loaded.
       */
      onLoad?: (data: ActionKeyAndData[]) => void
    }
)

export const MultipleChoiceOptionViewer = ({
  data: { choice, voteOption },
  lastOption,
  winner,
  SuspenseLoader,
  ...previewData
}: MultipleChoiceOptionViewerProps) => {
  const { t } = useTranslation()

  const [showRaw, setShowRaw] = useState(false)

  const isNoneOption = choice.option_type === 'none'
  const noMessages = previewData.preview
    ? previewData.actionKeysAndData.length === 0
    : choice.msgs.length === 0
  const noContent = noMessages && !choice.description

  // Close none of the above and disallow expanding.
  const [expanded, setExpanded] = useState(
    choice.option_type !== 'none' &&
      // Default collapsed if there is a winner and it is not this one.
      (winner === undefined || winner) &&
      // Default collapsed if there are no messages and no description.
      !noContent
  )
  const toggleExpanded = () => setExpanded((e) => !e)

  return (
    <div
      className={clsx(
        'flex flex-col justify-between gap-6 pt-6',
        !expanded && 'pb-6',
        // No bottom border on last item.
        !lastOption && 'border-b border-border-secondary'
      )}
    >
      <div
        className={clsx(
          'flex flex-row items-center gap-6',
          !isNoneOption && 'cursor-pointer'
        )}
        onClick={!isNoneOption ? toggleExpanded : undefined}
      >
        <div className="flex grow flex-row items-center gap-2">
          <DropdownIconButton
            className={clsx(
              // Disable instead of hiding if none option to preserve the space
              // layout but disallow expanding.
              isNoneOption && 'pointer-events-none opacity-0'
            )}
            open={expanded}
            toggle={
              // Container has toggle handler.
              () => {}
            }
          />

          <voteOption.Icon
            className="!h-4 !w-4"
            style={{
              color: voteOption.color,
            }}
          />

          <p className="title-text">
            {isNoneOption ? t('title.noneOfTheAbove') : choice.title}
          </p>
        </div>

        {winner && (
          <Tooltip title={t('info.winningOptionTooltip')}>
            <Check className="!h-6 !w-6" />
          </Tooltip>
        )}
      </div>

      <div
        className={clsx(
          'ml-[calc(0.75rem-1.5px)] flex flex-col gap-6 border-l-[3px] border-border-interactive-focus pl-5 pb-5 pt-1',
          !expanded && 'hidden'
        )}
      >
        {!isNoneOption && !!choice.description && (
          <MarkdownRenderer markdown={choice.description} />
        )}

        {noMessages ? (
          <p className="caption-text italic">{t('info.optionInert')}</p>
        ) : previewData.preview || showRaw ? (
          // If previewing, load raw from actions.
          previewData.preview ? (
            <RawActionsRenderer
              actionKeysAndData={previewData.actionKeysAndData}
              encodeContext={previewData.encodeContext}
            />
          ) : (
            // Otherwise use messages that already exist.
            <RawActionsRenderer messages={choice.msgs} />
          )
        ) : (
          <ActionsMatchAndRender
            SuspenseLoader={SuspenseLoader}
            messages={choice.msgs}
            onCopyLink={() => toast.success(t('info.copiedLinkToClipboard'))}
            onLoad={!previewData.preview && previewData.onLoad}
          />
        )}

        {!previewData.preview && !noMessages && (
          <Button
            className="-mt-4 self-end"
            onClick={() => setShowRaw(!showRaw)}
            variant="ghost"
          >
            <DataObject className="text-icon-secondary" />
            <p className="secondary-text">
              {showRaw ? t('button.hideRawData') : t('button.showRawData')}
            </p>
          </Button>
        )}
      </div>
    </div>
  )
}
