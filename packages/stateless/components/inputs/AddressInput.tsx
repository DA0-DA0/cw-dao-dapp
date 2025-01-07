import { Code, Wallet } from '@mui/icons-material'
import clsx from 'clsx'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FieldValues, Path, useFormContext } from 'react-hook-form'

import { AddressInputProps, EntityType } from '@dao-dao/types'
import { getAccountAddress, isValidBech32Address } from '@dao-dao/utils'

import { useChain } from '../../contexts/Chain'
import { useTrackDropdown } from '../../hooks/useTrackDropdown'
import { EntityDisplay as StatelessEntityDisplay } from '../EntityDisplay'
import { Loader } from '../logo/Loader'

export const AddressInput = <
  FV extends FieldValues,
  FieldName extends Path<FV>,
>({
  fieldName,
  register,
  watch: _watch,
  setValue: _setValue,
  error,
  validation,
  onChange,
  disabled,
  required,
  className,
  containerClassName,
  type,
  EntityDisplay,
  autofillEntities,
  placeholder,
  hideEntity,
  ...rest
}: AddressInputProps<FV, FieldName>) => {
  const { chainId, bech32Prefix } = useChain()

  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  // Default to wallet icon.
  const Icon = type === 'contract' ? Code : Wallet

  // Null if not within a FormProvider.
  const formContext = useFormContext<FV>()
  const watch = _watch || formContext?.watch
  const setValue = _setValue || formContext?.setValue
  const formValue = fieldName ? watch?.(fieldName) : rest.value

  const showEntity =
    !hideEntity &&
    EntityDisplay &&
    !!formValue &&
    typeof formValue === 'string' &&
    isValidBech32Address(formValue, bech32Prefix)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputRegistration = register?.((fieldName ?? '') as any, {
    required: required && 'Required',
    validate,
    onChange,
  })

  const [inputFocused, setInputFocused] = useState(false)
  const autofillEntityContainerRef = useRef<HTMLDivElement | null>(null)
  const [selectedEntityIndex, setSelectedEntityIndex] = useState(0)
  // Ensure selected index stays valid.
  useEffect(() => {
    setSelectedEntityIndex((prev) =>
      Math.min(prev, autofillEntities?.entities.length ?? 0)
    )
  }, [autofillEntities])
  // Scroll to selected entity.
  useEffect(() => {
    if (!autofillEntityContainerRef.current || selectedEntityIndex === -1) {
      return
    }

    const selected = autofillEntityContainerRef.current.children[
      selectedEntityIndex
    ] as HTMLDivElement | undefined
    if (!selected) {
      return
    }

    // If selected entity is not in view, scroll to it.
    if (
      selected.offsetTop < autofillEntityContainerRef.current.scrollTop ||
      selected.offsetTop + selected.clientHeight >
        autofillEntityContainerRef.current.scrollTop +
          autofillEntityContainerRef.current.clientHeight
    ) {
      selected.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedEntityIndex])

  // Only show auto fill dropdown if there are entities to show.
  const showEntityAutoFill =
    inputFocused && autofillEntities && autofillEntities.entities.length > 0
  const selectAutofillEntity = useCallback(
    (index?: number) => {
      index ??= selectedEntityIndex

      if (
        !autofillEntities ||
        index < 0 ||
        index >= autofillEntities.entities.length
      ) {
        return
      }

      const selectedEntity = autofillEntities.entities[index]
      // Get address on current chain.
      const address =
        selectedEntity.chainId === chainId
          ? selectedEntity.address
          : selectedEntity.type === EntityType.Dao &&
            getAccountAddress({
              accounts: selectedEntity.daoInfo.accounts,
              chainId,
            })
      if (!address) {
        return
      }

      setValue?.((fieldName ?? '') as any, address as any, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })

      inputRef.current?.blur()
    },
    [autofillEntities, chainId, fieldName, selectedEntityIndex, setValue]
  )

  // Navigate between selected entities with arrow keys.
  useEffect(() => {
    // If not showing entity autofill, do not process keypresses.
    if (!showEntityAutoFill || !autofillEntities) {
      return
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          inputRef.current?.blur()
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedEntityIndex((index) =>
            index - 1 < 0
              ? autofillEntities.entities.length - 1
              : // Just in case for some reason the index is overflowing.
                Math.min(index - 1, autofillEntities.entities.length - 1)
          )
          break
        case 'ArrowDown':
        case 'Tab':
          event.preventDefault()
          setSelectedEntityIndex(
            // Just in case for some reason the index is underflowing.
            (index) => Math.max(index + 1, 0) % autofillEntities.entities.length
          )
          break
        case 'Enter':
          event.preventDefault()
          selectAutofillEntity()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    // Clean up event listener on unmount.
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [autofillEntities, selectAutofillEntity, showEntityAutoFill])

  // Only display entity if input is disabled and we're showing the entity. This
  // is probably showing in a readonly form with submitted data.
  const onlyDisplayEntity = disabled && showEntity

  // Track container to position the autofill dropdown.
  const { onDropdownRef, onTrackRef } = useTrackDropdown({
    top: (rect) => rect.bottom + 2,
    left: (rect) => rect.left - 2,
    width: (rect) => rect.width + 4,
    padding: 12,
  })

  return (
    <div
      className={clsx(
        'secondary-text flex min-w-0 items-center gap-3 bg-transparent font-sans text-sm transition-all',
        // If not only displaying entity, add more border.
        onlyDisplayEntity
          ? 'p-2'
          : [
              'rounded-md py-3 px-4 ring-1 focus-within:ring-2 ',
              error && !showEntityAutoFill
                ? 'ring-border-interactive-error'
                : 'ring-border-primary focus:ring-border-interactive-focus',
            ],
        showEntityAutoFill && 'rounded-b-none',
        containerClassName
      )}
      ref={onTrackRef}
    >
      {!onlyDisplayEntity && (
        <>
          {/* If entities are loading, display loader. */}
          {autofillEntities?.loading ? (
            <Loader fill={false} size={20} />
          ) : (
            <Icon className="!h-5 !w-5" />
          )}

          <input
            className={clsx(
              'ring-none body-text w-full border-none bg-transparent font-mono outline-none placeholder:font-sans',
              className
            )}
            disabled={disabled}
            onInput={
              inputRegistration
                ? undefined
                : (e: FormEvent<HTMLInputElement>) =>
                    setValue?.(
                      (fieldName ?? '') as any,
                      e.currentTarget.value as any
                    )
            }
            placeholder={
              placeholder ||
              // If contract, use chain prefix.
              (type === 'contract' ? `${bech32Prefix}...` : undefined)
            }
            type="text"
            {...rest}
            {...inputRegistration}
            onBlur={
              // Timeout to allow click event to happen on entity autofill row.
              () => setTimeout(() => setInputFocused(false), 100)
            }
            onFocus={() => setInputFocused(true)}
            ref={(ref) => {
              inputRegistration?.ref(ref)
              inputRef.current = ref
            }}
          />
        </>
      )}

      {showEntity && (
        <EntityDisplay
          address={formValue}
          className={clsx(
            'shrink-0',
            !onlyDisplayEntity && 'max-w-[50%]',
            disabled || 'pl-4'
          )}
        />
      )}

      {!disabled &&
        !!autofillEntities &&
        createPortal(
          <div
            className={clsx(
              'fixed z-[39] overflow-hidden rounded-b-md border-2 border-t-0 border-border-primary bg-component-dropdown transition-opacity',
              showEntityAutoFill
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
            )}
            ref={onDropdownRef}
          >
            <div
              className="no-scrollbar flex h-full max-h-80 flex-col overflow-y-auto"
              ref={autofillEntityContainerRef}
            >
              {autofillEntities.entities.map((entity, index) => (
                <div
                  key={entity.address}
                  className={clsx(
                    'cursor-pointer py-3 pl-4 pr-[6px] transition-all hover:bg-background-interactive-hover active:bg-background-interactive-pressed',
                    selectedEntityIndex === index &&
                      'bg-background-interactive-selected'
                  )}
                  onClick={() => selectAutofillEntity(index)}
                >
                  <StatelessEntityDisplay
                    address={entity.address}
                    className="!gap-3"
                    loadingEntity={{
                      loading: false,
                      data: entity,
                    }}
                    noCopy
                    noLink
                    noUnderline
                  />
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
