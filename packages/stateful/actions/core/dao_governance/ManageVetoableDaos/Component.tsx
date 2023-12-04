import { ComponentType } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ChainPickerInput,
  ChainProvider,
  InputErrorMessage,
  InputLabel,
  RadioInputNoForm,
  SegmentedControlsTitle,
} from '@dao-dao/stateless'
import { AddressInputProps, StatefulEntityDisplayProps } from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { getChainForChainId } from '@dao-dao/utils'
import {
  makeValidateContractAddress,
  validateRequired,
} from '@dao-dao/utils/validation'

export type ManageVetoableDaosData = {
  chainId: string
  address: string
  enable: boolean
}

export interface ManageVetoableDaosOptions {
  currentlyEnabled: {
    chainId: string
    dao: string
  }[]
  AddressInput: ComponentType<AddressInputProps<ManageVetoableDaosData>>
  EntityDisplay: ComponentType<StatefulEntityDisplayProps>
}

export const ManageVetoableDaosComponent: ActionComponent<
  ManageVetoableDaosOptions
> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: { currentlyEnabled, AddressInput, EntityDisplay },
}) => {
  const { t } = useTranslation()
  const { register, setValue, watch } = useFormContext<ManageVetoableDaosData>()

  const chainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const address = watch((fieldNamePrefix + 'address') as 'address')
  const chain = getChainForChainId(chainId)

  const enable = watch((fieldNamePrefix + 'enable') as 'enable')

  return (
    <>
      {isCreating && (
        <ChainPickerInput
          className="mb-4"
          fieldName={fieldNamePrefix + 'chainId'}
        />
      )}

      <div className="flex flex-col gap-1">
        <SegmentedControlsTitle
          className="mb-4"
          editable={isCreating}
          fieldName={(fieldNamePrefix + 'enable') as 'enable'}
          tabs={[
            {
              label: t('button.enable'),
              value: true,
            },
            {
              label: t('button.disable'),
              value: false,
            },
          ]}
        />

        {!isCreating || enable ? (
          <>
            <InputLabel
              name={t('title.dao')}
              tooltip={
                enable
                  ? t('info.enableVetoerDaoDescription')
                  : t('info.disableVetoerDaoDescription')
              }
            />

            <ChainProvider chainId={chainId}>
              <AddressInput
                disabled={!isCreating}
                error={errors?.address}
                fieldName={(fieldNamePrefix + 'address') as 'address'}
                register={register}
                type="contract"
                validation={[
                  validateRequired,
                  makeValidateContractAddress(chain.bech32_prefix),
                ]}
              />
            </ChainProvider>
          </>
        ) : (
          <>
            <InputLabel name={t('form.daosCurrentlyEnabled')} />

            <RadioInputNoForm
              onChange={({ chainId, dao }) => {
                setValue((fieldNamePrefix + 'chainId') as 'chainId', chainId)
                setValue((fieldNamePrefix + 'address') as 'address', dao)
              }}
              options={currentlyEnabled.map((value) => ({
                value,
                display: (
                  <ChainProvider chainId={value.chainId}>
                    <EntityDisplay address={value.dao} />
                  </ChainProvider>
                ),
              }))}
              selected={currentlyEnabled.find(
                (value) => value.chainId === chainId && value.dao === address
              )}
            />
          </>
        )}

        <InputErrorMessage error={errors?.address} />
      </div>
    </>
  )
}