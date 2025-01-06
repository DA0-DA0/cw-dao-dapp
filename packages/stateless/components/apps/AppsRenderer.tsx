import { CloseFullscreen, OpenInFull } from '@mui/icons-material'
import clsx from 'clsx'
import {
  Dispatch,
  RefCallback,
  SetStateAction,
  useEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { APPS, toAccessibleImageUrl } from '@dao-dao/utils'

import { useQuerySyncedState } from '../../hooks'
import { Button } from '../buttons'
import { IconButton } from '../icon_buttons'
import { TextInput } from '../inputs'
import { StatusCard } from '../StatusCard'
import { Tooltip } from '../tooltip'

export type AppsRendererProps = {
  /**
   * The reference to set the iframe for the apps passthrough functionality.
   */
  iframeRef: RefCallback<HTMLIFrameElement | null>
  /**
   * Whether the apps renderer is in full screen mode.
   */
  fullScreen: boolean
  /**
   * Set the full screen mode.
   */
  setFullScreen: Dispatch<SetStateAction<boolean>>
}

export const AppsRenderer = (props: AppsRendererProps) => {
  const [url, setUrl] = useQuerySyncedState({
    param: 'url',
    defaultValue: '',
  })

  return props.fullScreen ? (
    createPortal(
      <div className="hd-screen wd-screen fixed top-0 left-0 z-[38] bg-background-base p-safe pt-safe-or-4">
        <InnerAppsRenderer
          className="h-full w-full"
          setUrl={setUrl}
          url={url}
          {...props}
        />
      </div>,
      document.body
    )
  ) : (
    <InnerAppsRenderer setUrl={setUrl} url={url} {...props} />
  )
}

type InnerAppsRendererProps = AppsRendererProps & {
  url: string
  setUrl: Dispatch<SetStateAction<string>>
  className?: string
}

// Only allow URLs starting with `http(s)://`, to prevent XSS via `javascript:`
// URLs.
const ALLOWED_URL_REGEX = /^https?:\/\/.+$/

const InnerAppsRenderer = ({
  iframeRef,
  fullScreen,
  setFullScreen,
  url,
  setUrl,
  className,
}: InnerAppsRendererProps) => {
  const { t } = useTranslation()
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null)
  const [inputUrl, setInputUrl] = useState<string>(url)

  const go = (url: string) => {
    if (ALLOWED_URL_REGEX.test(url)) {
      setUrl(url)
    }
  }

  // On first iframe mount, go to URL.
  useEffect(() => {
    try {
      if (
        iframe &&
        (url === '' || (url && new URL(url).href)) &&
        ALLOWED_URL_REGEX.test(url)
      ) {
        iframe.src = url
      }
    } catch {
      // Ignore.
    }
  }, [iframe, url])

  // Add event handler to inform iframe that it's wrapped in DAO DAO if it asks.
  useEffect(() => {
    if (!iframe?.contentWindow) {
      return
    }

    const listener = ({ data }: MessageEvent) => {
      if (data === 'isDaoDao') {
        iframe.contentWindow?.postMessage('amDaoDao')
      }
    }

    iframe.contentWindow.addEventListener('message', listener)

    return () => {
      iframe.contentWindow?.removeEventListener('message', listener)
    }
  }, [iframe])

  // Update the input field to match the URL if it changes in the parent
  // component. This should handle the URL being updated from the query params.
  useEffect(() => {
    if (url !== inputUrl) {
      setInputUrl(url)
    }
    // Only change the input URL when the URL changes (i.e. ignore input change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInputUrl, url])

  // If no app URL matching, choose the last one (custom) with empty URL.
  const selectedAppIndex = APPS.findIndex(
    ({ url: appUrl }) => appUrl === url || !appUrl
  )

  const customSelected = !!url && selectedAppIndex === APPS.length - 1

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div
        className={clsx(
          'styled-scrollbar flex shrink-0 flex-row items-stretch gap-2 overflow-x-scroll pb-2',
          fullScreen && 'px-safe-offset-4'
        )}
      >
        {APPS.map(({ platform, name, imageUrl, url: appUrl }, index) => {
          const isCustom = !appUrl
          const selected = index === selectedAppIndex

          return (
            <Button
              key={appUrl}
              className={clsx(
                'shrink-0 overflow-hidden border-2 !p-0 transition',
                isCustom && 'border-dashed border-border-primary',
                selected
                  ? '!border-border-interactive-active'
                  : !isCustom && 'border-transparent'
              )}
              onClick={() => go(appUrl)}
              variant="none"
            >
              {/* Background. */}
              {!isCustom && (
                <div
                  className="absolute top-0 left-0 bottom-0 right-0 z-0 bg-cover bg-center brightness-50"
                  style={{
                    backgroundImage: `url(${toAccessibleImageUrl(imageUrl)})`,
                  }}
                ></div>
              )}

              <div className="relative z-10 flex w-32 flex-col items-center justify-center gap-1 p-4">
                {platform && (
                  <p className="caption-text text-color-light-transparent">
                    {platform}
                  </p>
                )}

                <p className="primary-text break-words text-color-light">
                  {isCustom ? t('title.custom') : name}
                </p>
              </div>
            </Button>
          )
        })}
      </div>

      {customSelected && (
        <StatusCard
          className={clsx('mb-2', fullScreen && 'mx-safe-offset-4')}
          content={t('info.customAppWarning')}
          style="warning"
        />
      )}

      <div
        className={clsx(
          'flex shrink-0 flex-row items-stretch gap-2',
          fullScreen && 'px-safe-offset-4'
        )}
      >
        <div className="flex grow flex-row items-stretch gap-1">
          <TextInput
            autoComplete="off"
            className="grow"
            onChange={(event) => setInputUrl(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                go(inputUrl)
              }
            }}
            placeholder={t('form.url')}
            type="url"
            value={inputUrl}
          />

          <Button
            className="shrink-0"
            onClick={() => go(inputUrl)}
            size="lg"
            variant="primary"
          >
            {t('button.go')}
          </Button>
        </div>

        <Tooltip title={t('button.toggleFullScreen')}>
          <IconButton
            Icon={fullScreen ? CloseFullscreen : OpenInFull}
            className="!h-auto shrink-0"
            onClick={() => setFullScreen((f) => !f)}
            size="sm"
            variant="ghost"
          />
        </Tooltip>
      </div>

      <iframe
        allow="clipboard-write"
        className={clsx('mt-2 grow', !fullScreen && 'min-h-[75dvh] rounded-md')}
        ref={(ref) => {
          setIframe(ref)
          iframeRef(ref)
        }}
      ></iframe>
    </div>
  )
}
