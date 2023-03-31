import { Close } from '@mui/icons-material'
import { ComponentProps, useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import {
  ActionComponent,
  GenericTokenBalance,
  LoadingData,
} from '@dao-dao/types'
import {
  NATIVE_TOKEN,
  convertDenomToMicroDenomWithDecimals,
  convertMicroDenomToDenomWithDecimals,
} from '@dao-dao/utils'

import { IconButton } from '../icon_buttons'
import { InputErrorMessage, TokenInput } from '../inputs'

export type NativeCoinSelectorProps = ComponentProps<
  ActionComponent<{
    nativeBalances: LoadingData<GenericTokenBalance[]>
  }>
> & {
  onRemove?: () => void
  className?: string
}

export const NativeCoinSelector = ({
  onRemove,
  fieldNamePrefix,
  errors,
  isCreating,
  options: { nativeBalances },
  className,
}: NativeCoinSelectorProps) => {
  const { t } = useTranslation()
  const { register, setValue, watch, setError, clearErrors } = useFormContext()

  const watchAmount = watch(fieldNamePrefix + 'amount')
  const watchDenom = watch(fieldNamePrefix + 'denom')

  const selectedTokenBalance = nativeBalances.loading
    ? undefined
    : nativeBalances.data.find(
        ({ token }) => token.denomOrAddress === watchDenom
      )

  const validatePossibleSpend = useCallback(
    (id: string, amount: string): string | boolean => {
      if (nativeBalances.loading) {
        return true
      }

      const native = nativeBalances.data.find(
        ({ token }) => token.denomOrAddress === id
      )
      if (native) {
        const microAmount = convertDenomToMicroDenomWithDecimals(
          amount,
          native.token.decimals
        )
        return (
          microAmount <= Number(native.balance) ||
          t('error.cantSpendMoreThanTreasury', {
            amount: convertMicroDenomToDenomWithDecimals(
              native.balance,
              native.token.decimals
            ).toLocaleString(undefined, {
              maximumFractionDigits: native.token.decimals,
            }),
            tokenSymbol: native.token.symbol,
          })
        )
      }
      // If there are no native tokens in the treasury the native balances
      // query will return an empty list.
      if (id === NATIVE_TOKEN.denomOrAddress) {
        return t('error.cantSpendMoreThanTreasury', {
          amount: 0,
          tokenSymbol: NATIVE_TOKEN.symbol,
        })
      }
      return 'Unrecognized denom.'
    },
    // Deeply compare nativeBalances since they may change on every render, but
    // the validation function should only be updated when the balances change.
    // Since this validation function reference is used in the effect below that
    // updates errors, deeploy compare prevents an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useDeepCompareMemoize([nativeBalances, t])
  )

  // Update amount+denom combo error each time either field is updated
  // instead of setting errors individually on each field. Since we only
  // show one or the other and can't detect which error is newer, this
  // would lead to the error not updating if amount set an error and then
  // denom was changed.
  useEffect(() => {
    if (!watchAmount || !watchDenom) {
      if (errors?._error) {
        clearErrors(fieldNamePrefix + '_error')
      }
      return
    }

    const validation = validatePossibleSpend(watchDenom, watchAmount)
    if (validation === true) {
      if (errors?._error) {
        clearErrors(fieldNamePrefix + '_error')
      }
    } else if (
      typeof validation === 'string' &&
      errors?._error?.message !== validation
    ) {
      setError(fieldNamePrefix + '_error', {
        type: 'custom',
        message: validation,
      })
    }
  }, [
    errors,
    setError,
    clearErrors,
    validatePossibleSpend,
    fieldNamePrefix,
    watchAmount,
    watchDenom,
  ])

  const minAmount = convertMicroDenomToDenomWithDecimals(
    1,
    selectedTokenBalance?.token?.decimals ?? NATIVE_TOKEN.decimals
  )

  return (
    <div className={className}>
      <div className="flex flex-row items-stretch gap-2">
        <TokenInput
          amountError={errors?.amount || errors?._error}
          amountFieldName={fieldNamePrefix + 'amount'}
          amountMax={
            selectedTokenBalance &&
            convertMicroDenomToDenomWithDecimals(
              selectedTokenBalance.balance,
              selectedTokenBalance.token.decimals
            )
          }
          amountMin={minAmount}
          amountStep={minAmount}
          onSelectToken={({ denomOrAddress }) =>
            setValue(fieldNamePrefix + 'denom', denomOrAddress)
          }
          readOnly={!isCreating}
          register={register}
          selectedToken={selectedTokenBalance?.token}
          setValue={setValue}
          tokens={
            nativeBalances.loading
              ? { loading: true }
              : {
                  loading: false,
                  data: nativeBalances.data.map(({ token }) => token),
                }
          }
          watch={watch}
        />

        {isCreating && (
          <IconButton
            Icon={Close}
            className="self-center"
            onClick={onRemove}
            size="sm"
            variant="ghost"
          />
        )}
      </div>

      <InputErrorMessage error={errors?.amount} />
      <InputErrorMessage error={errors?.denom} />
      <InputErrorMessage error={errors?._error} />
    </div>
  )
}
