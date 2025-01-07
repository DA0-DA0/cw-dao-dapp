import { ArrowDropDown } from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentPropsWithoutRef } from 'react'
import {
  FieldError,
  FieldPathValue,
  FieldValues,
  Path,
  UseFormRegister,
  Validate,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

export interface SelectInputProps<
  FV extends FieldValues,
  FieldName extends Path<FV>,
> extends Omit<ComponentPropsWithoutRef<'select'>, 'required' | 'onChange'> {
  fieldName?: FieldName
  register?: UseFormRegister<FV>
  validation?: Validate<FieldPathValue<FV, FieldName>>[]
  error?: FieldError
  required?: boolean
  onChange?: (value: string) => void
  containerClassName?: string
  iconClassName?: string
}

export const SelectInput = <
  FV extends FieldValues,
  FieldName extends Path<FV>,
>({
  fieldName,
  register,
  error,
  validation,
  children,
  required,
  className,
  onChange,
  containerClassName,
  iconClassName,
  disabled,
  ...props
}: SelectInputProps<FV, FieldName>) => {
  const { t } = useTranslation()
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  return (
    <div className={clsx('relative', containerClassName)}>
      <select
        className={clsx(
          'secondary-text h-full w-full appearance-none truncate rounded-md bg-transparent py-3 pl-4 text-text-body !outline-none ring-1 transition placeholder:text-text-tertiary focus:ring-2',
          error
            ? 'ring-border-interactive-error'
            : 'ring-border-primary focus:ring-border-interactive-focus',
          disabled
            ? 'pointer-events-none pr-4'
            : 'cursor-pointer pr-10 hover:bg-background-interactive-hover active:bg-background-interactive-pressed',
          className
        )}
        disabled={disabled}
        {...props}
        {...(register && fieldName
          ? register(fieldName, {
              required: required && t('info.required'),
              validate,
              ...(onChange && {
                onChange: (e: any) => onChange(e.target.value),
              }),
            })
          : {
              required,
              onChange: onChange && ((e: any) => onChange(e.target.value)),
            })}
      >
        {children}
      </select>

      {!disabled && (
        <div className="pointer-events-none absolute top-0 bottom-0 right-2 flex flex-row items-center">
          <ArrowDropDown className={clsx('!h-5 !w-5', iconClassName)} />
        </div>
      )}
    </div>
  )
}
