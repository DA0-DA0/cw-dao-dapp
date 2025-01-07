import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  InputErrorMessage,
  InputLabel,
  MarkdownRenderer,
  NumericInput,
  PercentButton,
  SegmentedControls,
  SelectInput,
  StatusCard,
  SwitchCard,
  TokenAmountDisplay,
  TokenInput,
  useActionOptions,
} from '@dao-dao/stateless'
import {
  DurationUnitsValues,
  DurationWithUnits,
  GenericToken,
  GenericTokenBalance,
  LoadingData,
  LoadingDataWithError,
  TokenType,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import {
  isValidBech32Address,
  tokensEqual,
  validateNonNegative,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

export type CreateRewardDistributionData = {
  type: TokenType
  denomOrAddress: string
  immediate: boolean
  rate: {
    amount: string
    duration: DurationWithUnits
  }
  initialFunds: string
  openFunding: boolean
}

export type CreateRewardDistributionOptions = {
  /**
   * All tokens owned by the DAO on its home chain.
   */
  tokens: LoadingData<GenericTokenBalance[]>
  /**
   * The token selected by the user.
   */
  token: LoadingDataWithError<GenericToken>
}

export const CreateRewardDistributionComponent: ActionComponent<
  CreateRewardDistributionOptions
> = ({ fieldNamePrefix, errors, isCreating, options: { tokens, token } }) => {
  const { t } = useTranslation()
  const {
    address,
    chain: { bech32Prefix },
  } = useActionOptions()
  const { register, setValue, watch, getValues } =
    useFormContext<CreateRewardDistributionData>()

  const denomOrAddress = watch(
    (fieldNamePrefix + 'denomOrAddress') as 'denomOrAddress'
  )
  const immediate = watch((fieldNamePrefix + 'immediate') as 'immediate')
  const rateDuration = watch(
    (fieldNamePrefix + 'rate.duration') as 'rate.duration'
  )
  const initialFunds = watch(
    (fieldNamePrefix + 'initialFunds') as 'initialFunds'
  )
  const openFunding = watch((fieldNamePrefix + 'openFunding') as 'openFunding')

  const selectedToken =
    tokens.loading || token.loading || token.errored || token.updating
      ? undefined
      : tokens.data.find((t) => tokensEqual(t.token, token.data))
  const decimals = selectedToken?.token.decimals ?? 0

  const selectedBalance = HugeDecimal.from(selectedToken?.balance ?? 0)
  const warning =
    !isCreating ||
    tokens.loading ||
    tokens.updating ||
    token.loading ||
    token.updating
      ? undefined
      : !selectedToken
        ? t('error.unknownDenom', { denom: denomOrAddress })
        : initialFunds &&
            selectedBalance.toHumanReadable(decimals).lt(initialFunds)
          ? t('error.insufficientFundsWarning', {
              amount: selectedBalance.toInternationalizedHumanReadableString({
                decimals,
              }),
              tokenSymbol: selectedToken.token.symbol,
            })
          : undefined

  return (
    <>
      <MarkdownRenderer
        className="body-text text-text-secondary"
        markdown={t('info.rewardDistributionDescription', {
          address,
        })}
      />

      <div className="flex flex-col gap-2 self-start">
        <InputLabel name={t('title.asset')} primary />
        <TokenInput
          allowCustomToken
          onCustomTokenChange={(custom) => {
            setValue(
              (fieldNamePrefix + 'denomOrAddress') as 'denomOrAddress',
              custom
            )

            // If denom entered is a valid contract address, it's most likely a
            // cw20 token. I've never seen a native denom that was formatted
            // like an address.
            const type = isValidBech32Address(custom, bech32Prefix)
              ? TokenType.Cw20
              : TokenType.Native
            setValue((fieldNamePrefix + 'type') as 'type', type)
          }}
          onSelectToken={(token) => {
            // Custom token selected
            if (!token) {
              return
            }

            setValue((fieldNamePrefix + 'type') as 'type', token.type)
            setValue(
              (fieldNamePrefix + 'denomOrAddress') as 'denomOrAddress',
              token.denomOrAddress
            )
          }}
          readOnly={!isCreating}
          selectedToken={selectedToken?.token}
          tokens={
            tokens.loading
              ? tokens
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

      <div className="flex flex-col gap-2 max-w-prose">
        <InputLabel name={t('form.distributionRate')} primary />
        <MarkdownRenderer
          className="body-text text-text-secondary text-sm -mt-1"
          markdown={t('form.rewardDistributionRateDescription')}
        />
        <SegmentedControls<boolean>
          disabled={!isCreating}
          onSelect={(value) =>
            setValue((fieldNamePrefix + 'immediate') as 'immediate', value)
          }
          selected={immediate}
          tabs={[
            {
              label: t('form.recurring'),
              value: false,
            },
            {
              label: t('title.immediate'),
              value: true,
            },
          ]}
        />

        {!immediate && (
          <div className="bg-background-tertiary flex flex-wrap flex-row gap-x-4 gap-y-2 px-4 py-3 rounded-md max-w-prose">
            <NumericInput
              containerClassName="grow"
              disabled={!isCreating}
              error={errors?.rate?.amount}
              fieldName={(fieldNamePrefix + 'rate.amount') as 'rate.amount'}
              getValues={getValues}
              min={HugeDecimal.one.toHumanReadableNumber(decimals)}
              register={register}
              setValue={setValue}
              step={HugeDecimal.one.toHumanReadableNumber(decimals)}
              unit={
                selectedToken
                  ? '$' + selectedToken?.token.symbol
                  : t('info.tokens')
              }
              validation={[validateRequired, validatePositive]}
            />

            <div className="flex flex-row grow gap-4 justify-between items-center">
              <p className="primary-text">{t('info.every')}</p>

              <div className="flex grow flex-row gap-2">
                <div className="flex flex-col gap-1 grow">
                  <NumericInput
                    disabled={!isCreating}
                    error={errors?.rate?.duration?.value}
                    fieldName={
                      (fieldNamePrefix +
                        'rate.duration.value') as 'rate.duration.value'
                    }
                    getValues={getValues}
                    min={1}
                    numericValue
                    register={register}
                    setValue={setValue}
                    sizing="none"
                    step={1}
                    validation={[validatePositive, validateRequired]}
                  />
                  <InputErrorMessage error={errors?.rate?.duration?.value} />
                </div>

                <SelectInput
                  containerClassName="shrink-0"
                  disabled={!isCreating}
                  fieldName={
                    (fieldNamePrefix +
                      'rate.duration.units') as 'rate.duration.units'
                  }
                  register={register}
                >
                  {DurationUnitsValues.map((type, idx) => (
                    <option key={idx} value={type}>
                      {t(`unit.${type}`, {
                        count: rateDuration?.value,
                      }).toLocaleLowerCase()}
                    </option>
                  ))}
                </SelectInput>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 max-w-prose">
        <InputLabel name={t('form.initialFunds')} primary />
        <p className="body-text text-text-secondary max-w-prose -mt-1">
          {t('info.initialRewardsFundsDescription')}
        </p>

        <NumericInput
          containerClassName={!isCreating ? 'self-start' : undefined}
          disabled={!isCreating}
          error={errors?.initialFunds}
          fieldName={(fieldNamePrefix + 'initialFunds') as 'initialFunds'}
          getValues={getValues}
          min={0}
          register={register}
          setValue={setValue}
          step={HugeDecimal.one.toHumanReadableNumber(decimals)}
          unit={
            selectedToken ? '$' + selectedToken?.token.symbol : t('info.tokens')
          }
          validation={[validateRequired, validateNonNegative]}
        />
        <InputErrorMessage error={errors?.initialFunds} />
        <InputErrorMessage error={warning} warning />
      </div>

      {selectedToken && isCreating && (
        <div className="flex flex-row justify-between flex-wrap items-center -mt-2 mb-2 gap-x-8 gap-y-2 max-w-prose">
          <div className="flex flex-row items-center gap-2">
            <p className="caption-text">{t('info.yourBalance')}:</p>

            <TokenAmountDisplay
              amount={selectedBalance}
              decimals={decimals}
              iconUrl={selectedToken.token.imageUrl}
              onClick={() =>
                setValue(
                  (fieldNamePrefix + 'initialFunds') as 'initialFunds',
                  selectedBalance.toHumanReadableString(decimals)
                )
              }
              showFullAmount
              symbol={selectedToken.token.symbol}
            />
          </div>

          {selectedBalance.isPositive() && (
            <div className="grid grid-cols-5 gap-1">
              {[10, 25, 50, 75, 100].map((percent) => (
                <PercentButton
                  key={percent}
                  amount={HugeDecimal.fromHumanReadable(initialFunds, decimals)}
                  loadingMax={{ loading: false, data: selectedBalance }}
                  percent={percent}
                  setAmount={(amount) =>
                    setValue(
                      (fieldNamePrefix + 'initialFunds') as 'initialFunds',
                      amount.toHumanReadableString(decimals)
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {immediate && !!initialFunds && (
        <StatusCard
          className="self-start"
          content={t('info.rewardsFundsWillBeDistributedImmediately')}
          style="warning"
        />
      )}

      {/* CW20 distributions must have open funding enabled, so disallow changing this if it's not native. */}
      {selectedToken?.token.type === TokenType.Native && (
        <div className="flex flex-col gap-2 items-start">
          <InputLabel name={t('form.openFunding')} primary />
          <p className="body-text text-text-secondary max-w-prose -mt-1">
            {t('info.openFundingDescription')}
          </p>

          <SwitchCard
            enabled={openFunding}
            onClick={() =>
              setValue(
                (fieldNamePrefix + 'openFunding') as 'openFunding',
                !openFunding
              )
            }
            readOnly={!isCreating}
            sizing="md"
          />
        </div>
      )}
    </>
  )
}
