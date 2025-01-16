import { fromBech32 } from '@cosmjs/encoding'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ImportMultisigForm, ImportMultisigModalProps } from '@dao-dao/types'
import {
  formatPercentOf100,
  getConfiguredChains,
  isValidBech32Address,
  makeValidateAddress,
} from '@dao-dao/utils'

import { useChain } from '../../../contexts'
import { useProcessTQ } from '../../../hooks'
import { Button } from '../../buttons'
import { InputErrorMessage, InputLabel } from '../../inputs'
import { Loader } from '../../logo'
import { Modal } from '../../modals'
import { ChainPickerPopup } from '../../popup'

export const ImportMultisigModal = ({
  loadingMultisig,
  onImport,
  AddressInput,
  EntityDisplay,
  ...props
}: ImportMultisigModalProps) => {
  const { t } = useTranslation()
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ImportMultisigForm>()
  const address = watch('address')

  const { chainId, bech32Prefix } = useChain()

  const processTQ = useProcessTQ()
  const processedMultisigTQ =
    loadingMultisig.loading || loadingMultisig.errored
      ? undefined
      : processTQ(loadingMultisig.data.config.threshold)

  const multisigType =
    loadingMultisig.loading || loadingMultisig.errored || !processedMultisigTQ
      ? 'unknown'
      : 'absolute_count' in loadingMultisig.data.config.threshold
        ? t('info.xOfYMultisig', {
            x: processedMultisigTQ.threshold.display,
            y: loadingMultisig.data.config.totalWeight,
          })
        : [
            t('title.threshold') + ': ' + processedMultisigTQ.threshold.display,
            processedMultisigTQ.quorum &&
              t('info.quorum') + ': ' + processedMultisigTQ.quorum.display,
          ]
            .filter(Boolean)
            .join(', ')

  return (
    <Modal
      {...props}
      containerClassName="sm:!max-w-xl"
      contentContainerClassName="gap-4"
      header={{
        title: t('title.importMultisig'),
        subtitle: t('info.importMultisigDescription'),
      }}
    >
      <div className="space-y-1">
        <InputLabel>{t('title.chain')}</InputLabel>
        <ChainPickerPopup
          buttonClassName="self-start"
          chains={{
            type: 'configured',
          }}
          onSelect={(chainId) => {
            // Type-check. None option is disabled so should not be possible.
            if (!chainId) {
              return
            }

            setValue('chainId', chainId)
          }}
          selectedChainId={chainId}
        />
      </div>

      <div className="space-y-1">
        <InputLabel>{t('form.address')}</InputLabel>
        <AddressInput
          error={
            errors?.address ||
            (loadingMultisig.errored
              ? loadingMultisig.error.message
              : undefined)
          }
          fieldName="address"
          hideEntity
          onChange={({ target: { value: newAddress } }) => {
            // Find first chain with matching prefix and update if needed.
            if (newAddress) {
              try {
                const { prefix } = fromBech32(newAddress)
                const matchingChainId = getConfiguredChains().find(
                  ({ chain }) => chain.bech32Prefix === prefix
                )?.chainId
                if (matchingChainId && matchingChainId !== chainId) {
                  setValue('chainId', matchingChainId)
                }
              } catch {}
            }
          }}
          placeholder={bech32Prefix + '...'}
          register={register}
          setValue={setValue}
          validation={[makeValidateAddress(bech32Prefix)]}
          watch={watch}
        />
        <InputErrorMessage
          error={
            errors?.address ||
            (loadingMultisig.errored
              ? loadingMultisig.error.message
              : undefined)
          }
        />
      </div>

      {isValidBech32Address(address, bech32Prefix) &&
        (loadingMultisig.loading ? (
          <Loader size={24} />
        ) : (
          !loadingMultisig.errored && (
            <>
              <div className="flex flex-col gap-4 rounded-md bg-background-tertiary p-4">
                <div className="space-y-2">
                  <InputLabel>{t('title.type')}</InputLabel>

                  <p className="primary-text">{multisigType}</p>
                </div>

                <div className="space-y-2">
                  <InputLabel>{t('title.members')}</InputLabel>

                  {loadingMultisig.data.config.members.map(
                    ({ address, weight }) => (
                      <div
                        key={address}
                        className="flex flex-row items-center justify-between"
                      >
                        <EntityDisplay address={address} />

                        <p className="secondary-text shrink-0 font-mono">
                          {formatPercentOf100(
                            (weight / loadingMultisig.data.config.totalWeight) *
                              100
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <Button
                center
                onClick={() => onImport(loadingMultisig.data)}
                size="lg"
                variant="brand"
              >
                {t('button.import')}
              </Button>
            </>
          )
        ))}
    </Modal>
  )
}
