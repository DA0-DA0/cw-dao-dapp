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

export interface TextInputProps<
  FV extends FieldValues,
  FieldName extends Path<FV>,
> extends Omit<ComponentPropsWithoutRef<'input'>, 'required'> {
  fieldName?: FieldName
  register?: UseFormRegister<FV>
  validation?: Validate<FieldPathValue<FV, FieldName>>[]
  error?: FieldError
  required?: boolean
  ghost?: boolean
}

/**
 * @param fieldName  - the field name for the value that this will contain.
 * @param register   - the register function returned by `useForm`.
 * @param error      - any errors that have occured during validation of this
 *                     input.
 * @param validation - a list of functions that, when given the current value
 *                     of this field, return true if the value is valid and an
 *                     error message otherwise.
 */
export const TextInput = <FV extends FieldValues, FieldName extends Path<FV>>({
  fieldName,
  register,
  error,
  validation,
  className,
  required,
  ghost,
  type = 'text',
  ...rest
}: TextInputProps<FV, FieldName>) => {
  const { t } = useTranslation()
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  return (
    <input
      className={clsx(
        'secondary-text w-full appearance-none bg-transparent text-text-body transition placeholder:text-text-tertiary focus:outline-none',
        // Padding and outline
        !ghost && 'rounded-md py-3 px-4 ring-1 focus:ring-2',
        // Outline color
        error
          ? 'ring-border-interactive-error'
          : 'ring-border-primary focus:ring-border-interactive-focus',
        className
      )}
      type={type}
      {...rest}
      {...(register &&
        fieldName &&
        register(fieldName, {
          required: required && t('info.required'),
          validate,
        }))}
    />
  )
}
