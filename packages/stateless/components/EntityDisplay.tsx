/* eslint-disable i18next/no-literal-string */
import { Check, CopyAllOutlined } from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EntityDisplayProps, EntityType } from '@dao-dao/types'
import {
  abbreviateAddress,
  getFallbackImage,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

import { useChainContext } from '../contexts'
import { useDaoNavHelpers, useDetectTruncate } from '../hooks'
import { ButtonLink } from './buttons'
import { IconButton } from './icon_buttons'
import { Tooltip } from './tooltip/Tooltip'

export const EntityDisplay = ({
  address,
  loadingEntity,
  imageSize,
  hideImage,
  size = 'default',
  className,
  textClassName,
  noCopy,
  noUnderline,
  showFullAddress,
  noLink,
  openInNewTab,
}: EntityDisplayProps) => {
  const { t } = useTranslation()
  const { getDaoPath } = useDaoNavHelpers()
  const { config } = useChainContext()

  imageSize ??= size === 'lg' ? 28 : 24

  const [copied, setCopied] = useState(false)
  // Unset copied after 2 seconds.
  useEffect(() => {
    const timeout = setTimeout(() => setCopied(false), 2000)
    // Cleanup on unmount.
    return () => clearTimeout(timeout)
  }, [copied])

  const href = loadingEntity.loading
    ? undefined
    : loadingEntity.data.type === EntityType.Dao
      ? getDaoPath(loadingEntity.data.address)
      : loadingEntity.data.type === EntityType.Wallet
        ? config?.explorerUrlTemplates?.wallet?.replace(
            'REPLACE',
            loadingEntity.data.address
          )
        : undefined

  const { textRef, truncated } = useDetectTruncate()

  // If name exists, use it. Otherwise, fallback to address, potentially
  // truncated.
  const textDisplay =
    !loadingEntity.loading && loadingEntity.data.name
      ? loadingEntity.data.type === EntityType.Module &&
        TRANSLATED_CHAIN_MODULES.includes(loadingEntity.data.name)
        ? t('title.chainModule.' + loadingEntity.data.name)
        : loadingEntity.data.name
      : showFullAddress
        ? address
        : abbreviateAddress(address, 3)

  return (
    <div
      className={clsx('flex min-w-0 flex-row items-center gap-2', className)}
    >
      <Tooltip
        title={
          // Show text display tooltip if text is truncated.
          truncated ? textDisplay : undefined
        }
      >
        <ButtonLink
          className={clsx(loadingEntity.loading && 'animate-pulse')}
          containerClassName="min-w-0"
          href={noLink ? undefined : href}
          onClick={(e) => !noLink && e.stopPropagation()}
          openInNewTab={openInNewTab}
          prefetch
          variant={noUnderline || noLink || !href ? 'none' : 'underline'}
        >
          {!hideImage && (
            <div
              className="shrink-0 rounded-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${
                  loadingEntity.loading
                    ? getFallbackImage(address)
                    : toAccessibleImageUrl(loadingEntity.data.imageUrl)
                })`,
                width: imageSize,
                height: imageSize,
              }}
            ></div>
          )}

          <p
            className={clsx(
              'min-w-0 truncate',
              {
                'text-sm': size === 'default',
                'text-lg': size === 'lg',
              },
              textClassName
            )}
            ref={textRef}
          >
            {textDisplay}
          </p>
        </ButtonLink>
      </Tooltip>

      {!noCopy && (
        <Tooltip title={t('button.copyAddress')}>
          <IconButton
            Icon={copied ? Check : CopyAllOutlined}
            iconClassName="text-icon-tertiary"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(address)
              setCopied(true)
            }}
            size="xs"
            variant="ghost"
          />
        </Tooltip>
      )}
    </div>
  )
}

// Chain modules that have translations in `title.chainModule.*`.
const TRANSLATED_CHAIN_MODULES = ['gov']
