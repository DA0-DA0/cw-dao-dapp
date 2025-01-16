import { Add } from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentType, useState } from 'react'
import {
  FieldError,
  FieldPathValue,
  FieldValues,
  Path,
  PathValue,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  Validate,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { TransProps } from '@dao-dao/types'
import {
  processError,
  toAccessibleImageUrl,
  validateUrlWithIpfs,
} from '@dao-dao/utils'

import { Button } from '../buttons/Button'
import { Modal } from '../modals/Modal'
import { ImageUploadInput } from './ImageUploadInput'
import { InputErrorMessage } from './InputErrorMessage'
import { InputLabel } from './InputLabel'
import { TextInput } from './TextInput'

// Return the field name paths that have type string.
export type StringFieldNames<FieldValues> = {
  [Property in Path<FieldValues>]: PathValue<FieldValues, Property> extends
    | string
    | undefined
    ? Property
    : never
}[Path<FieldValues>]

export interface ImageSelectorModalProps<
  FV extends FieldValues,
  StringFieldName extends StringFieldNames<FV>,
> {
  fieldName: StringFieldName
  register: UseFormRegister<FV>
  watch: UseFormWatch<FV>
  setValue: UseFormSetValue<FV>
  error?: FieldError
  onCloseOrDone: (done: boolean) => void
  loading?: boolean
  disabled?: boolean
  Trans: ComponentType<TransProps>
  buttonLabel?: string
  imageClassName?: string
  visible?: boolean
  style?: 'avatar' | 'banner'
}

export const ImageSelectorModal = <
  FV extends FieldValues,
  StringFieldName extends StringFieldNames<FV>,
>({
  fieldName,
  register,
  error,
  setValue,
  watch,
  onCloseOrDone,
  loading,
  disabled,
  Trans,
  buttonLabel,
  imageClassName,
  visible = true,
  style = 'avatar',
}: ImageSelectorModalProps<FV, StringFieldName>) => {
  const { t } = useTranslation()
  const imageUrl = watch(fieldName) ?? ''

  const [uploadError, setUploadError] = useState<string>()

  return (
    <Modal
      contentContainerClassName="gap-3 items-center max-w-[16rem]"
      hideCloseButton
      onClose={() => onCloseOrDone(false)}
      visible={visible}
    >
      <div
        className={clsx(
          'border border-border-secondary bg-cover bg-center bg-no-repeat mb-4',
          {
            'rounded-full h-24 w-24': style === 'avatar',
            'rounded-lg h-24 w-full': style === 'banner',
          },
          imageClassName
        )}
        role="img"
        style={
          imageUrl
            ? {
                backgroundImage: `url(${toAccessibleImageUrl(imageUrl)})`,
              }
            : {}
        }
      />

      <div className="flex flex-col gap-1 self-stretch">
        <InputLabel
          mono
          name={t('form.enterImageUrl')}
          tooltip={t('form.imageUrlTooltip')}
        />
        <TextInput
          // Auto focus does not work on mobile Safari by design
          // (https://bugs.webkit.org/show_bug.cgi?id=195884#c4).
          autoFocus={visible}
          error={error}
          fieldName={fieldName}
          onKeyDown={(e) => {
            // Prevent submitting form on enter.
            if (e.key === 'Enter') {
              e.preventDefault()
              onCloseOrDone(true)
            }
          }}
          register={register}
          validation={[validateUrlWithIpfs]}
        />
        <InputErrorMessage error={error} />
      </div>

      <div className="flex flex-col gap-2 self-stretch">
        <InputLabel mono name={t('form.orUploadOne')} />
        <ImageUploadInput
          Trans={Trans}
          className={clsx(style === 'avatar' && 'aspect-square')}
          onChange={(url) => {
            setUploadError(undefined)
            setValue(fieldName, url as any)
          }}
          onError={(error) =>
            setUploadError(processError(error, { forceCapture: false }))
          }
        />
        <InputErrorMessage error={uploadError} />
      </div>

      <Button
        className="self-end"
        disabled={disabled}
        loading={loading}
        onClick={() => onCloseOrDone(true)}
      >
        {buttonLabel || t('button.done')}
      </Button>
    </Modal>
  )
}

export interface ImageSelectorProps<
  FV extends FieldValues,
  StringFieldName extends StringFieldNames<FV>,
> {
  fieldName: StringFieldName
  register: UseFormRegister<FV>
  validation?: Validate<FieldPathValue<FV, StringFieldName>>[]
  watch: UseFormWatch<FV>
  setValue: UseFormSetValue<FV>
  Trans: ComponentType<TransProps>
  disabled?: boolean
  error?: FieldError
  className?: string
  size?: string | number
  style?: 'avatar' | 'banner'
}

export const ImageSelector = <
  FV extends FieldValues,
  StringFieldName extends StringFieldNames<FV>,
>({
  fieldName,
  error,
  watch,
  className,
  disabled,
  size,
  style = 'avatar',
  ...props
}: ImageSelectorProps<FV, StringFieldName>) => {
  const [showImageSelect, setShowImageSelect] = useState(false)
  const imageUrl = watch(fieldName) ?? ''

  return (
    <>
      <button
        className={clsx(
          'flex shrink-0 items-center justify-center border border-border-secondary bg-background-secondary bg-cover bg-center bg-no-repeat transition',
          style === 'avatar' && 'rounded-full',
          {
            'hover:ring': !disabled,
            'ring ring-border-interactive-error': error,
            'h-24 w-24': size === undefined && style === 'avatar',
          },
          className
        )}
        disabled={disabled}
        onClick={() => setShowImageSelect(true)}
        style={{
          backgroundImage: imageUrl
            ? `url(${toAccessibleImageUrl(imageUrl)})`
            : undefined,
          ...(size !== undefined && { width: size, height: size }),
        }}
        type="button"
      >
        {(typeof imageUrl !== 'string' || !imageUrl?.trim()) && (
          <Add className="h-6 w-6 text-icon-primary" />
        )}
      </button>

      {showImageSelect && (
        <ImageSelectorModal
          error={error}
          fieldName={fieldName}
          onCloseOrDone={() => setShowImageSelect(false)}
          style={style}
          watch={watch}
          {...props}
        />
      )}
    </>
  )
}
