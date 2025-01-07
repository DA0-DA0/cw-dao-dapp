import clsx from 'clsx'
import { useRouter } from 'next/router'
import { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { ButtonLinkProps, ButtonifierProps } from '@dao-dao/types'

import { Button } from '../buttons'

export type IDockItem = {
  /**
   * Unique key for this item.
   */
  key: string
  /**
   * The i18n key for the label.
   */
  labelI18nKey: string
  /**
   * The icon to render when the item is not selected.
   */
  IconUnselected: ComponentType<{ className?: string }>
  /**
   * The icon to render when the item is selected.
   */
  IconSelected: ComponentType<{ className?: string }>
  /**
   * Highlight this item with brand colors.
   */
  brand?: boolean
  /**
   * Reduce gap between icon and label.
   */
  compact?: boolean
  /**
   * Show a badge on the item.
   */
  badge?: boolean
} & (
  | {
      /**
       * The page href.
       */
      href: string
      /**
       * The router pathname(s) to match.
       */
      pathnames: string | string[]
    }
  | {
      /**
       * The page onClick handler.
       */
      onClick: () => void
    }
)

export type DockItemProps = {
  /**
   * The dock item to render.
   */
  item: IDockItem
  /**
   * The ButtonLink stateful component.
   */
  ButtonLink: ComponentType<ButtonLinkProps>
}

/**
 * An item in the dock.
 */
export const DockItem = ({
  item: {
    labelI18nKey,
    IconUnselected,
    IconSelected,
    brand,
    compact,
    badge,
    ...hrefOrClick
  },
  ButtonLink,
}: DockItemProps) => {
  const { t } = useTranslation()
  const { pathname } = useRouter()

  const selected =
    'href' in hrefOrClick
      ? typeof hrefOrClick.pathnames === 'string'
        ? hrefOrClick.pathnames === pathname
        : hrefOrClick.pathnames.includes(pathname)
      : false
  const Icon = selected ? IconSelected : IconUnselected

  const containerClassName = 'basis-0 grow shrink-0'
  const commonProps: ButtonifierProps = {
    contentContainerClassName: clsx(
      '!flex-col !justify-between',
      compact ? '!gap-0.5' : '!gap-1.5'
    ),
    noRounding: true,
    size: 'none',
    variant: 'none',
    children: (
      <>
        <div className="relative h-6 w-6 shrink-0">
          <Icon
            className={clsx(
              '!h-6 !w-6 transition',
              brand
                ? 'text-icon-brand'
                : selected
                  ? 'text-icon-primary'
                  : 'text-icon-secondary'
            )}
          />

          {badge && (
            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 animate-fade-in rounded-full bg-icon-interactive-active"></div>
          )}
        </div>

        <p
          className={clsx(
            'secondary-text transition',
            brand
              ? 'text-text-brand'
              : selected
                ? 'text-text-primary'
                : 'text-text-secondary'
          )}
        >
          {t(labelI18nKey)}
        </p>
      </>
    ),
  }

  return 'href' in hrefOrClick ? (
    <ButtonLink
      {...commonProps}
      containerClassName={clsx(
        containerClassName,
        'flex flex-row items-stretch justify-center'
      )}
      href={hrefOrClick.href}
    />
  ) : (
    <Button
      {...commonProps}
      className={containerClassName}
      onClick={hrefOrClick.onClick}
    />
  )
}
