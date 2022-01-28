import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import React, { ChangeEventHandler, ReactNode } from 'react'
import {
  FieldErrors,
  FieldPath,
  FieldError,
  Path,
  FieldPathValue,
  UseFormRegister,
  Validate,
  Control,
  Controller,
} from 'react-hook-form'
import HelpTooltip from './HelpTooltip'
import { useThemeContext } from 'contexts/theme'

// This check is to prevent this import to be server side rendered.
if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
  require('codemirror/mode/javascript/javascript.js')
}

export function makeFieldErrorMessage<
  TFieldValues,
  TFieldName extends FieldPath<TFieldValues>
>(errors: FieldErrors<TFieldValues>) {
  return function (fieldName: TFieldName, msg?: string): string {
    const err = (errors as any)[fieldName]
    if (err) {
      if (!msg) {
        if (err.type === 'required') {
          msg = `"${fieldName}" is required`
        } else {
          msg = `bad input for ${fieldName} (${err.type})`
        }
      }
      return msg
    }
    return ''
  }
}

export function InputFieldLabel({
  fieldName,
  errorText,
  showErrorMessage,
  toolTip,
  label,
}: {
  fieldName: any
  label?: string
  toolTip?: string
  errorText?: string
  showErrorMessage?: boolean
}) {
  if (!label) {
    return null
  }
  const errorComponent =
    errorText && !(showErrorMessage === false) ? (
      <span className="label-text text-error flex-1 text-right">
        {errorText}
      </span>
    ) : null
  const tooltipComponent = toolTip ? <HelpTooltip text={toolTip} /> : null
  return (
    <label className="label" htmlFor={fieldName}>
      <span className="label-text text-secondary text-medium mt-3">
        {label || fieldName}
      </span>
      {errorComponent}
      {tooltipComponent}
    </label>
  )
}

// todo look at react-hook-form formcontext
export default function InputField<
  TFieldValues,
  TFieldName extends FieldPath<TFieldValues>
>({
  fieldName,
  label,
  toolTip,
  type = 'text',
  placeholder = '',
  readOnly,
  errorMessage,
  onChange,
  size,
  defaultValue,
  required = true,
  min,
  max,
  showErrorMessage,
  validate,
  register,
  fieldErrorMessage,
  autoComplete = 'false',
  multiline = false,
  rows = 5,
}: {
  fieldName: TFieldName
  label?: string
  toolTip?: string
  type?: string
  placeholder?: string
  readOnly?: boolean
  errorMessage?: string
  size?: number
  defaultValue?: string | number
  required?: boolean
  min?: number
  max?: number
  showErrorMessage?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  validate?:
    | Validate<FieldPathValue<TFieldValues, TFieldName>>
    | Record<string, Validate<FieldPathValue<TFieldValues, TFieldName>>>
  register: UseFormRegister<TFieldValues>
  fieldErrorMessage(a: any, b: any): string
  autoComplete?: string
  multiline?: boolean
  rows?: number
}) {
  const options = { required, validate }
  const errorText = fieldErrorMessage(fieldName, errorMessage)
  const labelComponent = (
    <InputFieldLabel
      label={label}
      errorText={errorText}
      fieldName={fieldName}
      toolTip={toolTip}
      showErrorMessage={showErrorMessage}
    />
  )
  const inputComponent = multiline ? (
    <textarea
      {...register(fieldName, options)}
      className="block box-border m-0 w-full rounded-lg input input-bordered h-full"
      defaultValue={defaultValue}
      defaultChecked={
        type === 'checkbox' && defaultValue === 1 ? true : undefined
      }
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={onChange}
      rows={rows}
      autoComplete={autoComplete}
    />
  ) : (
    <input
      {...register(fieldName, options)}
      className={
        type === 'checkbox'
          ? 'toggle'
          : errorText
          ? `block box-border m-0 w-full rounded-lg input input-bordered input-error`
          : `block box-border m-0 w-full rounded-lg input input-bordered`
      }
      defaultValue={defaultValue}
      defaultChecked={
        type === 'checkbox' && defaultValue === 1 ? true : undefined
      }
      type={type}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={onChange}
      size={size}
      min={min}
      max={max}
      autoComplete={autoComplete}
    />
  )

  return (
    <div className="form-control">
      {labelComponent}
      {inputComponent}
    </div>
  )
}

export function InputLabel({ name }: { name: string }) {
  return (
    <label className="label">
      <span className="label-text text-secondary text-medium">{name}</span>
    </label>
  )
}

