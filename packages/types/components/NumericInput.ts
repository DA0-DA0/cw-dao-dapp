import { ComponentPropsWithoutRef } from 'react'
import {
  FieldPathValue,
  FieldValues,
  Path,
  UseFormRegister,
  Validate,
} from 'react-hook-form'

export type NumericInputProps<
  FV extends FieldValues,
  FieldName extends Path<FV>,
> = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'required' | 'onInput'> & {
  /**
   * The field name for the form.
   */
  fieldName?: FieldName
  /**
   * Register function returned by `useForm`/`useFormContext`.
   */
  register?: UseFormRegister<FV>
  /**
   * Validations to apply when registering this input.
   */
  validation?: Validate<FieldPathValue<FV, FieldName>>[]
  /**
   * Applies to the input when registering with a form.
   */
  required?: boolean
  /**
   * If error present, outline input in red.
   */
  error?: any
  /**
   * Hide plus/minus buttons
   */
  hidePlusMinus?: boolean
  /**
   * Whether or not to store the value as a number in the react-hook-form form.
   * This should only be used when not needing to store potentially large
   * numbers.
   *
   * Defaults to false.
   */
  numericValue?: boolean
  /**
   * Value passed to the input.
   */
  value?: string
  /**
   * Used to get the value when the plus/minus buttons are clicked. Accepts the
   * react-hook-form `getValues` function, or any custom function.
   */
  getValues?: (fieldName: any) => string | undefined
  /**
   * Used to set the value when the input changes (if `register` is not pased
   * and thus react-hook-form is not being used) and when plus/minus buttons are
   * clicked. Accepts the react-hook-form `setValue` function, or any custom
   * function.
   */
  setValue?: (
    fieldName: any,
    value: string | number,
    options?: { shouldValidate: boolean }
  ) => void
  /**
   * Applies to the outer-most container, which contains the plus/minus buttons,
   * the input, and the unit.
   */
  containerClassName?: string
  /**
   * Size of the container.
   */
  sizing?: 'sm' | 'md' | 'lg' | 'auto' | 'fill' | 'none'
  /**
   * Remove padding, rounded corners, and outline.
   */
  ghost?: boolean
  /**
   * A unit to display to the right of the number.
   */
  unit?: string
  /**
   * A unit icon URL that displays to the left of the unit.
   */
  unitIconUrl?: string
  /**
   * Applies to both the input text and the unit.
   */
  textClassName?: string
  /**
   * Applies to the unit only.
   */
  unitClassName?: string
  /**
   * Applies to the unit icon only.
   */
  unitIconClassName?: string
  /**
   * Applies to the unit container only.
   */
  unitContainerClassName?: string
  /**
   * Size of the plus/minus buttons. Defaults to 'sm'.
   */
  plusMinusButtonSize?: 'sm' | 'lg'
}
