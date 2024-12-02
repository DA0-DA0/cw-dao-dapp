import { Star, WarningRounded } from '@mui/icons-material'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import cloneDeep from 'lodash.clonedeep'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  Action,
  ActionCategoryKey,
  ActionKey,
  ActionKeyAndData,
} from '@dao-dao/types'
import { processError } from '@dao-dao/utils'

import { useActionsContext } from '../../contexts'
import { useLoadingPromise, useSearchFilter, useUpdatingRef } from '../../hooks'
import { Button } from '../buttons'
import { Collapsible } from '../Collapsible'
import { SearchBar } from '../inputs'
import { Loader } from '../logo'
import { NoContent } from '../NoContent'
import { TooltipInfoIcon } from '../tooltip'

export type ActionLibraryProps = {
  /**
   * The react-hook-form field name that stores the action data.
   */
  actionDataFieldName: string
  /**
   * A callback when an action is selected.
   */
  onSelect?: (action: Action) => void
  /**
   * Whether or not to start with the library open.
   *
   * Defaults to true.
   */
  defaultOpen?: boolean
}

const ACTION_SEARCH_FILTERABLE_KEYS: Fuse.FuseOptionKey<Action>[] = [
  'key',
  'metadata.label',
  'metadata.description',
  'metadata.keywords',
]

