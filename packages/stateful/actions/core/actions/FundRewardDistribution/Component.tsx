import clsx from 'clsx'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  DaoRewardDistributionPicker,
  InputErrorMessage,
  InputLabel,
  NumericInput,
  PercentButton,
  StatusCard,
  TokenAmountDisplay,
} from '@dao-dao/stateless'
import {
  DaoRewardDistribution,
  GenericTokenBalance,
  LoadingData,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { tokensEqual, validatePositive, validateRequired } from '@dao-dao/utils'

export type FundRewardDistributionData = {
  address: string
  id: number
  amount: string
}

export type FundRewardDistributionOptions = {
  /**
   * Existing reward distributions.
   */
  distributions: DaoRewardDistribution[]
  /**
   * All tokens owned by the DAO on its home chain.
   */
  tokens: LoadingData<GenericTokenBalance[]>
}

export const FundRewardDistributionComponent: ActionComponent<
  FundRewardDistributionOptions
> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: { distributions, tokens },
}) => {
  const { t } = useTranslation()
  const { register, setValue, watch, getValues } =
    useFormContext<FundRewardDistributionData>()

  const address = watch((fieldNamePrefix + 'address') as 'address')
  const id = watch((fieldNamePrefix + 'id') as 'id')
  const amount = watch((fieldNamePrefix + 'amount') as 'amount')

  const selectedDistribution = distributions.find(
    (distribution) => distribution.address === address && distribution.id === id
  )

  const selectedBalance =
    selectedDistribution && !tokens.loading
      ? HugeDecimal.from(
          tokens.data.find((t) =>
            tokensEqual(t.token, selectedDistribution.token)
          )?.balance || 0
        )
      : HugeDecimal.zero

  const warning =
    !isCreating || tokens.loading || tokens.updating || !selectedDistribution
      ? undefined
      : amount &&
          selectedBalance
            .toHumanReadable(selectedDistribution.token.decimals)
            .lt(amount)
        ? t('error.insufficientFundsWarning', {
            amount: selectedBalance.toInternationalizedHumanReadableString({
              decimals: selectedDistribution.token.decimals,
            }),
            tokenSymbol: selectedDistribution.token.symbol,
          })
        : undefined

  const minAmount = HugeDecimal.one.toHumanReadableNumber(
    selectedDistribution?.token.decimals ?? 0
  )

  return (
    <>
      <div className="flex flex-col gap-2 self-start">
        <InputLabel name={t('title.distribution')} primary />

        <DaoRewardDistributionPicker
          disabled={!isCreating}
          distributions={distributions}
          onSelect={({ address, id }) => {
            setValue((fieldNamePrefix + 'address') as 'address', address)
            setValue((fieldNamePrefix + 'id') as 'id', id)
          }}
          selectButtonVariant={!address ? 'primary' : 'ghost_outline'}
          selectedDistribution={selectedDistribution}
        />
      </div>

      {selectedDistribution && (
        <>
          <div className="flex flex-col gap-2 max-w-prose">
            <InputLabel name={t('form.funds')} primary />

            <NumericInput
              containerClassName={clsx(!isCreating && 'self-start')}
              disabled={!isCreating}
              error={errors?.amount}
              fieldName={(fieldNamePrefix + 'amount') as 'amount'}
              getValues={getValues}
              min={HugeDecimal.one.toHumanReadableNumber(
                selectedDistribution.token.decimals
              )}
              register={register}
              setValue={setValue}
              step={minAmount}
              unit={'$' + selectedDistribution.token.symbol}
              validation={[validateRequired, validatePositive]}
            />
            <InputErrorMessage error={errors?.amount} />
            <InputErrorMessage error={warning} warning />
          </div>

          {isCreating && (
            <div className="flex flex-row justify-between flex-wrap items-center -mt-2 mb-2 gap-x-8 gap-y-2 max-w-prose">
              <div className="flex flex-row items-center gap-2">
                <p className="caption-text">{t('info.yourBalance')}:</p>

                <TokenAmountDisplay
                  amount={selectedBalance}
                  decimals={selectedDistribution.token.decimals}
                  iconUrl={selectedDistribution.token.imageUrl}
                  onClick={() =>
                    setValue(
                      (fieldNamePrefix + 'amount') as 'amount',
                      selectedBalance.toHumanReadableString(
                        selectedDistribution.token.decimals
                      )
                    )
                  }
                  showFullAmount
                  symbol={selectedDistribution.token.symbol}
                />
              </div>

              {selectedBalance.isPositive() && (
                <div className="grid grid-cols-5 gap-1">
                  {[10, 25, 50, 75, 100].map((percent) => (
                    <PercentButton
                      key={percent}
                      amount={HugeDecimal.fromHumanReadable(
                        amount,
                        selectedDistribution.token.decimals
                      )}
                      loadingMax={{ loading: false, data: selectedBalance }}
                      percent={percent}
                      setAmount={(amount) =>
                        setValue(
                          (fieldNamePrefix + 'amount') as 'amount',
                          amount.toHumanReadableString(
                            selectedDistribution.token.decimals
                          )
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {isCreating &&
            'immediate' in selectedDistribution.active_epoch.emission_rate && (
              <StatusCard
                className="self-start max-w-prose"
                content={t('info.rewardsFundsWillBeDistributedImmediately', {
                  context: 'update',
                })}
                style="warning"
              />
            )}
        </>
      )}
    </>
  )
}
