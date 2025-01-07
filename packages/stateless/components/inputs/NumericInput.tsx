import { Add, Remove } from '@mui/icons-material'
import clsx from 'clsx'
import { useRef } from 'react'
import { FieldValues, Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import { NumericInputProps } from '@dao-dao/types'
import { toAccessibleImageUrl } from '@dao-dao/utils'

import { IconButton } from '../icon_buttons'

/**
 * This input is designed for numeric values and takes advantage of the
 * HugeDecimal class to handle large decimal numbers gracefully.
 *
 * By default, it uses human-readable strings for value storage. You can instead
 * use a number by setting the `numericValue` prop, but this should only be used
 * when not needing to store potentially large numbers.
 *
 * There is no need to provide `value` when providing `fieldName` and `register`
 * via react-hook-form.
 *
 * To show plus/minus buttons, make sure to provide `setValue` and either
 * `fieldName`+`getValues` or `value`. When using a react-hook-form form,
 * `setValue` and `getValues` can be retrieved easily from `useForm` or
 * `useFormContext`. When not using a react-hook-form form, the `setValue`
 * function can easily be mocked, and its first argument (`fieldName`) can be
 * ignored.
 */
export const NumericInput = <
  FV extends FieldValues,
  FieldName extends Path<FV>,
>({
  fieldName,
  register,
  error,
  validation,
  hidePlusMinus,
  numericValue,
  value,
  getValues,
  setValue,
  disabled,
  sizing,
  className,
  containerClassName,
  required,
  ghost,
  unit,
  unitIconUrl,
  textClassName,
  unitClassName,
  unitIconClassName,
  unitContainerClassName,
  plusMinusButtonSize = 'sm',
  ...props
}: NumericInputProps<FV, FieldName>) => {
  const { t } = useTranslation()
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  const lastValueSet = useRef('')

  return (
    <div
      className={clsx(
        'flex flex-row items-center gap-2 bg-transparent transition',
        // Padding and outline
        !ghost && 'rounded-md py-3 px-4 ring-1 ring-inset focus-within:ring-2',
        // Outline color
        error
          ? 'ring-border-interactive-error'
          : 'ring-border-primary focus-within:ring-border-interactive-focus',
        // Sizing
        {
          'w-28': sizing === 'sm',
          'w-40': sizing === 'md',
          'w-56': sizing === 'lg',
          'w-28 md:w-32 lg:w-40': sizing === 'auto',
          'w-full': sizing === 'fill',
        },
        containerClassName
      )}
    >
      {!hidePlusMinus && !disabled && setValue && (
        <div
          className={clsx(
            'flex flex-row items-center gap-1',
            // Add small gap between buttons when larger buttons are used.
            plusMinusButtonSize === 'lg' && 'gap-1'
          )}
        >
          {/* Minus button */}
          <IconButton
            Icon={Remove}
            disabled={disabled}
            iconClassName="text-icon-secondary"
            onClick={() =>
              setValue(
                fieldName ?? '',
                HugeDecimal.min(
                  HugeDecimal.max(
                    ...(props.min !== undefined ? [props.min] : []),
                    // Subtract 1 whole number and truncate.
                    HugeDecimal.from(
                      (fieldName && getValues ? getValues(fieldName) : value) ||
                        0
                    )
                      .minus(1)
                      .trunc()
                  ),
                  ...(props.max !== undefined ? [props.max] : [])
                ).toString(),
                {
                  shouldValidate: true,
                }
              )
            }
            size={
              // The larger button size for this input corresponds to the
              // default icon button size.
              plusMinusButtonSize === 'lg' ? 'default' : plusMinusButtonSize
            }
            variant="ghost"
          />

          <IconButton
            Icon={Add}
            disabled={disabled}
            iconClassName="text-icon-secondary"
            onClick={() =>
              setValue(
                fieldName ?? '',
                HugeDecimal.min(
                  HugeDecimal.max(
                    ...(props.min !== undefined ? [props.min] : []),
                    // Add 1 whole number and truncate.
                    HugeDecimal.from(
                      (fieldName && getValues ? getValues(fieldName) : value) ||
                        0
                    )
                      .plus(1)
                      .trunc()
                  ),
                  ...(props.max !== undefined ? [props.max] : [])
                ).toString(),
                {
                  shouldValidate: true,
                }
              )
            }
            size={
              // The larger button size for this input corresponds to the
              // default icon button size.
              plusMinusButtonSize === 'lg' ? 'default' : plusMinusButtonSize
            }
            variant="ghost"
          />
        </div>
      )}

      <input
        className={clsx(
          'ring-none secondary-text text-text-body w-full grow appearance-none border-none bg-transparent text-right outline-none',
          className,
          textClassName
        )}
        disabled={disabled}
        onInput={
          // If not registering with react-hook-form, manually listen for input
          // value change and call `setValue`.
          fieldName && register
            ? undefined
            : setValue &&
              (({ target }) => {
                const value = (target as HTMLInputElement).value

                // If a decimal point is entered, and we already set the same
                // value without a decimal point, don't set again. We don't want
                // to clear the decimal point in the case that this input is
                // controlled and the parent component transforms the value
                // manually into a number and back (which would clear the
                // decimal point).
                if (value === lastValueSet.current + '.') {
                  return
                }

                lastValueSet.current = value
                setValue(
                  fieldName ?? '',
                  numericValue
                    ? // Treat empty strings as NaN when manually setting value.
                      value.trim() === ''
                      ? NaN
                      : Number(value)
                    : value
                )
              })
        }
        type="number"
        value={value}
        {...props}
        {...(fieldName &&
          register?.(fieldName, {
            required: required && t('info.required'),
            validate,
            valueAsNumber: numericValue,
          }))}
      />

      {(unit || unitIconUrl) && (
        <div
          className={clsx(
            'flex flex-row items-center gap-1.5 max-w-[10rem] shrink-0 min-w-0',
            unitContainerClassName
          )}
        >
          {unitIconUrl && (
            <div
              className={clsx(
                'h-5 w-5 shrink-0 bg-cover bg-center rounded-full ml-1',
                unitIconClassName
              )}
              style={{
                backgroundImage: `url(${toAccessibleImageUrl(unitIconUrl)})`,
              }}
            />
          )}

          <p
            className={clsx(
              'secondary-text text-text-tertiary max-w-[10rem] shrink-0 truncate text-right',
              textClassName,
              unitClassName
            )}
          >
            {unit}
          </p>
        </div>
      )}
    </div>
  )
}
