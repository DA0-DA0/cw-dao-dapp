import clsx from 'clsx'
import Link from 'next/link'
import { forwardRef } from 'react'

import { LinkWrapperProps } from '@dao-dao/types'

export const LinkWrapper = forwardRef<HTMLDivElement, LinkWrapperProps>(
  function LinkWrapper(
    {
      href: _href,
      children,
      loading,
      disabled,
      className,
      containerClassName,
      onClick,
      openInNewTab: _openInNewTab,
      shallow,
      replace,
      prefetch = false,
      ...props
    },
    ref
  ) {
    // Sanitize href. Must begin with http or /. This prevents XSS attacks by
    // preventing links to javascript: or data:.
    const href = !_href
      ? undefined
      : _href.startsWith('http') || _href.startsWith('/')
        ? _href
        : '#'

    const contentClassName = clsx(
      className,
      // If loading, disabled, or no href, disable touch interaction. Anchor
      // tags cannot be disabled, so this is a workaround.
      (loading || disabled || !href) && 'pointer-events-none'
    )

    // Exteral link if starts with http (non-relative path). Fallback to
    // checking if external link if `openInNewTab` not defined.
    const openInNewTab = _openInNewTab ?? href?.startsWith('http') ?? false

    return (
      // Add div wrapper with ref to allow tooltips even when the link's touch
      // interaction is disabled.
      <div
        className={clsx(containerClassName, loading && 'animate-pulse')}
        {...props}
        ref={ref}
      >
        {openInNewTab ? (
          <a
            className={contentClassName}
            href={href}
            onClick={onClick}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ) : (
          <Link
            className={contentClassName}
            href={href ?? '#'}
            onClick={onClick}
            prefetch={
              // Deprecation warning when `prefetch` is set to true. Undefined
              // is default behavior, which is to prefetch.
              prefetch ? undefined : false
            }
            replace={replace}
            shallow={shallow}
          >
            {children}
          </Link>
        )}
      </div>
    )
  }
)
