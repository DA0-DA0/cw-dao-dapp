import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  CopyToClipboard,
  IbcDestinationChainPicker,
  InputErrorMessage,
  Loader,
  WarningCard,
  useChain,
} from '@dao-dao/stateless'
import { LoadingDataWithError } from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { getDisplayNameForChainId, getImageUrlForChainId } from '@dao-dao/utils'

export type CreateIcaAccountData = {
  chainId: string
}

export type CreateIcaAccountOptions = {
  createdAddressLoading: LoadingDataWithError<string | undefined>
}

export const CreateIcaAccountComponent: ActionComponent<
  CreateIcaAccountOptions
> = ({
  fieldNamePrefix,
  isCreating,
  errors,
  options: { createdAddressLoading },
}) => {
  const { t } = useTranslation()
  const { watch, setValue } = useFormContext<CreateIcaAccountData>()
  const { chain_id: sourceChainId } = useChain()

  const destinationChainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const imageUrl = getImageUrlForChainId(destinationChainId)

  return (
    <>
      {isCreating ? (
        <>
          <IbcDestinationChainPicker
            buttonClassName="self-start"
            includeSourceChain={false}
            onChainSelected={(chainId) =>
              setValue((fieldNamePrefix + 'chainId') as 'chainId', chainId)
            }
            selectedChainId={destinationChainId}
            sourceChainId={sourceChainId}
          />

          <InputErrorMessage className="-mt-2" error={errors?.chainId} />
        </>
      ) : (
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md bg-background-secondary px-4 py-3">
          <div className="flex flex-row items-center gap-2">
            {imageUrl && (
              <div
                className="h-6 w-6 bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                }}
              ></div>
            )}

            <p className="primary-text shrink-0">
              {getDisplayNameForChainId(destinationChainId)}
            </p>
          </div>

          {createdAddressLoading.loading ? (
            <Loader />
          ) : createdAddressLoading.errored ? (
            <WarningCard
              content={
                createdAddressLoading.error instanceof Error
                  ? createdAddressLoading.error.message
                  : `${createdAddressLoading.error}`
              }
            />
          ) : createdAddressLoading.data ? (
            <CopyToClipboard
              className="min-w-0"
              takeN={18}
              tooltip={t('button.clickToCopyAddress')}
              value={createdAddressLoading.data}
            />
          ) : (
            <p className="secondary-text">{t('info.pending')}</p>
          )}
        </div>
      )}
    </>
  )
}