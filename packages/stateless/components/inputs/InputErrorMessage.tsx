import clsx from 'clsx'
import { FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

export interface InputErrorMessageProps {
  error?: FieldError | string | Error | unknown
  warning?: boolean
  className?: string
}

export const InputErrorMessage = ({
  error,
  warning,
  className,
}: InputErrorMessageProps) => {
  const { t } = useTranslation()
  const message =
    error &&
    (typeof error === 'string'
      ? error
      : error instanceof Error ||
          (typeof error === 'object' &&
            'message' in error &&
            typeof (error as { message: string }).message === 'string')
        ? (error as { message: string }).message
        : t('error.unknownError'))

  return message ? (
    <span
      className={clsx(
        'mt-1 inline-block max-w-prose break-words text-xs',
        warning
          ? 'text-text-interactive-warning-body'
          : 'text-text-interactive-error',
        className
      )}
    >
      {message}
    </span>
  ) : null
}
