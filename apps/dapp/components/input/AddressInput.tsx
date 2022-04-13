import { ChangeEventHandler } from 'react'

import {
  FieldError,
  FieldPathValue,
  Path,
  UseFormRegister,
  Validate,
} from 'react-hook-form'

import SvgWallet from '@components/icons/Wallet'

export function AddressInput<FieldValues, FieldName extends Path<FieldValues>>({
  label,
  register,
  error,
  validation,
  onChange,
  disabled = false,
}: {
  label: FieldName
  register: UseFormRegister<FieldValues>
  onChange?: ChangeEventHandler<HTMLInputElement>
  validation?: Validate<FieldPathValue<FieldValues, FieldName>>[]
  error?: FieldError
  disabled?: boolean
}) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )
  return (
    <div
      className={`flex items-center gap-1 bg-transparent rounded-lg px-3 py-2 transition focus-within:ring-1 focus-within:outline-none ring-brand ring-offset-0 border-default border border-default text-sm font-mono
        ${error ? ' ring-error ring-1' : ''}`}
    >
      <SvgWallet color="currentColor" width="24px" />
      <input
        className="w-full bg-transparent border-none outline-none ring-none"
        disabled={disabled}
        placeholder="Juno address"
        type="text"
        {...register(label, { validate, onChange })}
      />
    </div>
  )
}
