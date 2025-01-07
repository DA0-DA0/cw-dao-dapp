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

export interface TextAreaInputProps<
  FV extends FieldValues,
  FieldName extends Path<FV>,
> extends Omit<ComponentPropsWithoutRef<'textarea'>, 'required'> {
  fieldName: FieldName
  register: UseFormRegister<FV>
  validation?: Validate<FieldPathValue<FV, FieldName>>[]
  error?: FieldError
  required?: boolean
}

export const TextAreaInput = <
  FV extends FieldValues,
  FieldName extends Path<FV>,
>({
  fieldName,
  register,
  error,
  validation,
  className,
  required,
  ...rest
}: TextAreaInputProps<FV, FieldName>) => {
  const { t } = useTranslation()
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  return (
    <textarea
      className={clsx(
        'secondary-text w-full appearance-none rounded-md bg-transparent py-3 px-4 text-text-body ring-1 transition placeholder:text-text-tertiary focus:outline-none focus:ring-2',
        error
          ? 'ring-border-interactive-error'
          : 'ring-border-primary focus:ring-border-interactive-focus',
        className
      )}
      {...rest}
      {...register(fieldName, {
        required: required && t('info.required'),
        validate,
      })}
    ></textarea>
  )
}
