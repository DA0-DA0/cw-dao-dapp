import clsx from 'clsx'
import { ReactNode } from 'react'
import {
  FieldValues,
  Path,
  PathValue,
  UnpackNestedValue,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'

export type RadioInputOption<Value extends unknown = any> = {
  value: Value
} & ({ label: string } | { display: ReactNode })

export type RadioInputNoFormProps<Value extends unknown = any> = {
  options: RadioInputOption<Value>[]
  selected?: Value
  onChange: (value: Value) => void
  className?: string
  disabled?: boolean
  loading?: boolean
}

export const RadioInputNoForm = <Value extends unknown = any>({
  options,
  selected,
  onChange,
  className,
  disabled,
  loading,
}: RadioInputNoFormProps<Value>) => (
  <div
    className={clsx('flex flex-row flex-wrap items-stretch gap-2', className)}
  >
    {(loading
      ? [...new Array(3)].map(() => ({
          // value won't be used when loading
          // eslint-disable-next-line i18next/no-literal-string
          value: '' as any,
          display: <div className="w-20 h-full"></div>,
        }))
      : options
    ).map(({ value, ...labelOrDisplay }, index) => (
      <RadioButton
        key={index}
        background
        className={clsx(loading && 'animate-pulse bg-background-tertiary')}
        disabled={disabled || loading}
        onClick={loading ? undefined : () => onChange(value)}
        selected={!loading && selected === value}
        {...labelOrDisplay}
      />
    ))}
  </div>
)

export type RadioInputProps<
  FV extends FieldValues,
  FieldName extends Path<FV>,
> = Omit<
  RadioInputNoFormProps<UnpackNestedValue<PathValue<FV, FieldName>>>,
  'selected' | 'onChange'
> &
  Partial<
    Pick<
      RadioInputNoFormProps<UnpackNestedValue<PathValue<FV, FieldName>>>,
      'onChange'
    >
  > & {
    fieldName: FieldName
    watch: UseFormWatch<FV>
    setValue: UseFormSetValue<FV>
  }

export const RadioInput = <FV extends FieldValues, FieldName extends Path<FV>>({
  fieldName,
  watch,
  setValue,
  onChange,
  ...props
}: RadioInputProps<FV, FieldName>) => {
  const selected = watch(fieldName)

  return (
    <RadioInputNoForm
      onChange={(value) => {
        setValue(fieldName, value)
        onChange?.(value)
      }}
      selected={selected}
      {...props}
    />
  )
}

export type RadioButtonProps = {
  selected: boolean
  onClick?: () => void
  label?: string
  background?: boolean
  className?: string
  display?: ReactNode
  disabled?: boolean
}

export const RadioButton = ({
  selected,
  onClick,
  label,
  background,
  className,
  display,
  disabled,
}: RadioButtonProps) => (
  <div
    className={clsx(
      'flex flex-row items-center gap-3 transition',
      {
        'rounded-md py-3 px-4': background,
        'bg-background-secondary': background && selected,
        'cursor-pointer hover:bg-background-interactive-active':
          onClick && !disabled,
      },
      className
    )}
    onClick={disabled ? undefined : onClick}
  >
    <div className="flex aspect-square h-5 w-5 items-center justify-center rounded-full border border-border-primary">
      <div
        className={clsx(
          'h-3 w-3 rounded-full bg-background-button-active transition',
          {
            'opacity-0': !selected,
            'opacity-100': selected,
          }
        )}
      ></div>
    </div>

    {!!label && <p className="primary-text">{label}</p>}
    {display}
  </div>
)
