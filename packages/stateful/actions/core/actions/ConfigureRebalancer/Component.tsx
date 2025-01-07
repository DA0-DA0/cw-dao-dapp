import { Close, InfoOutlined } from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentType, useEffect, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  ErrorPage,
  FormCheckbox,
  IconButton,
  InputErrorMessage,
  InputLabel,
  Loader,
  MarkdownRenderer,
  NativeCoinSelector,
  NumericInput,
  RebalancerProjector,
  RebalancerProjectorAsset,
  SegmentedControls,
  SelectInput,
  SwitchCard,
  TokenInput,
  Tooltip,
  useSupportedChainContext,
} from '@dao-dao/stateless'
import {
  AddressInputProps,
  GenericToken,
  GenericTokenBalance,
  GenericTokenWithUsdPrice,
  LoadingData,
  LoadingDataWithError,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { TargetOverrideStrategy } from '@dao-dao/types/contracts/ValenceRebalancer'
import {
  formatPercentOf100,
  getNativeTokenForChainId,
  makeValidateAddress,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

export type PidPreset = 'slow' | 'medium' | 'fast'
export const pidPresets: {
  preset: PidPreset
  kp: number
  ki: number
  kd: number
}[] = [
  {
    preset: 'slow',
    kp: 0.05,
    ki: 0,
    kd: 0,
  },
  {
    preset: 'medium',
    kp: 0.1,
    ki: 0,
    kd: 0,
  },
  {
    preset: 'fast',
    kp: 0.2,
    ki: 0,
    kd: 0,
  },
]

export type ConfigureRebalancerData = {
  chainId: string
  newValenceAccount: {
    creating: boolean
    funds: {
      denom: string
      amount: string
      // Will multiply `amount` by 10^decimals when generating the message.
      decimals: number
    }[]
    acknowledgedServiceFee?: boolean
  }
  trustee?: string
  baseDenom: string
  tokens: {
    denom: string
    percent: number
  }[]
  pid: {
    kp: number
    ki: number
    kd: number
  }
  /**
   * Set to true if the advanced field is chosen in the PID preset dropdown.
   */
  showCustomPid?: boolean
  maxLimit?: number
  minBalance?: {
    denom: string
    amount: string
  }
  targetOverrideStrategy: TargetOverrideStrategy
}

export type ConfigureRebalancerOptions = {
  nativeBalances: LoadingData<GenericTokenBalance[]>
  serviceFee: LoadingDataWithError<GenericTokenBalance | null>
  currentValenceBalances: LoadingData<GenericTokenBalance[]>
  baseDenomWhitelistTokens: LoadingData<GenericToken[]>
  denomWhitelistTokens: LoadingData<GenericToken[]>
  prices: LoadingDataWithError<GenericTokenWithUsdPrice[]>
  minBalanceToken: GenericToken | undefined
  AddressInput: ComponentType<AddressInputProps<ConfigureRebalancerData>>
}

export const ConfigureRebalancerComponent: ActionComponent<
  ConfigureRebalancerOptions
> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: {
    nativeBalances,
    serviceFee,
    currentValenceBalances,
    baseDenomWhitelistTokens,
    denomWhitelistTokens,
    prices,
    minBalanceToken,
    AddressInput,
  },
}) => {
  const { t } = useTranslation()
  const {
    chain: { bech32Prefix },
  } = useSupportedChainContext()

  const {
    control,
    watch,
    register,
    setValue,
    getValues,
    clearErrors,
    setError,
  } = useFormContext<ConfigureRebalancerData>()

  const {
    fields: tokensFields,
    append: appendToken,
    remove: removeToken,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix + 'tokens') as 'tokens',
  })

  const {
    fields: newValenceAccountFunds,
    append: appendNewValenceAccountFund,
    remove: removeNewValenceAccountFund,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix +
      'newValenceAccount.funds') as 'newValenceAccount.funds',
  })

  const chainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const baseDenom = watch((fieldNamePrefix + 'baseDenom') as 'baseDenom')
  const targetOverrideStrategy = watch(
    (fieldNamePrefix + 'targetOverrideStrategy') as 'targetOverrideStrategy'
  )
  const pid = watch((fieldNamePrefix + 'pid') as 'pid')
  const tokens = watch((fieldNamePrefix + 'tokens') as 'tokens', [])
  const totalPercent = tokens.reduce((acc, { percent }) => acc + percent, 0)
  const showCustomPid = watch(
    (fieldNamePrefix + 'showCustomPid') as 'showCustomPid'
  )
  const creatingNewValenceAccount = !!watch(
    (fieldNamePrefix +
      'newValenceAccount.creating') as 'newValenceAccount.creating'
  )

  // Get selected whitelist tokens.
  const denomWhitelistTokensSelected = denomWhitelistTokens.loading
    ? []
    : denomWhitelistTokens.data.filter((token) =>
        tokens.some(({ denom }) => token.denomOrAddress === denom)
      )
  const denomWhitelistTokensRemaining = denomWhitelistTokens.loading
    ? []
    : denomWhitelistTokens.data.filter(
        (token) => !tokens.some(({ denom }) => token.denomOrAddress === denom)
      )

  const maxLimit = watch((fieldNamePrefix + 'maxLimit') as 'maxLimit')
  const maxLimitEnabled = maxLimit !== undefined

  const minBalance = watch((fieldNamePrefix + 'minBalance') as 'minBalance')
  const minBalanceEnabled = minBalance !== undefined

  // Validate all add up to 100%.
  useEffect(() => {
    if (totalPercent === 100) {
      clearErrors((fieldNamePrefix + 'tokens') as 'tokens')
    } else {
      setError((fieldNamePrefix + 'tokens') as 'tokens', {
        type: 'manual',
        message: t('error.percentageDoesNotSumTo100', {
          totalPercent: formatPercentOf100(totalPercent),
        }),
      })
    }
  }, [t, clearErrors, setError, totalPercent, fieldNamePrefix])

  const [projection, setProjection] = useState(isCreating)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Once per day for the next 180 days.
  const rebalanceTimestamps = new Array(180)
    .fill(0)
    .map((_, i) => new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000))

  const selectedPidPreset = pidPresets.find(
    (preset) =>
      preset.kp === pid.kp && preset.ki === pid.ki && preset.kd === pid.kd
  )?.preset

  const acknowledgedServiceFee = watch(
    (fieldNamePrefix +
      'newValenceAccount.acknowledgedServiceFee') as 'newValenceAccount.acknowledgedServiceFee'
  )

  useEffect(() => {
    if (!isCreating) {
      return
    }

    if (acknowledgedServiceFee) {
      if (errors?.newValenceAccount?.acknowledgedServiceFee) {
        clearErrors(
          (fieldNamePrefix +
            'newValenceAccount.acknowledgedServiceFee') as 'newValenceAccount.acknowledgedServiceFee'
        )
      }
    } else {
      if (!errors?.newValenceAccount?.acknowledgedServiceFee) {
        setError(
          (fieldNamePrefix +
            'newValenceAccount.acknowledgedServiceFee') as 'newValenceAccount.acknowledgedServiceFee',
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
    errors?.newValenceAccount?.acknowledgedServiceFee,
  ])

  return (
    <>
      {creatingNewValenceAccount && (
        <div className="flex flex-col gap-2 mb-2">
          <InputLabel name={t('form.initialBalances')} primary />

          {newValenceAccountFunds.map(({ id }, index) => (
            <NativeCoinSelector
              key={id + index}
              chainId={chainId}
              errors={errors?.newValenceAccount?.funds?.[index]}
              fieldNamePrefix={
                fieldNamePrefix + `newValenceAccount.funds.${index}.`
              }
              isCreating={isCreating}
              onRemove={
                // Don't allow removing the first token.
                isCreating && newValenceAccountFunds.length > 1
                  ? () => removeNewValenceAccountFund(index)
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

          {!isCreating && newValenceAccountFunds.length === 0 && (
            <p className="-mt-1 text-xs italic text-text-tertiary">
              {t('info.none')}
            </p>
          )}

          {isCreating && (
            <>
              <Button
                className="self-start"
                onClick={() =>
                  appendNewValenceAccountFund({
                    amount: '1',
                    denom: getNativeTokenForChainId(chainId).denomOrAddress,
                    decimals: getNativeTokenForChainId(chainId).decimals,
                  })
                }
                variant="secondary"
              >
                {t('button.addToken')}
              </Button>
            </>
          )}

          <div
            className={clsx(
              'flex flex-row gap-2 items-center',
              isCreating ? 'mt-4' : 'mt-2'
            )}
          >
            <FormCheckbox
              fieldName={
                (fieldNamePrefix +
                  'newValenceAccount.acknowledgedServiceFee') as 'newValenceAccount.acknowledgedServiceFee'
              }
              readOnly={!isCreating}
              setValue={setValue}
              size="sm"
              value={acknowledgedServiceFee}
            />

            <p
              className="body-text cursor-pointer"
              onClick={() =>
                setValue(
                  (fieldNamePrefix +
                    'newValenceAccount.acknowledgedServiceFee') as 'newValenceAccount.acknowledgedServiceFee',
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

          <InputErrorMessage
            error={errors?.newValenceAccount?.acknowledgedServiceFee}
          />
        </div>
      )}

      <div className="flex max-w-prose flex-col gap-5">
        <div className="flex flex-col gap-2">
          <InputLabel name={t('form.baseToken')} primary />
          <p className="body-text text-text-secondary -mt-1 text-sm">
            {t('form.rebalancerBaseTokenDescription')}
          </p>

          <TokenInput
            containerClassName="self-start"
            onSelectToken={({ denomOrAddress }) =>
              setValue(
                (fieldNamePrefix + 'baseDenom') as 'baseDenom',
                denomOrAddress
              )
            }
            readOnly={!isCreating}
            selectedToken={
              baseDenomWhitelistTokens.loading
                ? undefined
                : baseDenomWhitelistTokens.data.find(
                    ({ denomOrAddress }) => denomOrAddress === baseDenom
                  )
            }
            tokens={baseDenomWhitelistTokens}
          />
        </div>

        <div className="flex flex-col gap-2">
          <InputLabel name={t('form.tokenTargets')} primary />

          {tokensFields.map(({ id }, index) => (
            <div key={id}>
              <div className="flex flex-row items-stretch gap-2">
                <TokenInput
                  amount={{
                    watch,
                    setValue,
                    getValues,
                    register,
                    fieldName: (fieldNamePrefix +
                      `tokens.${index}.percent`) as `tokens.${number}.percent`,
                    error: errors?.tokens?.[index]?.percent,
                    numericValue: true,
                    min: 0.01,
                    max: 100,
                    step: 0.01,
                    unit: '%',
                  }}
                  hideTokens={denomWhitelistTokensSelected.filter(
                    (selected) =>
                      // Still show this selected token.
                      selected.denomOrAddress !== tokens[index]?.denom
                  )}
                  onSelectToken={({ denomOrAddress }) =>
                    setValue(
                      (fieldNamePrefix +
                        `tokens.${index}.denom`) as `tokens.${number}.denom`,
                      denomOrAddress
                    )
                  }
                  readOnly={!isCreating}
                  selectedToken={
                    denomWhitelistTokens.loading
                      ? undefined
                      : denomWhitelistTokens.data.find(
                          ({ denomOrAddress }) =>
                            denomOrAddress === tokens[index]?.denom
                        )
                  }
                  tokens={denomWhitelistTokens}
                />

                {isCreating && (
                  <IconButton
                    Icon={Close}
                    className="self-center"
                    onClick={() => removeToken(index)}
                    size="sm"
                    variant="ghost"
                  />
                )}
              </div>

              <InputErrorMessage
                error={
                  errors?.tokens?.[index]?.percent ||
                  errors?.tokens?.[index]?.denom
                }
              />
            </div>
          ))}

          <InputErrorMessage error={errors?.tokens} />

          {isCreating ? (
            <Tooltip
              title={
                !denomWhitelistTokens.loading &&
                denomWhitelistTokensRemaining.length === 0
                  ? t('info.allSupportedTokensAdded')
                  : undefined
              }
            >
              <Button
                className="mt-1 self-start"
                disabled={denomWhitelistTokensRemaining.length === 0}
                loading={denomWhitelistTokens.loading}
                onClick={() =>
                  appendToken({
                    percent: 25,
                    denom:
                      denomWhitelistTokensRemaining[0]?.denomOrAddress || '',
                  })
                }
                variant="secondary"
              >
                {t('button.addToken')}
              </Button>
            </Tooltip>
          ) : (
            tokensFields.length === 0 && (
              <p className="text-text-tertiary mt-1 mb-2 text-xs italic">
                {t('info.none')}
              </p>
            )
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-row flex-wrap justify-between gap-x-4 gap-y-2">
            <InputLabel name={t('form.minBalance')} primary />

            <SwitchCard
              enabled={minBalanceEnabled}
              onClick={() =>
                setValue(
                  (fieldNamePrefix + 'minBalance') as 'minBalance',
                  minBalanceEnabled
                    ? undefined
                    : {
                        denom: tokens[0]?.denom ?? '',
                        amount: '1',
                      }
                )
              }
              readOnly={!isCreating}
              sizing="sm"
            />
          </div>

          <p className="body-text text-text-secondary -mt-1 text-sm">
            {t('form.rebalancerMinBalanceDescription')}
          </p>

          {minBalanceEnabled && (
            <TokenInput
              amount={{
                watch,
                setValue,
                getValues,
                register,
                fieldName: (fieldNamePrefix +
                  'minBalance.amount') as 'minBalance.amount',
                error: errors?.minBalance?.amount,
                min: HugeDecimal.one.toHumanReadableNumber(
                  minBalanceToken?.decimals ?? 0
                ),
                step: HugeDecimal.one.toHumanReadableNumber(
                  minBalanceToken?.decimals ?? 0
                ),
              }}
              onSelectToken={({ denomOrAddress }) =>
                setValue(
                  (fieldNamePrefix + 'minBalance.denom') as 'minBalance.denom',
                  denomOrAddress
                )
              }
              readOnly={!isCreating}
              selectedToken={
                minBalance &&
                denomWhitelistTokensSelected.find(
                  ({ denomOrAddress }) => denomOrAddress === minBalance.denom
                )
              }
              tokens={
                denomWhitelistTokens.loading
                  ? { loading: true }
                  : {
                      loading: false,
                      data: denomWhitelistTokensSelected,
                    }
              }
            />
          )}
        </div>

        <div className="flex flex-col">
          <InputLabel name={t('form.speed')} primary />

          <MarkdownRenderer
            className="body-text text-text-secondary mt-1 text-sm"
            markdown={t('form.rebalancerSpeedDescription')}
          />

          <SelectInput
            containerClassName="self-start mt-4"
            disabled={!isCreating}
            onChange={(preset) => {
              const pid = pidPresets.find((p) => p.preset === preset)
              if (pid) {
                setValue((fieldNamePrefix + 'pid.kp') as 'pid.kp', pid.kp)
                setValue((fieldNamePrefix + 'pid.ki') as 'pid.ki', pid.ki)
                setValue((fieldNamePrefix + 'pid.kd') as 'pid.kd', pid.kd)
              }
              // Show custom fields if selected advanced.
              setValue(
                (fieldNamePrefix + 'showCustomPid') as 'showCustomPid',
                !pid
              )
            }}
          >
            <option
              selected={!showCustomPid && selectedPidPreset === 'slow'}
              value="slow"
            >
              {t('form.slow')} {'(5%)'}
            </option>
            <option
              selected={!showCustomPid && selectedPidPreset === 'medium'}
              value="medium"
            >
              {t('form.medium')} {'(10%)'}
            </option>
            <option
              selected={!showCustomPid && selectedPidPreset === 'fast'}
              value="fast"
            >
              {t('form.fast')} {'(20%)'}
            </option>
            <option selected={showCustomPid} value="advanced">
              {t('form.advanced')}
            </option>
          </SelectInput>
        </div>

        {/* Custom PID */}
        {showCustomPid && (
          <>
            <p className="body-text text-text-secondary -mt-2 text-sm">
              {t('form.rebalancerSpeedAdvancedDescription')}
            </p>

            <div className="flex flex-row flex-wrap gap-2">
              <div className="space-y-2">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <InputLabel name="P" />
                <NumericInput
                  error={errors?.pid?.kp}
                  fieldName={(fieldNamePrefix + 'pid.kp') as 'pid.kp'}
                  hidePlusMinus
                  max={1}
                  min={0}
                  numericValue
                  register={register}
                  sizing="sm"
                  step={0.01}
                  validation={[validateRequired]}
                />
                <InputErrorMessage error={errors?.pid?.kp} />
              </div>

              <div className="space-y-2">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <InputLabel name="I" />
                <NumericInput
                  error={errors?.pid?.ki}
                  fieldName={(fieldNamePrefix + 'pid.ki') as 'pid.ki'}
                  hidePlusMinus
                  max={1}
                  min={0}
                  numericValue
                  register={register}
                  sizing="sm"
                  step={0.01}
                  validation={[validateRequired]}
                />
                <InputErrorMessage error={errors?.pid?.ki} />
              </div>

              <div className="space-y-2">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <InputLabel name="D" />
                <NumericInput
                  error={errors?.pid?.kd}
                  fieldName={(fieldNamePrefix + 'pid.kd') as 'pid.kd'}
                  hidePlusMinus
                  max={1}
                  min={0}
                  numericValue
                  register={register}
                  sizing="sm"
                  step={0.01}
                  validation={[validateRequired]}
                />
                <InputErrorMessage error={errors?.pid?.kd} />
              </div>
            </div>
          </>
        )}

        <SwitchCard
          containerClassName="self-start mt-2"
          enabled={showAdvanced}
          label={t('title.advancedConfiguration')}
          onClick={() => setShowAdvanced((s) => !s)}
          sizing="sm"
        />

        {showAdvanced && (
          <div className="-mt-3 flex flex-col gap-5 p-5 bg-background-tertiary rounded-md animate-fade-in">
            <div className="flex flex-col gap-2">
              <InputLabel name={t('form.trustee')} optional primary />
              <p className="body-text text-text-secondary -mt-1 text-sm">
                {t('form.rebalancerTrusteeDescription')}
              </p>

              <AddressInput
                disabled={!isCreating}
                error={errors?.trustee}
                fieldName={(fieldNamePrefix + 'trustee') as 'trustee'}
                register={register}
                validation={[makeValidateAddress(bech32Prefix, false)]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <InputLabel name={t('form.targetOverrideStrategy')} primary />
              <MarkdownRenderer
                className="body-text text-text-secondary -mt-1 text-sm"
                markdown={t('form.targetOverrideStrategyDescription')}
              />

              <SegmentedControls<'proportional' | 'priority'>
                disabled={!isCreating}
                onSelect={(value) =>
                  setValue(
                    (fieldNamePrefix +
                      'targetOverrideStrategy') as 'targetOverrideStrategy',
                    value
                  )
                }
                selected={targetOverrideStrategy}
                tabs={[
                  {
                    label: t('form.proportional'),
                    value: 'proportional',
                  },
                  {
                    label: t('form.priority'),
                    value: 'priority',
                  },
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-row flex-wrap justify-between gap-x-4 gap-y-2">
                <InputLabel name={t('form.maximumSellablePerCycle')} primary />

                <SwitchCard
                  enabled={maxLimitEnabled}
                  onClick={() =>
                    setValue(
                      (fieldNamePrefix + 'maxLimit') as 'maxLimit',
                      maxLimitEnabled ? undefined : 5
                    )
                  }
                  readOnly={!isCreating}
                  sizing="sm"
                />
              </div>

              <p className="body-text text-text-secondary -mt-1 text-sm">
                {t('form.maximumSellablePerCycleDescription')}
              </p>

              {maxLimitEnabled && (
                <div className="flex flex-row gap-2 self-start">
                  <NumericInput
                    containerClassName="grow min-w-[min(8rem,50%)]"
                    error={errors?.maxLimit}
                    fieldName={(fieldNamePrefix + 'maxLimit') as 'maxLimit'}
                    getValues={getValues}
                    max={100}
                    min={0.01}
                    numericValue
                    register={register}
                    setValue={setValue}
                    sizing="md"
                    step={0.01}
                    unit="%"
                    validation={[validateRequired, validatePositive]}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-border-secondary my-2 h-[1px] -mx-6"></div>

      <SwitchCard
        containerClassName="self-start"
        enabled={projection}
        label={t('form.projection')}
        onClick={() => setProjection((p) => !p)}
        sizing="sm"
      />

      {projection && (
        <>
          <div className="flex flex-row gap-1 items-start -mt-2 max-w-prose">
            <InfoOutlined className="!text-icon-secondary !h-4 !w-4" />
            <p className="secondary-text">
              {t('info.rebalancerProjectionExplanation')}
            </p>
          </div>

          {currentValenceBalances.loading ||
          prices.loading ||
          denomWhitelistTokens.loading ? (
            <Loader />
          ) : prices.errored ? (
            <ErrorPage error={prices.error} />
          ) : (
            <RebalancerProjector
              assets={tokens.flatMap(
                ({ denom, percent }): RebalancerProjectorAsset | [] => {
                  const token = denomWhitelistTokens.data.find(
                    ({ denomOrAddress }) => denomOrAddress === denom
                  )
                  const { balance: _balance } =
                    currentValenceBalances.data.find(
                      ({ token }) => token.denomOrAddress === denom
                    ) ?? {}
                  const balance = HugeDecimal.from(_balance || 0)
                  const price = prices.data.find(
                    ({ token: { denomOrAddress: priceDenom } }) =>
                      priceDenom === denom
                  )?.usdPrice

                  if (!token || price === undefined) {
                    return []
                  }

                  return {
                    symbol: token.symbol,
                    initialAmount: balance.toHumanReadableNumber(
                      token.decimals
                    ),
                    targetProportion: percent / 100,
                    // Add an extra price to account for the initial balance.
                    prices: new Array(rebalanceTimestamps.length + 1)
                      .fill(0)
                      .map(() => price),
                  }
                }
              )}
              className="!h-72"
              pid={{
                ...pid,
                interval: 1,
              }}
              rebalanceTimestamps={rebalanceTimestamps}
            />
          )}
        </>
      )}
    </>
  )
}