export const ActionLibrary = ({
  actionDataFieldName,
  onSelect,
  defaultOpen = true,
}: ActionLibraryProps) => {
  const { t } = useTranslation()
  const { actions, actionMap, categories } = useActionsContext()

  const { control, watch } = useFormContext<{
    actionData: ActionKeyAndData[]
  }>()
  const { append: addAction } = useFieldArray({
    name: actionDataFieldName as 'actionData',
    control,
  })
  const actionData = watch(actionDataFieldName as 'actionData') || []

  const [, setSelectingActionKey] = useState<ActionKey>()
  const onSelectRef = useUpdatingRef(onSelect)
  const onSelectAction = useCallback(
    async (action: Action) => {
      // Trigger state update so that UI updates based on action status.
      setSelectingActionKey(action.key)
      try {
        onSelectRef.current?.(action)

        if (!action.ready) {
          await action.init()
        }

        addAction({
          // See `ActionKeyAndData` comment in `packages/types/actions.ts` for
          // an explanation of why we need to append with a unique ID.
          _id: nanoid(),
          actionKey: action.key,
          // Clone to prevent the form from mutating the original object.
          data: cloneDeep(action.defaults),
        })
      } catch (err) {
        console.error(err)
        toast.error(
          processError(err, {
            forceCapture: false,
          })
        )
      } finally {
        // Trigger state update so that UI updates based on action status.
        setSelectingActionKey(undefined)
      }
    },
    [addAction, onSelectRef]
  )

  const [_categoryKeySelected, setCategoryKeySelected] = useState<
    ActionCategoryKey | undefined
  >(categories[0]?.key)

  // Default nothing selected.
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // The action library is active if the most recent mouse click was within the
  // action library container. This ensures we don't capture arrow and enter
  // keys across multiple action libraries (like in multiple choice proposals)
  // or when the user is typing into an input elsewhere.
  const [isActionLibraryActive, setIsActionLibraryActive] = useState(false)
  const actionLibraryRef = useRef<HTMLDivElement>(null)
  const itemsListRef = useRef<HTMLDivElement>(null)
  const searchBarRef = useRef<HTMLInputElement>(null)

  const {
    searchBarProps,
    filteredData: filteredActions,
    filter,
    setFilter,
  } = useSearchFilter({
    data: actions,
    filterableKeys: ACTION_SEARCH_FILTERABLE_KEYS,
    // If filter is updated, unselect category and select first item.
    onFilterChange: () => {
      setCategoryKeySelected(undefined)
      setSelectedIndex(0)
    },
  })

  // Initialize all filtered actions and re-render when the promise changes
  // since this affects the actions displayed.
  useLoadingPromise({
    promise: async () =>
      filter
        ? Promise.all(
            filteredActions.map(({ item: action }) => action.init()) || []
          )
        : [],
    deps: [filter, filteredActions],
  })

  // If filter exists, unselect category.
  const categoryKeySelected = filter
    ? undefined
    : // Fallback to first category if state empty.
      _categoryKeySelected || categories[0]?.key
  const selectedCategory = categoryKeySelected
    ? categories.find((c) => c.key === categoryKeySelected)
    : undefined

  const filterVisibleActions = (action: Action) =>
    // Never show programmatic actions.
    !action.metadata.programmaticOnly &&
    // Never show actions that should be hidden from the picker.
    !action.metadata.hideFromPicker &&
    // Show if reusable or not already used.
    (!action.metadata.notReusable ||
      !actionData.some((a) => a.actionKey === action.key))

  const categoryActions = categoryKeySelected
    ? (selectedCategory || categories[0]).actionKeys.flatMap(
        (key) => actionMap[key] || []
      )
    : undefined

  // Initialize all category actions and re-render when the promise changes
  // since this affects the actions displayed.
  useLoadingPromise({
    promise: async () =>
      Promise.all(categoryActions?.map((a) => a.init()) || []),
    deps: [categoryKeySelected],
  })

  const showingActions = (
    categoryActions?.filter(filterVisibleActions) ||
    filteredActions
      .map(({ item }) => item)
      .filter(filterVisibleActions)
      .slice(0, 10)
  ).sort((a, b) =>
    a.metadata.listOrder !== undefined && b.metadata.listOrder !== undefined
      ? a.metadata.listOrder - b.metadata.listOrder
      : // Prioritize the action with an order set.
      a.metadata.listOrder
      ? -1
      : b.metadata.listOrder
      ? 1
      : // Leave them sorted by the original order in the category definition.
        0
  )

  // Ensure selected item is scrolled into view.
  useEffect(() => {
    const item = itemsListRef.current?.children[selectedIndex]
    if (!item) {
      return
    }

    // Only scroll if not already visible.
    const { bottom, top } = item.getBoundingClientRect()
    const containerRect = itemsListRef.current.getBoundingClientRect()
    if (top >= containerRect.top && bottom <= containerRect.bottom) {
      return
    }

    item.scrollIntoView({
      behavior: 'smooth',
    })
  }, [selectedIndex])

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!isActionLibraryActive) {
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((index) =>
            index - 1 < 0
              ? showingActions.length - 1
              : // Just in case for some reason the index is overflowing.
                Math.min(index - 1, showingActions.length - 1)
          )
          break
        case 'ArrowDown':
        case 'Tab':
          event.preventDefault()
          setSelectedIndex(
            // Just in case for some reason the index is underflowing.
            (index) => Math.max(index + 1, 0) % showingActions.length
          )
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < showingActions.length) {
            onSelectAction(showingActions[selectedIndex])
          }
          break
      }
    },
    [isActionLibraryActive, selectedIndex, showingActions, onSelectAction]
  )

  // Add event listeners.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    // Update activity based on whether or not the last click was within the
    // action library.
    const updateIsActionLibraryActive = (event: MouseEvent | TouchEvent) => {
      if (actionLibraryRef.current?.contains(event.target as Node)) {
        setIsActionLibraryActive(true)
      } else {
        setIsActionLibraryActive(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', updateIsActionLibraryActive)
    document.addEventListener('touchstart', updateIsActionLibraryActive)
    document.addEventListener('keydown', handleKeyPress)

    // Clean up event listeners on unmount.
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.removeEventListener('touchstart', updateIsActionLibraryActive)
      document.removeEventListener('mousedown', updateIsActionLibraryActive)
    }
  }, [handleKeyPress, isActionLibraryActive])

  return (
    <Collapsible
      containerClassName="flex flex-col gap-4 rounded-md border border-dashed border-border-primary p-4 relative"
      defaultCollapsed={!defaultOpen}
      dropdownContainerClassName="!ml-0"
      label={t('title.actionLibrary')}
      labelClassName="!title-text"
      labelContainerClassName="!py-0"
      noContentIndent
      ref={actionLibraryRef}
      tooltip={t('info.actionLibraryDescription')}
    >
      <SearchBar
        {...searchBarProps}
        className="text-sm"
        containerClassName="mb-4 md:mb-0 md:absolute md:top-4 md:right-4 md:w-[6rem] md:focus-within:w-full md:max-w-xs md:ring-[transparent] !duration-300 transition-all md:!ring-0 md:!p-0 md:!pb-1 overflow-hidden"
        iconClassName="md:!h-6 md:!w-6"
        onIconClick={() => searchBarRef.current?.focus()}
        ref={searchBarRef}
      />

      <div className="flex flex-col gap-x-3 gap-y-1 md:flex-row md:items-start">
        <div className="no-scrollbar -mx-4 flex min-w-0 shrink-0 flex-row gap-y-0 overflow-x-auto px-4 pb-2 pt-1 md:w-56 md:flex-col md:pb-1">
          {categories.map((category) => (
            <Button
              key={category.key}
              className={clsx(
                'shrink-0 rounded-b-none border-b border-transparent !py-1 !px-2 md:w-full md:rounded-b-md md:!border-b-0 md:!py-2 md:!px-3 md:text-left',
                categoryKeySelected === category.key &&
                  '!border-icon-primary md:bg-background-interactive-selected'
              )}
              onClick={() => {
                setCategoryKeySelected(category.key)
                setFilter('')
              }}
              variant="none"
            >
              {category.key === ActionCategoryKey.CommonlyUsed && (
                <Star className="!h-5 !w-5" />
              )}

              {category.label}
            </Button>
          ))}
        </div>

        <div className="bg-border-primary hidden w-[1px] min-w-0 shrink-0 self-stretch md:block"></div>

        {showingActions.length > 0 ? (
          <div
            className="flex min-w-0 grow flex-col gap-2 pt-1 md:pb-1"
            ref={itemsListRef}
          >
            {showingActions.map((action, index) => (
              <ActionLibraryRow
                key={action.key + index}
                action={action}
                onClick={() => onSelectAction(action)}
                selected={selectedIndex === index}
              />
            ))}
          </div>
        ) : (
          <NoContent
            Icon={WarningRounded}
            body={t('info.nothingFound')}
            className="self-center !border-0 grow md:-mt-4"
          />
        )}
      </div>
    </Collapsible>
  )
}

