import { AudiotrackRounded, ImageNotSupported } from '@mui/icons-material'
import clsx from 'clsx'
import NextImage from 'next/image'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactPlayer from 'react-player'

import { NftCardInfo } from '@dao-dao/types'
import {
  NFT_VIDEO_EXTENSIONS,
  getImageUrlForChainId,
  getNftName,
  objectMatchesStructure,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

import { AudioPlayer } from './AudioPlayer'
import { CopyToClipboard } from './CopyToClipboard'
import { LinkWrapper } from './LinkWrapper'

export interface HorizontalNftCardProps extends NftCardInfo {
  className?: string
}

export const HorizontalNftCard = forwardRef<
  HTMLDivElement,
  HorizontalNftCardProps
>(function HorizontalNftCard(
  {
    collectionAddress,
    collectionName,
    externalLink,
    imageUrl,
    metadata,
    name,
    tokenId,
    chainId,
    className,
  },
  ref
) {
  const { t } = useTranslation()

  const chainImage = getImageUrlForChainId(chainId)
  const chainImageNode = chainImage && (
    <NextImage
      alt=""
      className="shrink-0"
      height={36}
      src={chainImage}
      width={36}
    />
  )

  const video =
    // If image contains a video, treat it as a video.
    imageUrl && NFT_VIDEO_EXTENSIONS.includes(imageUrl.split('.').pop() || '')
      ? imageUrl
      : metadata &&
          objectMatchesStructure(metadata, {
            properties: {
              video: {},
            },
          })
        ? metadata.properties.video
        : null

  const [imageLoading, setImageLoading] = useState(!!imageUrl)
  const [imageLoadErrored, setImageLoadErrored] = useState(false)
  // Load image in background so we can listen for loading complete.
  const [loadedImageSrc, setLoadedImgSrc] = useState<string>()
  useEffect(() => {
    if (
      // If showing a video, don't load image.
      video ||
      !imageUrl ||
      loadedImageSrc === toAccessibleImageUrl(imageUrl)
    ) {
      return
    }

    setImageLoading(true)

    const img = new Image()
    img.onload = () => {
      setLoadedImgSrc(img.src)
      setImageLoading(false)
      setImageLoadErrored(false)
    }
    img.onerror = () => {
      setLoadedImgSrc(undefined)
      setImageLoading(false)
      setImageLoadErrored(true)
    }
    img.src = toAccessibleImageUrl(imageUrl)
  }, [imageUrl, loadedImageSrc, video])

  const audio =
    metadata &&
    objectMatchesStructure(metadata, {
      properties: {
        audio: {},
      },
    })
      ? metadata.properties.audio
      : null

  const showingImageUrl = imageUrl && !imageLoadErrored

  return (
    <div
      className={clsx(
        'flex flex-col items-stretch overflow-hidden rounded-lg bg-background-primary sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-1',
        imageLoading && 'animate-pulse',
        className
      )}
      ref={ref}
    >
      <div className="relative aspect-square sm:h-36 sm:w-36">
        <div className="absolute top-0 right-0 bottom-0 left-0">
          {video ? (
            <ReactPlayer
              controls
              height="100%"
              onReady={() => setImageLoading(false)}
              url={video}
              width="100%"
            />
          ) : showingImageUrl ? (
            <div
              className={clsx(
                'relative aspect-square bg-cover bg-center transition-opacity',
                loadedImageSrc ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                backgroundImage: loadedImageSrc && `url(${loadedImageSrc})`,
              }}
            ></div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {audio ? (
                <AudiotrackRounded className="!h-14 !w-14 text-icon-tertiary" />
              ) : (
                <ImageNotSupported className="!h-14 !w-14 text-icon-tertiary" />
              )}
            </div>
          )}
        </div>

        {audio && !video && (
          <AudioPlayer
            className="absolute bottom-0 left-0 right-0 bg-transparent"
            iconClassName="text-icon-primary"
            progressClassName="text-text-primary"
            src={audio}
            style={{
              background:
                'linear-gradient(to bottom, rgba(var(--color-background-base), 0), rgba(var(--color-background-base), 0.8) 50%, rgba(var(--color-background-base), 1) 100%)',
            }}
          />
        )}
      </div>

      <div className="flex min-w-0 grow flex-col">
        <p className="title-text border-b border-border-secondary py-4 px-6">
          {/* Don't include collection name since we show it below. */}
          {getNftName('', tokenId, name)}
        </p>

        <div className="flex grow flex-row items-center justify-between gap-8 py-4 px-6">
          {/* Collection */}
          <div className="flex flex-col items-stretch justify-between gap-1 overflow-hidden">
            <CopyToClipboard
              className="text-xs"
              label={t('title.collection')}
              textClassName="secondary-text"
              tooltip={t('button.copyAddressToClipboard')}
              value={collectionAddress}
            />

            <p className="primary-text truncate font-normal">
              {collectionName}
            </p>
          </div>

          {/* Source chain */}
          {chainImageNode ? (
            externalLink ? (
              <LinkWrapper
                className="shrink-0"
                href={externalLink?.href}
                openInNewTab
              >
                {chainImageNode}
              </LinkWrapper>
            ) : (
              chainImageNode
            )
          ) : null}
        </div>
      </div>
    </div>
  )
})

export const HorizontalNftCardLoader = () => (
  <div className="flex animate-pulse flex-col items-stretch overflow-hidden rounded-lg bg-background-primary sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-1">
    <div className="aspect-square sm:h-36 sm:w-36"></div>

    <div className="flex min-w-0 grow flex-col">
      <p className="title-text border-b border-border-secondary py-4 px-6 opacity-0">
        LOADING
      </p>

      <div className="flex grow flex-row items-center justify-between gap-8 py-4 px-6">
        <div className="flex flex-col items-stretch justify-between gap-1 overflow-hidden">
          <p className="secondary-text text-xs opacity-0">LOADING</p>
          <p className="primary-text truncate font-normal opacity-0">LOADING</p>
        </div>
      </div>
    </div>
  </div>
)
