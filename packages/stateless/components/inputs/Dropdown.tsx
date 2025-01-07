import { ArrowDropDown } from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { TypedOption } from '@dao-dao/types'

import { useTrackDropdown } from '../../hooks/useTrackDropdown'
import { Button } from '../buttons'

export interface DropdownProps<T> {
  options: TypedOption<T>[]
  placeholder?: string
  selected?: T | T[]
  onSelect: (option: T, index: number) => void
  containerClassName?: string
  labelContainerClassName?: string
  labelClassName?: string
  iconClassName?: string
  keepOpenOnSelect?: boolean
}

export const Dropdown = <T extends unknown>({
  options,
  placeholder,
  selected,
  onSelect,
  containerClassName,
  labelContainerClassName,
  labelClassName,
  iconClassName,
  keepOpenOnSelect,
}: DropdownProps<T>) => {
  const { t } = useTranslation()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  const selectedOptions =
    selected && Array.isArray(selected)
      ? options.filter(({ value }) => selected.includes(value))
      : options.filter(({ value }) => selected === value)

  // Listen for click not in dropdown bounds, and close if so. Adds listener
  // only when the dropdown is open.
  useEffect(() => {
    // Don't do anything if not on browser or dropdown is not open.
    // If open is switched off, the useEffect will remove the listener and then
    // not-readd it.
    if (typeof window === 'undefined' || !open) {
      return
    }

    const closeIfClickOutside = (event: MouseEvent) => {
      // If clicked on an element that is not a descendant of this Dropdown's
      // outermost container, close the dropdown.
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('click', closeIfClickOutside)
    return () => window.removeEventListener('click', closeIfClickOutside)
  }, [open])

  // Track button to position the dropdown.
  const { onDropdownRef, onTrackRef } = useTrackDropdown()

  return (
    <>
      <div
        className={clsx(
          'inline-block overflow-hidden rounded-md border border-b-0 transition-all',
          open
            ? 'rounded-b-none border-border-primary bg-component-dropdown'
            : 'border-transparent',
          containerClassName
        )}
        ref={(ref) => {
          containerRef.current = ref
          onTrackRef(ref)
        }}
      >
        <Button
          className="rounded-none"
          contentContainerClassName={clsx(
            'justify-between gap-4',
            labelContainerClassName
          )}
          onClick={() => setOpen((o) => !o)}
          variant="ghost"
        >
          <p
            className={clsx(
              'link-text text-left',
              {
                // Darken if nothing selected and showing placeholder.
                'text-text-secondary': selectedOptions.length === 0,
              },
              labelClassName
            )}
          >
            {selectedOptions.length === 0
              ? placeholder
              : selectedOptions.length === 1
                ? selectedOptions[0].label
                : t('info.numSelected', { count: selectedOptions.length })}
          </p>

          <ArrowDropDown className={clsx('!h-5 !w-5', iconClassName)} />
        </Button>
      </div>

      {/* Dropdown */}
      {createPortal(
        <div
          className={clsx(
            'fixed z-50 overflow-hidden rounded-b-md border border-t-0 border-border-primary bg-component-dropdown transition-opacity',
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          ref={onDropdownRef}
        >
          <div className="no-scrollbar flex h-full max-h-80 flex-col gap-[1px] overflow-y-auto border-t border-t-border-base">
            {options.map((option, index) => (
              <Button
                key={index}
                className="rounded-none text-left"
                onClick={() => {
                  onSelect(option.value, index)

                  if (!keepOpenOnSelect) {
                    setOpen(false)
                  }
                }}
                pressed={selectedOptions.includes(option)}
                variant="ghost"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
