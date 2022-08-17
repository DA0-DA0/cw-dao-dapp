import clsx from 'clsx'
import { FieldError } from 'react-hook-form'

interface InputErrorMessageProps {
  error: FieldError | undefined
  className?: string
}

export const InputErrorMessage = ({
  error,
  className,
}: InputErrorMessageProps) =>
  error?.message ? (
    <span
      className={clsx(
        'inline-block mt-1 ml-1 max-w-prose text-xs text-error',
        className
      )}
    >
      {error.message}
    </span>
  ) : null
