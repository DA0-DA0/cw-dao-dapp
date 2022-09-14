import { CheckCircleIcon } from '@heroicons/react/outline'
import clsx from 'clsx'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { Copy } from '@dao-dao/icons'

import { Button } from './Button'

export const concatAddressStartEnd = (
  address: string,
  takeStart: number,
  takeEnd: number
) => {
  const first = address.substring(0, takeStart)
  const last = address.substring(address.length - takeEnd, address.length)
  return [first, last].filter(Boolean).join('..')
}

export const concatAddressBoth = (address: string, takeN = 7): string =>
  address && concatAddressStartEnd(address, takeN, takeN)

export interface CopyToClipboardProps {
  value: string
  success?: string
  takeN?: number
  takeStartEnd?: {
    start: number
    end: number
  }
  takeAll?: true
  loading?: boolean
  className?: string
  textClassName?: string
  onCopy?: () => void
}

export const CopyToClipboard = ({
  value,
  success,
  takeN,
  takeStartEnd,
  takeAll,
  className = 'font-mono text-xs',
  textClassName,
  onCopy,
}: CopyToClipboardProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  return (
    <button
      className={clsx(
        'flex overflow-hidden flex-row gap-1 items-center',
        className
      )}
      onClick={() => {
        navigator.clipboard.writeText(value)
        setTimeout(() => setCopied(false), 2000)
        setCopied(true)
        toast.success(success || t('info.copiedToClipboard'))
        onCopy?.()
      }}
      title={value}
      type="button"
    >
      {copied ? (
        <CheckCircleIcon className="w-[18px]" />
      ) : (
        <Copy height="18px" width="18px" />
      )}

      <span
        className={clsx(
          'inline flex-1 p-1 truncate hover:bg-btn-secondary-hover rounded-md transition',
          textClassName
        )}
      >
        {takeStartEnd
          ? concatAddressStartEnd(value, takeStartEnd.start, takeStartEnd.end)
          : takeAll
          ? value
          : concatAddressBoth(value, takeN)}
      </span>
    </button>
  )
}

export const CopyToClipboardUnderline = ({
  value,
  success,
  takeN,
  takeStartEnd,
  takeAll,
  className,
  textClassName,
}: CopyToClipboardProps) => {
  const { t } = useTranslation()

  return (
    <p
      className={clsx(
        'font-mono text-xs text-text-body underline truncate hover:opacity-80 active:opacity-70 transition-opacity cursor-pointer',
        className,
        textClassName
      )}
      onClick={() => {
        navigator.clipboard.writeText(value)
        toast.success(success || t('info.copiedToClipboard'))
      }}
    >
      {takeStartEnd
        ? concatAddressStartEnd(value, takeStartEnd.start, takeStartEnd.end)
        : takeAll
        ? value
        : concatAddressBoth(value, takeN)}
    </p>
  )
}

export const CopyToClipboardMobile = ({
  value,
  success,
  takeN,
  takeStartEnd,
  takeAll,
}: CopyToClipboardProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex justify-between p-1 rounded-md border border-inactive">
      <div className="flex gap-2 items-center px-2 text-tertiary secondary-text">
        {copied ? (
          <CheckCircleIcon className="w-[18px]" />
        ) : (
          <Copy height="18px" width="18px" />
        )}
        <span className="inline py-1 hover:bg-btn-secondary-hover transition">
          {takeStartEnd
            ? concatAddressStartEnd(value, takeStartEnd.start, takeStartEnd.end)
            : takeAll
            ? value
            : concatAddressBoth(value, takeN)}
        </span>
      </div>
      <Button
        onClick={() => {
          navigator.clipboard.writeText(value)
          setTimeout(() => setCopied(false), 2000)
          setCopied(true)
          toast.success(success || t('info.copiedToClipboard'))
        }}
        size="sm"
        variant="secondary"
      >
        <p className="text-body caption-text">{t('button.copy')}</p>
      </Button>
    </div>
  )
}
