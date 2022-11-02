import { Close } from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { ModalProps } from '@dao-dao/types/components/Modal'

import { useMountedInBrowser } from '../../hooks'
import { ErrorBoundary } from '../ErrorBoundary'
import { IconButton } from '../icon_buttons'

export * from '@dao-dao/types/components/Modal'

export const Modal = ({
  children,
  visible,
  onClose,
  backdropClassName,
  containerClassName,
  hideCloseButton,
  header,
  headerContent,
  footerContent,
  headerContainerClassName,
  titleClassName,
}: ModalProps) => {
  // Close modal on escape.
  useEffect(() => {
    if (!onClose) {
      return
    }

    const handleKeyPress = (event: KeyboardEvent) =>
      event.key === 'Escape' && onClose()

    // Attach event listener.
    document.addEventListener('keydown', handleKeyPress)
    // Clean up event listener.
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [onClose])

  const mountedInBrowser = useMountedInBrowser()

  return mountedInBrowser
    ? createPortal(
        <div
          className={clsx(
            'fixed top-0 left-0 z-40 flex h-full w-screen items-center justify-center p-4 backdrop-brightness-50 backdrop-filter transition-all duration-[120ms]',
            visible ? 'opacity-100' : 'pointer-events-none opacity-0',
            onClose && 'cursor-pointer',
            backdropClassName
          )}
          onClick={
            onClose &&
            // Only close if click specifically on backdrop.
            (({ target, currentTarget }) =>
              target === currentTarget && onClose())
          }
        >
          <div
            className={clsx(
              'no-scrollbar relative flex h-min max-h-full max-w-md cursor-auto flex-col overflow-y-auto rounded-lg border border-border-secondary bg-background-base p-6 shadow-dp8 transition-transform duration-[120ms]',
              visible ? 'scale-100' : 'scale-90',
              // If no children, remove bottom padding since header has its own
              // padding.
              !children && '!pb-0',
              containerClassName
            )}
          >
            {!hideCloseButton && (
              <IconButton
                Icon={Close}
                circular
                className="absolute top-2 right-2 z-50"
                iconClassName="text-icon-tertiary"
                onClick={onClose}
                variant="ghost"
              />
            )}

            {(header || headerContent) && (
              <div
                className={clsx(
                  // Undo container padding with negative margin, and then re-add
                  // the padding internally, so that the bottom border spans the
                  // whole width.
                  '-mx-6 flex shrink-0 flex-col gap-1 px-6 pb-6',
                  // If children, add bottom border and margin.
                  children && 'mb-6 border-b border-border-base',
                  headerContainerClassName
                )}
              >
                {header && (
                  <>
                    <p className={clsx('header-text', titleClassName)}>
                      {header.title}
                    </p>
                    {!!header.subtitle && (
                      <p className="body-text">{header.subtitle}</p>
                    )}
                  </>
                )}

                {headerContent}
              </div>
            )}

            <ErrorBoundary>{children}</ErrorBoundary>

            {footerContent && (
              <div className="-mx-6 -mb-6 shrink-0 border-t border-border-secondary py-5 px-6">
                {footerContent}
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null
}