export type ActionLibraryRowProps = {
  /**
   * The action to display.
   */
  action: Action
  /**
   * Whether or not the action is selected.
   */
  selected: boolean
  /**
   * Callback when the action is clicked.
   */
  onClick: () => void
}

export const ActionLibraryRow = ({
  action,
  selected,
  onClick,
}: ActionLibraryRowProps) => {
  // If action is not ready, initialize it, and re-render when the promise
  // changes since this affects the action state (e.g. loading, error, etc.).
  useLoadingPromise({
    promise: async () => action.init(),
    deps: [action],
  })

  return (
    <Button
      className={clsx(selected && 'bg-background-interactive-selected')}
      contentContainerClassName="gap-4 text-left"
      disabled={action.status === 'loading' || action.status === 'error'}
      onClick={onClick}
      variant="ghost"
    >
      {action.metadata.Icon && (
        <p className="text-3xl">
          <action.metadata.Icon />
        </p>
      )}

      <div className="flex grow flex-col items-start gap-1">
        <p className="primary-text">{action.metadata.label}</p>
        <p className="caption-text">{action.metadata.description}</p>
      </div>

      {action.status === 'error' &&
        action.error &&
        action.error instanceof Error && (
          <TooltipInfoIcon
            size="lg"
            title={processError(action.error, {
              forceCapture: false,
            })}
            warning
          />
        )}

      {action.status === 'loading' && <Loader fill={false} size={32} />}
    </Button>
  )
}