/**
 * @param label      - the label for the value that this will contain.
 * @param register   - the register function returned by `useForm`.
 * @param error      - any errors that have occured during validation of this
 *                     input.
 * @param validation - a list of functions that, when given the current value
 *                     of this field, return true if the value is valid and an
 *                     error message otherwise.
 */
export function ToggleInput<FieldValues, FieldName extends Path<FieldValues>>({
  label,
  register,
  validation,
  onChange,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  onChange?: ChangeEventHandler<HTMLInputElement>
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <input
      type="checkbox"
      defaultChecked={true}
      className="toggle toggle-lg"
      {...register(label, { validate, onChange })}
    />
  )
}

/**
 * @param label      - the label for the value that this will contain.
 * @param register   - the register function returned by `useForm`.
 * @param error      - any errors that have occured during validation of this
 *                     input.
 * @param validation - a list of functions that, when given the current value
 *                     of this field, return true if the value is valid and an
 *                     error message otherwise.
 */
export function NumberInput<FieldValues, FieldName extends Path<FieldValues>>({
  label,
  register,
  error,
  validation,
  onChange,
  defaultValue,
  step,
  border = true,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  onChange?: ChangeEventHandler<HTMLInputElement>
  defaultValue?: string
  step?: string | number
  border?: boolean
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <input
      type="number"
      step={step}
      defaultValue={defaultValue}
      className={`input
        ${error ? ' input-error' : ''}
        ${border ? ' input-bordered' : ''}`}
      {...register(label, { validate, onChange })}
    />
  )
}

/**
 * @param label      - the label for the value that this will contain.
 * @param register   - the register function returned by `useForm`.
 * @param error      - any errors that have occured during validation of this
 *                     input.
 * @param validation - a list of functions that, when given the current value
 *                     of this field, return true if the value is valid and an
 *                     error message otherwise.
 */
export function TextInput<FieldValues, FieldName extends Path<FieldValues>>({
  label,
  register,
  error,
  validation,
  border = true,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  border?: boolean
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <input
      type="text"
      className={`input
        ${error ? ' input-error' : ''}
        ${border ? ' input-bordered' : ''}`}
      {...register(label, { validate })}
    />
  )
}

export function CodeMirrorInput<
  FieldValues,
  FieldName extends Path<FieldValues>
>({
  label,
  control,
  validation,
}: {
  label: FieldName
  control: Control<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  const themeContext = useThemeContext()
  const editorTheme = themeContext.theme !== 'junoDark' ? 'default' : 'material'

  const cmOptions = {
    mode: {
      name: 'javascript',
      json: true,
    },
    theme: editorTheme,
    lineNumbers: true,
    lineWrapping: true,
    autoCloseBrackets: true,
    tabSize: 2,
    gutters: ['CodeMirror-lint-markers'],
    lint: true,
  }

  return (
    <Controller
      control={control}
      name={label}
      rules={{ validate: validate }}
      shouldUnregister
      render={({ field: { onChange, onBlur, ref } }) => {
        return (
          <CodeMirror
            onChange={(_editor, _data, value) => onChange(value)}
            onBlur={(_instance, _event) => onBlur()}
            ref={ref}
            options={cmOptions}
            className="rounded"
          />
        )
      }}
    />
  )
}

export function TextareaInput<
  FieldValues,
  FieldName extends Path<FieldValues>
>({
  label,
  register,
  error,
  validation,
  border = true,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  border?: boolean
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <textarea
      className={`textarea
        ${error ? ' textarea-error' : ''}
        ${border ? ' textarea-bordered' : ''}`}
      {...register(label, { validate })}
    ></textarea>
  )
}

export function AddressInput<FieldValues, FieldName extends Path<FieldValues>>({
  label,
  register,
  error,
  validation,
  border = true,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  border?: boolean
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <input
      type="text"
      className={`input text-sm font-mono
        ${error ? ' input-error' : ''}
        ${border ? ' input-bordered' : ''}`}
      {...register(label, { validate })}
    />
  )
}

export function SelectInput<FieldValues, FieldName extends Path<FieldValues>>({
  label,
  register,
  error,
  validation,
  children,
  border = true,
  defaultValue,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  children: ReactNode
  border?: boolean
  defaultValue?: string
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <select
      className={`select font-normal
        ${error ? ' select-error' : ''}
        ${border ? ' select-bordered' : ''}`}
      defaultValue={defaultValue}
      {...register(label, { validate })}
    >
      {children}
    </select>
  )
}

export function InputErrorMessage({ error }: { error: FieldError }) {
  if (error && error.message) {
    return <span className="text-xs text-error mt-1 ml-1">{error.message}</span>
  }
  return null
}
