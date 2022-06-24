import { Coin } from '@cosmjs/stargate'
import { XIcon } from '@heroicons/react/solid'
import { ComponentProps, FC } from 'react'
import { useFormContext } from 'react-hook-form'

import { useTranslation } from '@dao-dao/i18n'
import { InputErrorMessage, NumberInput, SelectInput } from '@dao-dao/ui'
import {
  NATIVE_DECIMALS,
  NATIVE_DENOM,
  convertDenomToMicroDenomWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  nativeTokenLabel,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { ActionComponent } from '..'

export interface NativeCoinSelectorProps
  extends ComponentProps<ActionComponent<{ nativeBalances: readonly Coin[] }>> {
  className?: string
}

export const NativeCoinSelector: FC<NativeCoinSelectorProps> = ({
  onRemove,
  getFieldName,
  errors,
  readOnly,
  options: { nativeBalances },
  className,
}) => {
  const { t } = useTranslation()
  const { register, setValue, watch } = useFormContext()

  const watchAmount = watch(getFieldName('amount'))
  const watchDenom = watch(getFieldName('denom'))

  const validatePossibleSpend = (
    id: string,
    amount: string
  ): string | boolean => {
    const native = nativeBalances.find(({ denom }) => denom === id)
    if (native) {
      const microAmount = convertDenomToMicroDenomWithDecimals(
        amount,
        NATIVE_DECIMALS
      )
      return (
        Number(microAmount) <= Number(native.amount) ||
        t('cantSpendMoreThanTreasury', {
          amount: convertMicroDenomToDenomWithDecimals(
            native.amount,
            NATIVE_DECIMALS
          ).toLocaleString(undefined, {
            maximumFractionDigits: NATIVE_DECIMALS,
          }),
          tokenSymbol: nativeTokenLabel(id),
        })
      )
    }
    // If there are no native tokens in the treasury the native balances
    // query will return an empty list.
    if (id === NATIVE_DENOM) {
      return t('cantSpendMoreThanTreasury', {
        amount: 0,
        tokenSymbol: nativeTokenLabel(NATIVE_DENOM),
      })
    }
    return 'Unrecognized denom.'
  }

  return (
    <div className={className}>
      <div className="flex flex-row gap-2 items-stretch">
        <NumberInput
          disabled={readOnly}
          error={errors?.amount}
          fieldName={getFieldName('amount')}
          onPlusMinus={[
            () =>
              setValue(
                getFieldName('amount'),
                Math.max(Number(watchAmount) + 1, 1 / 10 ** NATIVE_DECIMALS)
              ),
            () =>
              setValue(
                getFieldName('amount'),
                Math.max(Number(watchAmount) - 1, 1 / 10 ** NATIVE_DECIMALS)
              ),
          ]}
          register={register}
          sizing="auto"
          step={1 / 10 ** NATIVE_DECIMALS}
          validation={[
            validateRequired,
            validatePositive,
            (amount: string) => validatePossibleSpend(watchDenom, amount),
          ]}
        />

        <SelectInput
          defaultValue={NATIVE_DENOM}
          disabled={readOnly}
          error={errors?.denom}
          fieldName={getFieldName('denom')}
          register={register}
          validation={[
            (denom: string) => validatePossibleSpend(denom, watchAmount),
          ]}
        >
          {nativeBalances.map(({ denom }) => (
            <option key={denom} value={denom}>
              ${nativeTokenLabel(denom)}
            </option>
          ))}
        </SelectInput>

        {!readOnly && (
          <button onClick={onRemove} type="button">
            <XIcon className="w-4 h-4 text-error" />
          </button>
        )}
      </div>

      <InputErrorMessage error={errors?.amount ?? errors?.denom} />
    </div>
  )
}
