import { ArrowDropDown } from '@mui/icons-material'
import clsx from 'clsx'
import {
  MouseEventHandler,
  ReactNode,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { SegmentedControlsProps } from '@dao-dao/types'

import { useTrackDropdown } from '../../hooks/useTrackDropdown'
import { Button } from '../buttons'
import { Tooltip } from '../tooltip'

export const SegmentedControls = <T extends unknown>({
  tabs,
  selected,
  onSelect,
  loading,
  className,
  disabled,
  noWrap,
  moreTabs,
}: SegmentedControlsProps<T>) => {
  const { t } = useTranslation()
  const [hoveringIndex, setHoveringIndex] = useState<number>()

  let selectedIndex = tabs.findIndex((tab) => tab.value === selected)
  const selectedMoreTabIndex =
    moreTabs?.findIndex((tab) => tab.value === selected) ?? -1
  // If the selected tab is in the more tabs, then select the last tab, which is
  // the More dropdown.
  if (selectedIndex === -1 && selectedMoreTabIndex !== -1) {
    selectedIndex = tabs.length
  }

  const moreTabRef = useRef<HTMLDivElement | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  // Listen for click not in dropdown bounds, and close if so. Adds listener
  // only when the dropdown is open.
  useEffect(() => {
    // Don't do anything if not on browser or dropdown is not open.
    // If open is switched off, the useEffect will remove the listener and then
    // not-readd it.
    if (typeof window === 'undefined' || !moreOpen) {
      return
    }

    const closeIfClickOutside = (event: MouseEvent) => {
      // If clicked on an element that is not a descendant of this Dropdown's
      // outermost container, close the dropdown.
      if (
        event.target instanceof Node &&
        !moreTabRef.current?.contains(event.target)
      ) {
        setMoreOpen(false)
      }
    }

    window.addEventListener('click', closeIfClickOutside)
    return () => window.removeEventListener('click', closeIfClickOutside)
  }, [moreOpen])

  // Track button to position the dropdown.
  const { onDropdownRef, onTrackRef } = useTrackDropdown()

  return (
    <div
      className={clsx(
        'grid auto-cols-fr grid-flow-col rounded-md bg-background-tertiary',
        disabled && 'pointer-events-none',
        noWrap && 'w-max',
        className
      )}
      onMouseLeave={() => setHoveringIndex(undefined)}
    >
      {tabs.map(({ label, value, tooltip, disabled }, index) => (
        <Tab
          key={index}
          disabled={disabled}
          hoveringIndex={hoveringIndex}
          index={index}
          loading={loading === value}
          noWrap={noWrap}
          onClick={(e) => onSelect(value, e)}
          onMouseOver={() => setHoveringIndex(index)}
          selectedIndex={selectedIndex}
          tooltip={tooltip}
        >
          {label}
        </Tab>
      ))}

      {!!moreTabs?.length && (
        <>
          <Tab
            buttonClassName={clsx(
              'border border-b-0 transition-all',
              moreOpen
                ? 'rounded-b-none border-border-primary bg-component-dropdown'
                : 'border-transparent'
            )}
            buttonContentContainerClassName="grow justify-center"
            hoveringIndex={hoveringIndex}
            index={tabs.length}
            loading={moreTabs.some(({ value }) => loading === value)}
            noWrap={noWrap}
            onClick={() => setMoreOpen((o) => !o)}
            onMouseOver={() => setHoveringIndex(tabs.length)}
            ref={(ref) => {
              moreTabRef.current = ref
              onTrackRef(ref)
            }}
            selectedIndex={moreOpen ? tabs.length : selectedIndex}
          >
            <p className="px-8">
              {selectedMoreTabIndex === -1
                ? t('button.more')
                : moreTabs[selectedMoreTabIndex].label}
            </p>

            <ArrowDropDown className="absolute right-0 !h-5 !w-5" />
          </Tab>

          {/* Dropdown */}
          {createPortal(
            <div
              className={clsx(
                'fixed z-50 overflow-hidden rounded-b-md border border-t-0 border-border-primary bg-component-dropdown transition-opacity',
                moreOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              ref={onDropdownRef}
            >
              <div className="no-scrollbar flex h-full max-h-80 flex-col gap-[1px] overflow-y-auto border-t border-t-border-base">
                {moreTabs.map(({ label, value, tooltip, disabled }, index) => (
                  <Tooltip key={index} title={tooltip}>
                    <Button
                      className="rounded-none text-left"
                      disabled={disabled}
                      onClick={(e) => {
                        onSelect(value, e)
                        setMoreOpen(false)
                      }}
                      pressed={selectedMoreTabIndex === index}
                      variant="ghost"
                    >
                      {label}
                    </Button>
                  </Tooltip>
                ))}
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  )
}

type TabProps = {
  children: ReactNode | ReactNode[]
  index: number
  hoveringIndex: number | undefined
  selectedIndex: number
  loading: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
  onMouseOver: () => void
  noWrap?: boolean
  buttonClassName?: string
  buttonContentContainerClassName?: string
  tooltip?: NonNullable<ReactNode>
  disabled?: boolean
}

const Tab = forwardRef<HTMLDivElement, TabProps>(function Tab(
  {
    children,
    index,
    hoveringIndex,
    selectedIndex,
    loading,
    onClick,
    onMouseOver,
    noWrap,
    buttonClassName,
    buttonContentContainerClassName,
    tooltip,
    disabled,
  },
  ref
) {
  return (
    <div className="flex flex-row items-stretch">
      {/* Don't render left border for the first element. */}
      {index > 0 && (
        <div
          className={clsx(
            'h-4 w-[1px] shrink-0 self-center bg-border-primary opacity-100',
            {
              // Emphasize left border when...
              '!bg-border-interactive-hover':
                // left tab hovering.
                hoveringIndex === index - 1 ||
                // current tab hovering.
                hoveringIndex === index,
              // Don't show left border if...
              '!opacity-0':
                // left tab selected.
                selectedIndex === index - 1 ||
                // current tab selected.
                selectedIndex === index,
            }
          )}
          style={{
            // Fade out a bit longer than it takes the sliding indicator to
            // move so it doesn't look like these borders disappear until
            // after the indicator reaches its place. Still transition
            // background color quickly on hover to match the quick
            // transition of the brighter text on hover.
            transition: 'background-color 150ms, opacity 500ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        ></div>
      )}

      <div className="relative w-full" ref={ref}>
        {/* Sliding selection indicator. It matches the width of the first button and offsets based on the selection index. */}
        {index === 0 && selectedIndex > -1 && (
          <div
            className={clsx(
              'absolute top-0 bottom-0 h-full w-full rounded-md bg-background-primary transition-[left] duration-300 motion-reduce:!transition-none'
            )}
            style={{
              left: `calc(${selectedIndex} * 100%)`,
            }}
          ></div>
        )}

        <Tooltip title={tooltip}>
          <Button
            className={clsx(
              // Render transparent background so the sliding indicator can
              // show through underneath.
              'relative flex h-full w-full items-center justify-center !bg-transparent !px-4',
              disabled
                ? // Dim text a lot when disabled.
                  '!text-text-interactive-disabled'
                : selectedIndex === index || hoveringIndex === index
                  ? // Brighten text when selected or hovering over this tab.
                    '!text-text-body'
                  : // Dim text when not selected and not hovering over this tab.
                    '!text-text-secondary',
              noWrap && 'whitespace-nowrap',
              buttonClassName
            )}
            contentContainerClassName={buttonContentContainerClassName}
            disabled={disabled}
            loading={loading}
            onClick={onClick}
            onMouseOver={disabled ? undefined : onMouseOver}
            variant="ghost"
          >
            {children}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
})
