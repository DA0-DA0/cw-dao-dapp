import { Check, InfoOutlined, WarningRounded } from '@mui/icons-material'
import clsx from 'clsx'
import { ReactNode } from 'react'

import { Loader } from './logo'

export type StatusCardProps = {
  style: 'info' | 'loading' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'default'
  content?: ReactNode
  children?: ReactNode
  className?: string
  iconClassName?: string
  textClassName?: string
  contentContainerClassName?: string
  /**
   * If true, the icon will be placed at the top of the card. Otherwise, it will
   * be centered vertically.
   */
  iconAtTop?: boolean
  onClick?: () => void
}

export const StatusCard = ({
  style,
  size = 'default',
  content,
  children,
  className,
  iconClassName,
  textClassName,
  contentContainerClassName,
  iconAtTop = false,
  onClick,
}: StatusCardProps) => {
  const Icon =
    style === 'info'
      ? InfoOutlined
      : style === 'success'
        ? Check
        : style === 'warning'
          ? WarningRounded
          : undefined
  const iconColor =
    style === 'info'
      ? 'text-icon-secondary'
      : style === 'warning'
        ? 'text-icon-interactive-warning'
        : undefined
  const textColor =
    style === 'warning' ? '!text-text-interactive-warning-body' : undefined

  return (
    <div
      className={clsx(
        'flex flex-row rounded-md overflow-auto',
        iconAtTop ? 'items-start' : 'items-center',
        onClick &&
          'cursor-pointer transition-opacity hover:opacity-80 active:opacity-70',
        size === 'xs' ? 'bg-background-tertiary' : 'bg-background-secondary',
        size === 'default' ? 'gap-4 p-4' : 'gap-3 p-3',
        className
      )}
      onClick={onClick}
    >
      {style === 'loading' ? (
        <Loader fill={false} size={24} />
      ) : (
        Icon && (
          <Icon
            className={clsx(
              iconColor,
              size === 'default'
                ? '!h-10 !w-10'
                : size === 'sm'
                  ? '!h-8 !w-8'
                  : '!h-6 !w-6',
              iconClassName
            )}
          />
        )
      )}

      <div
        className={clsx(
          'flex flex-col items-start gap-2',
          contentContainerClassName
        )}
      >
        {typeof content === 'string' ? (
          <p
            className={clsx(
              textColor,
              size === 'xs' ? 'secondary-text' : 'body-text',
              size === 'sm' && 'text-xs',
              textClassName
            )}
          >
            {content}
          </p>
        ) : (
          content
        )}

        {children}
      </div>
    </div>
  )
}
