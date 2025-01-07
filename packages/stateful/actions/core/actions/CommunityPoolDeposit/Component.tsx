import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  InputErrorMessage,
  TokenAmountDisplay,
  TokenInput,
} from '@dao-dao/stateless'
import { GenericTokenBalance, LoadingData } from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'

export type CommunityPoolDepositData = {
  chainId: string
  amount: string
  denom: string
  _error?: string
}

export type CommunityPoolDepositOptions = {
  tokens: LoadingData<GenericTokenBalance[]>
}

export const CommunityPoolDepositComponent: ActionComponent<
  CommunityPoolDepositOptions
> = ({ fieldNamePrefix, isCreating, errors, options: { tokens } }) => {
  const { t } = useTranslation()

  const { register, watch, setValue, getValues } =
    useFormContext<CommunityPoolDepositData>()

  const spendChainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const spendAmount = watch((fieldNamePrefix + 'amount') as 'amount')
  const spendDenom = watch((fieldNamePrefix + 'denom') as 'denom')

  const selectedToken = tokens.loading
    ? undefined
    : tokens.data.find(
        ({ token }) =>
          token.chainId === spendChainId && token.denomOrAddress === spendDenom
      )
  const selectedDecimals = selectedToken?.token.decimals ?? 0
  const selectedBalance = HugeDecimal.from(selectedToken?.balance ?? 0)

  // A warning if the denom was not found in the treasury or the amount is too
  // high. We don't want to make this an error because often people want to
  // spend funds that a previous action makes available, so just show a warning.
  const symbol = selectedToken?.token.symbol || spendDenom
  const warning =
    !isCreating || tokens.loading || !spendDenom
      ? undefined
      : !selectedToken
        ? t('error.unknownDenom', { denom: spendDenom })
        : selectedBalance.toHumanReadable(selectedDecimals).lt(spendAmount)
          ? t('error.insufficientFundsWarning', {
              amount: selectedBalance.toInternationalizedHumanReadableString({
                decimals: selectedDecimals,
              }),
              tokenSymbol: symbol,
            })
          : undefined

  return (
    <>
      <div className="flex min-w-0 flex-row flex-wrap items-stretch justify-between gap-x-3 gap-y-1">
        <TokenInput
          amount={{
            watch,
            setValue,
            getValues,
            register,
            fieldName: (fieldNamePrefix + 'amount') as 'amount',
            error: errors?.amount,
            min: HugeDecimal.one.toHumanReadableNumber(selectedDecimals),
            step: HugeDecimal.one.toHumanReadableNumber(selectedDecimals),
          }}
          onSelectToken={({ chainId, denomOrAddress }) => {
            setValue((fieldNamePrefix + 'chainId') as 'chainId', chainId)
            setValue((fieldNamePrefix + 'denom') as 'denom', denomOrAddress)
          }}
          readOnly={!isCreating}
          selectedToken={selectedToken?.token}
          tokens={
            tokens.loading
              ? { loading: true }
              : {
                  loading: false,
                  data: tokens.data.map(({ balance, token }) => ({
                    ...token,
                    description:
                      t('title.balance') +
                      ': ' +
                      HugeDecimal.from(
                        balance
                      ).toInternationalizedHumanReadableString({
                        decimals: token.decimals,
                      }),
                  })),
                }
          }
        />
      </div>

      {(errors?.amount || errors?.denom || errors?._error || warning) && (
        <div className="-mt-4 flex flex-col gap-1">
          <InputErrorMessage error={errors?.amount} />
          <InputErrorMessage error={errors?.denom} />
          <InputErrorMessage error={errors?._error} />
          <InputErrorMessage error={warning} warning />
        </div>
      )}

      {selectedToken && isCreating && (
        <div className="-mt-2 flex flex-row items-center gap-2">
          <p className="secondary-text">{t('title.balance')}:</p>

          <TokenAmountDisplay
            amount={selectedBalance}
            decimals={selectedToken.token.decimals}
            iconUrl={selectedToken.token.imageUrl}
            showFullAmount
            symbol={selectedToken.token.symbol}
          />
        </div>
      )}
    </>
  )
}
