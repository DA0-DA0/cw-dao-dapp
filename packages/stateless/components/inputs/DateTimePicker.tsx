import './DateTimePicker.css'

import { Today } from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import ReactDateTimePicker from 'react-datetime-picker'
import {
  Control,
  Controller,
  FieldPathValue,
  FieldValues,
  Path,
  Validate,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { browserIs12Hour, browserTimeZone } from '@dao-dao/utils'

import { useUpdatingRef } from '../../hooks'

export type DateTimePickerNoFormProps = {
  /**
   * Date value.
   */
  value: string | Date | null | undefined
  /**
   * The onChange function that is called when the value changes.
   */
  onChange?: (value: Date | null) => void | Promise<void>
  /**
   * Override default input field name of "datetime".
   */
  name?: string
  /**
   * Any truthy value adds an error border style.
   */
  error?: unknown
  /**
   * Whether or not the input is disabled.
   */
  disabled?: boolean
  /**
   * Minimum date.
   */
  minDate?: Date
  /**
   * Maximum date.
   */
  maxDate?: Date
  /**
   * Optional class names to apply to the input container.
   */
  className?: string
}

export type DateTimePickerProps<
  FV extends FieldValues,
  FieldName extends Path<FV>,
> = Omit<DateTimePickerNoFormProps, 'value' | 'onChange' | 'name'> & {
  /**
   * The control value returned by `useForm`.
   */
  control: Control<FV>
  /**
   * The field name for the value this will contain.
   */
  fieldName: FieldName
  /**
   * A list of functions that, when given the current value of this field,
   * return true if the value is valid and an error message otherwise.
   */
  validation?: Validate<FieldPathValue<FV, FieldName>>[]
  /**
   * Whether or not the input is required.
   */
  required?: boolean
}

export const DateTimePicker = <
  FV extends FieldValues,
  FieldName extends Path<FV>,
>({
  control,
  fieldName,
  validation,
  required,
  ...props
}: DateTimePickerProps<FV, FieldName>) => {
  const { t } = useTranslation()
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field: { onChange, value } }) => (
        <DateTimePickerNoForm {...props} onChange={onChange} value={value} />
      )}
      rules={{
        required: required && t('info.required'),
        validate,
      }}
    />
  )
}

export const DateTimePickerNoForm = ({
  value,
  onChange,
  name,
  error,
  disabled,
  minDate,
  maxDate,
  className,
}: DateTimePickerNoFormProps) => {
  // Check if locale uses 12/24 hour format.
  const [is12HourFormat] = useState(browserIs12Hour)
  const [tz] = useState(browserTimeZone)

  // If min or max date change, update the value manually if needed.
  const onChangeRef = useUpdatingRef(onChange)
  useEffect(() => {
    if (
      disabled ||
      !onChangeRef.current ||
      !value ||
      (typeof value === 'string' && isNaN(Date.parse(value))) ||
      (!minDate && !maxDate)
    ) {
      return
    }

    const date = value instanceof Date ? value : new Date(value)

    if (minDate && date < minDate) {
      onChangeRef.current(minDate)
    } else if (maxDate && date > maxDate) {
      onChangeRef.current(maxDate)
    }
  }, [minDate, maxDate, onChangeRef, value, disabled])

  return (
    <ReactDateTimePicker
      autoFocus={false}
      calendarIcon={() => (
        <div className="-ml-0.5 flex flex-row gap-5 justify-between grow items-center cursor-auto">
          {/* Add timezone in between the time and calendar icon button */}
          <p
            className="opacity-80 cursor-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {tz}
          </p>

          {!disabled && (
            <Today className="!text-icon-primary !w-5 !h-5 hover:opacity-80 active:opacity-70 transition-opacity cursor-pointer" />
          )}
        </div>
      )}
      className={clsx(
        '!secondary-text !text-text-body w-full transition !bg-transparent focus:outline-none rounded-md ring-1 focus:ring-2',
        // Outline color
        error
          ? 'ring-border-interactive-error'
          : 'ring-border-primary focus:ring-border-interactive-focus',
        className
      )}
      clearIcon={null}
      dayPlaceholder="00"
      disableClock
      disabled={disabled}
      format={'y-MM-dd ' + (is12HourFormat ? `h:mm a` : 'HH:mm')}
      hourPlaceholder={is12HourFormat ? '0' : '00'}
      maxDate={maxDate}
      minDate={minDate}
      minutePlaceholder="00"
      monthPlaceholder="00"
      name={name}
      onChange={onChange}
      value={value}
      yearPlaceholder="0000"
    />
  )
}
