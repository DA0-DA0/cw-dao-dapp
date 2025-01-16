import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { PopupProps, PopupTrigger, PopupTriggerOptions } from '@dao-dao/types'

import { useTrackDropdown } from '../../hooks/useTrackDropdown'
import { Button } from '../buttons'
import { IconButton } from '../icon_buttons'
import { Tooltip } from '../tooltip'

export const Popup = ({
  trigger,
  position,
  children,
  wrapperClassName,
  popupClassName,
  getKeydownEventListener,
  headerContent,
  onOpen,
  onClose,
  openRef,
  setOpenRef,
  topOffset = 0,
}: PopupProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const [_open, _setOpen] = useState(false)
  const open = trigger.type === 'manual' ? trigger.open : _open
  const setOpen = trigger.type === 'manual' ? trigger.setOpen : _setOpen

  // On route change, close the popup.
  const { asPath } = useRouter()
  useEffect(() => {
    setOpen(false)
  }, [asPath, setOpen])

  // Store open and setOpen in ref so parent can access them.
  useEffect(() => {
    if (openRef) {
      openRef.current = open
    }
    if (setOpenRef) {
      setOpenRef.current = setOpen
    }
    // Remove refs on unmount.
    return () => {
      if (openRef) {
        openRef.current = null
      }
      if (setOpenRef) {
        setOpenRef.current = null
      }
    }
  }, [open, openRef, setOpen, setOpenRef])

  // Trigger open callbacks.
  useEffect(() => {
    if (open) {
      onOpen?.()
    } else {
      onClose?.()
    }
  }, [onClose, onOpen, open])

  // Close popup on escape if open.
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyPress = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false)

    // Attach event listener.
    document.addEventListener('keydown', handleKeyPress)
    // Clean up event listener.
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [open, setOpen])

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Listen for click not in bounds, and close if so. Adds listener only when
  // the dropdown is open.
  useEffect(() => {
    // Don't do anything if not on browser or popup is not open.
    // If open is switched off, the useEffect will remove the listener and then
    // not-readd it.
    if (typeof window === 'undefined' || !open) {
      return
    }

    const closeIfClickOutside = (event: MouseEvent) => {
      // If clicked on an element that is not a descendant of the popup
      // wrapper or the dropdown, close it.
      if (
        event.target instanceof Node &&
        !wrapperRef.current?.contains(event.target) &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('click', closeIfClickOutside)
    return () => window.removeEventListener('click', closeIfClickOutside)
  }, [open, setOpen])

  // Apply keydown event listener.
  useEffect(() => {
    if (!getKeydownEventListener) {
      return
    }

    const listener = getKeydownEventListener(open, setOpen)

    document.addEventListener('keydown', listener)
    // Clean up event listener on unmount.
    return () => document.removeEventListener('keydown', listener)
  }, [getKeydownEventListener, open, setOpen])

  // Track button to position the dropdown.
  const { onDropdownRef, onTrackRef } = useTrackDropdown({
    // Offset for outline of Trigger.
    top: (rect) => rect.bottom + 4 + topOffset,
    left:
      position === 'right'
        ? (rect) => rect.left - 2
        : position === 'wide'
          ? () => 24
          : null,
    right:
      position === 'left'
        ? (rect) => window.innerWidth - rect.right - 2
        : position === 'wide'
          ? () => 24
          : null,
    width: null,
  })

  return (
    <>
      <div
        className={clsx('inline-block', wrapperClassName)}
        ref={(ref) => {
          wrapperRef.current = ref
          onTrackRef(ref)
        }}
      >
        <TriggerRenderer
          options={{ open, onClick: () => setOpen((o) => !o) }}
          trigger={trigger}
        />
      </div>

      {/* Popup */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={clsx(
              'fixed z-50 flex flex-col rounded-lg border border-border-primary bg-component-dropdown shadow-dp8 transition-all',
              // Open.
              {
                'pointer-events-none scale-95 opacity-0': !open,
                'scale-100 opacity-100': open,
              },
              popupClassName
            )}
            ref={(ref) => {
              dropdownRef.current = ref
              onDropdownRef(ref)
            }}
          >
            {headerContent && (
              <div className="mb-4 border-b border-border-base">
                <div className="p-4">{headerContent}</div>
              </div>
            )}

            {children}
          </div>,
          document.body
        )}
    </>
  )
}

export type TriggerRendererProps = {
  trigger: PopupTrigger
  options: PopupTriggerOptions
}

export const TriggerRenderer = ({ trigger, options }: TriggerRendererProps) => (
  <>
    {trigger.type === 'button' ? (
      <Tooltip title={trigger.tooltip}>
        <Button
          {...{
            // Let props override these if desired.
            onClick: options.onClick,
            pressed: options.open,
            ...(typeof trigger.props === 'function'
              ? trigger.props(options)
              : trigger.props),
          }}
        />
      </Tooltip>
    ) : trigger.type === 'icon_button' ? (
      <Tooltip title={trigger.tooltip}>
        <IconButton
          {...{
            // Let props override these if desired.
            onClick: options.onClick,
            focused: options.open,
            ...(typeof trigger.props === 'function'
              ? trigger.props(options)
              : trigger.props),
          }}
        />
      </Tooltip>
    ) : trigger.type === 'custom' ? (
      <trigger.Renderer {...options} />
    ) : null}
  </>
)
