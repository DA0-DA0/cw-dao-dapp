import { useEffect } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  FormCheckbox,
  InputErrorMessage,
  InputLabel,
  NativeCoinSelector,
  useChain,
} from '@dao-dao/stateless'
import {
  GenericTokenBalance,
  LoadingData,
  LoadingDataWithError,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { Coin } from '@dao-dao/types/protobuf/codegen/cosmos/base/v1beta1/coin'
import { getNativeTokenForChainId } from '@dao-dao/utils'

export type CreateValenceAccountData = {
  chainId: string
  funds: {
    denom: string
    amount: string
    // Will multiply `amount` by 10^decimals when generating the message.
    decimals: number
  }[]
  acknowledgedServiceFee?: boolean
  serviceFee?: Coin
}

export type CreateValenceAccountOptions = {
  nativeBalances: LoadingData<GenericTokenBalance[]>
  serviceFee: LoadingDataWithError<GenericTokenBalance | null>
}

export const CreateValenceAccountComponent: ActionComponent<
  CreateValenceAccountOptions
> = ({
  fieldNamePrefix,
  isCreating,
  errors,
  options: { serviceFee, nativeBalances },
}) => {
  const { t } = useTranslation()
  const { chainId } = useChain()

  const { control, watch, setValue, setError, clearErrors } =
    useFormContext<CreateValenceAccountData>()
  const {
    fields: coins,
    append: appendCoin,
    remove: removeCoin,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix + 'funds') as 'funds',
  })

  const acknowledgedServiceFee = watch(
    (fieldNamePrefix + 'acknowledgedServiceFee') as 'acknowledgedServiceFee'
  )

  useEffect(() => {
    if (!isCreating) {
      return
    }

    if (acknowledgedServiceFee) {
      if (errors?.acknowledgedServiceFee) {
        clearErrors(
          (fieldNamePrefix +
            'acknowledgedServiceFee') as 'acknowledgedServiceFee'
        )
      }
    } else {
      if (!errors?.acknowledgedServiceFee) {
        setError(
          (fieldNamePrefix +
            'acknowledgedServiceFee') as 'acknowledgedServiceFee',
          {
            type: 'required',
            message: t('error.acknowledgeServiceFee'),
          }
        )
      }
    }
  }, [
    isCreating,
    acknowledgedServiceFee,
    fieldNamePrefix,
    clearErrors,
    setError,
    t,
    errors?.acknowledgedServiceFee,
  ])

  const nativeToken = getNativeTokenForChainId(chainId)

  return (
    <>
      <div className="flex flex-col gap-2">
        <InputLabel name={t('form.initialBalances')} primary />

        {coins.map(({ id }, index) => (
          <NativeCoinSelector
            key={id + index}
            chainId={chainId}
            errors={errors?.funds?.[index]}
            fieldNamePrefix={fieldNamePrefix + `funds.${index}.`}
            isCreating={isCreating}
            onRemove={
              // Don't allow removing the first token.
              isCreating && coins.length > 1
                ? () => removeCoin(index)
                : undefined
            }
            overrideInsufficientFundsWarning={(amount, tokenSymbol) =>
              t('error.insufficientFundsWarningMinusServiceFee', {
                amount,
                tokenSymbol,
              })
            }
            tokens={nativeBalances}
          />
        ))}

        {!isCreating && coins.length === 0 && (
          <p className="-mt-1 text-xs italic text-text-tertiary">
            {t('info.none')}
          </p>
        )}

        {isCreating && (
          <>
            <Button
              className="self-start"
              onClick={() =>
                appendCoin({
                  amount: '1',
                  denom: nativeToken.denomOrAddress,
                  decimals: nativeToken.decimals,
                })
              }
              variant="secondary"
            >
              {t('button.addToken')}
            </Button>

            <div className="flex flex-row gap-2 items-center mt-4">
              <FormCheckbox
                fieldName={
                  (fieldNamePrefix +
                    'acknowledgedServiceFee') as 'acknowledgedServiceFee'
                }
                setValue={setValue}
                size="sm"
                value={acknowledgedServiceFee}
              />

              <p
                className="body-text cursor-pointer"
                onClick={() =>
                  setValue(
                    (fieldNamePrefix +
                      'acknowledgedServiceFee') as 'acknowledgedServiceFee',
                    !acknowledgedServiceFee
                  )
                }
              >
                {t('info.acknowledgeServiceFee', {
                  fee: serviceFee.loading
                    ? '...'
                    : serviceFee.errored
                      ? '<error>'
                      : serviceFee.data
                        ? t('format.token', {
                            amount: HugeDecimal.from(
                              serviceFee.data.balance
                            ).toInternationalizedHumanReadableString({
                              decimals: serviceFee.data.token.decimals,
                            }),
                            symbol: serviceFee.data.token.symbol,
                          })
                        : '',
                  context:
                    serviceFee.loading || serviceFee.errored || serviceFee.data
                      ? undefined
                      : 'none',
                })}
              </p>
            </div>

            <InputErrorMessage error={errors?.acknowledgedServiceFee} />
          </>
        )}
      </div>
    </>
  )
}
