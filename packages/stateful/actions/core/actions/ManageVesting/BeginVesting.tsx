import {
  Add,
  ArrowRightAltRounded,
  Close,
  SubdirectoryArrowRightRounded,
  WarningRounded,
} from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentType, useCallback, useEffect } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  ChainProvider,
  CopyToClipboard,
  DateTimePicker,
  DateTimePickerNoForm,
  IconButton,
  InputErrorMessage,
  InputLabel,
  NumericInput,
  RadioInput,
  RadioInputOption,
  SelectInput,
  StatusCard,
  TextAreaInput,
  TextInput,
  TokenInput,
  VestingStepsLineGraph,
  useActionOptions,
  useInitializedActionForKey,
} from '@dao-dao/stateless'
import {
  ActionChainContextType,
  ActionComponent,
  ActionKey,
  AddressInputProps,
  CreateCw1Whitelist,
  DurationUnits,
  DurationUnitsValuesTimeOnly,
  DurationWithUnits,
  GenericTokenBalanceWithOwner,
  LoadingDataWithError,
  StatefulEntityDisplayProps,
  TokenType,
  VestingContractVersion,
  VestingPaymentsWidgetData,
  VestingStep,
} from '@dao-dao/types'
import {
  convertDurationWithUnitsToSeconds,
  formatDateTimeTz,
  getChainAddressForActionOptions,
  getChainForChainId,
  getDisplayNameForChainId,
  getSupportedChainConfig,
  makeValidateAddress,
  validateNonNegative,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

export type BeginVestingData = {
  chainId: string
  amount: string
  type: TokenType
  denomOrAddress: string
  recipient: string
  title: string
  description?: string
  startDate: string
  ownerMode: 'none' | 'me' | 'other' | 'many'
  // If ownerMode === 'other', the address of the owner.
  otherOwner: string
  // If ownerMode === 'many', the list of addresses of the owners.
  manyOwners: {
    address: string
  }[]
  // This will be the cw1-whitelist contract once the many owners list is
  // finalized.
  manyOwnersCw1WhitelistContract: string
  steps: {
    // Additional percent unlocked after the delay.
    percent: number
    delay: DurationWithUnits
  }[]
}

export type BeginVestingOptions = {
  // If undefined, no widget is setup, and begin vesting should be disabled.
  widgetData: VestingPaymentsWidgetData | undefined
  tokens: GenericTokenBalanceWithOwner[]
  // The vesting contract factory owner. If null, no owner is set. This is
  // only used for pre-v1 vesting widgets.
  preV1VestingFactoryOwner: LoadingDataWithError<string | null>
  AddressInput: ComponentType<AddressInputProps<BeginVestingData>>
  EntityDisplay: ComponentType<StatefulEntityDisplayProps>
  createCw1WhitelistOwners: CreateCw1Whitelist
  creatingCw1WhitelistOwners: boolean
}

export const BeginVesting: ActionComponent<BeginVestingOptions> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  addAction,
  remove,
  index: actionIndex,
  allActionsWithData,
  options: {
    widgetData,
    tokens,
    preV1VestingFactoryOwner,
    AddressInput,
    EntityDisplay,
    createCw1WhitelistOwners,
    creatingCw1WhitelistOwners,
  },
}) => {
  const { t } = useTranslation()

  const actionOptions = useActionOptions()
  const {
    context,
    chainContext,
    chain: { chainId: nativeChainId },
  } = actionOptions

  if (chainContext.type !== ActionChainContextType.Supported) {
    throw new Error('Unsupported chain context')
  }

  const {
    control,
    register,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
  } = useFormContext<BeginVestingData>()
  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix + 'steps') as 'steps',
  })

  const chainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const watchAmount = watch((fieldNamePrefix + 'amount') as 'amount')
  const watchDenomOrAddress = watch(
    (fieldNamePrefix + 'denomOrAddress') as 'denomOrAddress'
  )
  const parsedStartDate = Date.parse(
    watch((fieldNamePrefix + 'startDate') as 'startDate')
  )
  const description = watch((fieldNamePrefix + 'description') as 'description')

  const ownerMode = watch((fieldNamePrefix + 'ownerMode') as 'ownerMode')
  const manyOwnersCw1WhitelistContract = watch(
    (fieldNamePrefix +
      'manyOwnersCw1WhitelistContract') as 'manyOwnersCw1WhitelistContract'
  )
  const manyOwners = watch((fieldNamePrefix + 'manyOwners') as 'manyOwners')
  const {
    fields: manyOwnerFields,
    append: appendManyOwner,
    remove: removeManyOwner,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix + 'manyOwners') as 'manyOwners',
  })

  const onCreateCw1WhitelistOwners = useCallback(async () => {
    const contractAddress = await createCw1WhitelistOwners(
      manyOwners.map(({ address }) => address)
    )

    // Address is valid on success and undefined on error. Errors are handled
    // automatically, so we can just do nothing here.
    if (contractAddress) {
      setValue(
        (fieldNamePrefix +
          'manyOwnersCw1WhitelistContract') as 'manyOwnersCw1WhitelistContract',
        contractAddress
      )

      toast.success(t('success.saved'))
    }
  }, [createCw1WhitelistOwners, fieldNamePrefix, setValue, t, manyOwners])

  const startDate = !isNaN(parsedStartDate)
    ? new Date(parsedStartDate)
    : undefined

  const steps = watch((fieldNamePrefix + 'steps') as 'steps')
  const stepPoints =
    startDate &&
    steps.reduce((acc, { percent, delay }, index): VestingStep[] => {
      const delayMs = delay.value
        ? convertDurationWithUnitsToSeconds(delay) * 1000
        : 0

      const lastMs =
        index === 0 ? startDate.getTime() : acc[acc.length - 1].timestamp
      const lastAmount =
        index === 0 ? HugeDecimal.zero : acc[acc.length - 1].amount

      return [
        ...acc,
        {
          timestamp: lastMs + delayMs,
          amount: lastAmount.plus(
            HugeDecimal.from(watchAmount).times(percent).div(100)
          ),
        },
      ]
    }, [] as VestingStep[])

  const totalStepPercent = steps.reduce((acc, { percent }) => acc + percent, 0)
  useEffect(() => {
    if (!isCreating) {
      return
    }

    if (totalStepPercent === 100) {
      clearErrors((fieldNamePrefix + 'steps') as 'steps')
    } else {
      setError((fieldNamePrefix + 'steps') as 'steps', {
        type: 'manual',
        message: t('error.stepPercentsMustSumTo100'),
      })
    }
  }, [clearErrors, fieldNamePrefix, isCreating, setError, t, totalStepPercent])

  const finishDate = stepPoints?.length
    ? new Date(stepPoints[stepPoints.length - 1].timestamp)
    : undefined

  const selectedToken = tokens.find(
    ({ token: { denomOrAddress } }) => denomOrAddress === watchDenomOrAddress
  )
  const selectedDecimals = selectedToken?.token.decimals ?? 0
  const selectedBalance = HugeDecimal.from(selectedToken?.balance ?? 0)
  const selectedSymbol = selectedToken?.token?.symbol ?? t('info.tokens')

  const configureVestingPaymentAction = useInitializedActionForKey(
    ActionKey.ConfigureVestingPayments
  )

  // If widget not set up, don't render anything because begin vesting cannot be
  // used.
  if (!widgetData) {
    return null
  }

  const { bech32Prefix } = getChainForChainId(chainId)
  const chainAddressOwner = getChainAddressForActionOptions(
    actionOptions,
    chainId
  )

  const vestingManagerExists =
    !!widgetData.factories?.[chainId] ||
    // Old single-chain factory support.
    (chainId === nativeChainId && !!widgetData.factory)
  const vestingManagerVersion = widgetData.factories
    ? widgetData.factories[chainId]?.version
    : // Old single-chain factory support.
      chainId === nativeChainId && !!widgetData.factory
      ? widgetData.version
      : undefined

  const crossChainAccountActionExists = allActionsWithData.some(
    (action) => action.actionKey === ActionKey.ConfigureVestingPayments
  )

  // A DAO can create a vesting payment factory on the current chain and any
  // polytone connection that is also a supported chain (since the vesting
  // factory+contract only exists on supported chains).
  const possibleChainIds = [
    nativeChainId,
    ...Object.keys(chainContext.config.polytone || {}).filter((chainId) =>
      getSupportedChainConfig(chainId)
    ),
  ]

  // A warning if the amount is too high. We don't want to make this an error
  // because often people want to spend funds that a previous action makes
  // available, so just show a warning.
  const insufficientFundsWarning = selectedBalance
    .toHumanReadable(selectedDecimals)
    .lt(watchAmount)
    ? t('error.insufficientFundsWarning', {
        amount: selectedBalance.toInternationalizedHumanReadableString({
          decimals: selectedDecimals,
        }),
        tokenSymbol:
          selectedToken?.token.symbol ?? t('info.token').toLocaleUpperCase(),
      })
    : undefined

  return (
    <ChainProvider chainId={chainId}>
      <div className="flex flex-col gap-4">
        {isCreating &&
          !vestingManagerExists &&
          !configureVestingPaymentAction.loading &&
          !configureVestingPaymentAction.errored && (
            <StatusCard
              className="max-w-lg"
              content={t('info.vestingManagerNeeded', {
                chain: getDisplayNameForChainId(chainId),
              })}
              style="warning"
            >
              <Button
                disabled={crossChainAccountActionExists}
                onClick={() => {
                  remove()
                  addAction(
                    {
                      actionKey: ActionKey.ConfigureVestingPayments,
                      data: configureVestingPaymentAction.data.defaults,
                    },
                    actionIndex
                  )
                }}
                variant="primary"
              >
                {crossChainAccountActionExists
                  ? t('button.vestingManagerSetupActionAdded')
                  : t('button.addVestingManagerSetupAction')}
              </Button>
            </StatusCard>
          )}

        <div className="space-y-2">
          <InputLabel name={t('form.title')} />
          <TextInput
            disabled={!isCreating}
            error={errors?.title}
            fieldName={(fieldNamePrefix + 'title') as 'title'}
            register={register}
            required
          />
          <InputErrorMessage error={errors?.title} />
        </div>

        {(isCreating || !!description) && (
          <div className="space-y-2">
            <InputLabel name={t('form.descriptionOptional')} />
            <TextAreaInput
              disabled={!isCreating}
              error={errors?.description}
              fieldName={(fieldNamePrefix + 'description') as 'description'}
              register={register}
            />
            <InputErrorMessage error={errors?.description} />
          </div>
        )}

        <div className="space-y-2">
          <InputLabel name={t('form.payment')} />

          <div className="flex min-w-0 flex-col flex-wrap gap-x-3 gap-y-2 sm:flex-row sm:items-stretch">
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
              onSelectToken={({ chainId, type, denomOrAddress }) => {
                setValue((fieldNamePrefix + 'chainId') as 'chainId', chainId)
                setValue((fieldNamePrefix + 'type') as 'type', type)
                setValue(
                  (fieldNamePrefix + 'denomOrAddress') as 'denomOrAddress',
                  denomOrAddress
                )
              }}
              readOnly={!isCreating}
              selectedToken={selectedToken?.token}
              showChainImage
              tokens={{
                loading: false,
                data: tokens
                  .filter(({ token: { chainId } }) =>
                    possibleChainIds.includes(chainId)
                  )
                  .map(({ balance, token }) => ({
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
              }}
            />

            <div className="flex min-w-0 grow flex-row items-stretch gap-2 sm:gap-3">
              <div className="flex flex-row items-center pl-1 sm:pl-0">
                <ArrowRightAltRounded className="!hidden !h-6 !w-6 text-text-secondary sm:!block" />
                <SubdirectoryArrowRightRounded className="!h-4 !w-4 text-text-secondary sm:!hidden" />
              </div>

              <AddressInput
                containerClassName="grow"
                disabled={!isCreating}
                error={errors?.recipient}
                fieldName={(fieldNamePrefix + 'recipient') as 'recipient'}
                register={register}
                validation={[
                  validateRequired,
                  makeValidateAddress(bech32Prefix),
                ]}
              />
            </div>
          </div>

          {(errors?.amount ||
            errors?.denomOrAddress ||
            errors?.recipient ||
            insufficientFundsWarning) && (
            <div className="space-y-1">
              <InputErrorMessage error={errors?.amount} />
              <InputErrorMessage error={errors?.denomOrAddress} />
              <InputErrorMessage error={errors?.recipient} />
              <InputErrorMessage error={insufficientFundsWarning} warning />
            </div>
          )}
        </div>

        {
          // V1 and later can set the owner.
          !!vestingManagerVersion &&
            vestingManagerVersion >= VestingContractVersion.V1 && (
              <div className="flex flex-col gap-4 rounded-md bg-background-tertiary p-4">
                <InputLabel name={t('form.whoCanCancelPayment')} />

                <RadioInput
                  disabled={!isCreating}
                  fieldName={(fieldNamePrefix + 'ownerMode') as 'ownerMode'}
                  options={(
                    [
                      {
                        label: t('form.noOne'),
                        value: 'none',
                      },
                      {
                        display: (
                          <EntityDisplay address={chainAddressOwner || ''} />
                        ),
                        value: 'me',
                      },
                      {
                        label: t('form.anotherAccount'),
                        value: 'other',
                      },
                      {
                        label: t('form.moreThanOneAccount'),
                        value: 'many',
                      },
                    ] as RadioInputOption<BeginVestingData['ownerMode']>[]
                  )
                    // Only show the selected option once created.
                    .filter(({ value }) => isCreating || value === ownerMode)}
                  setValue={setValue}
                  watch={watch}
                />

                {ownerMode === 'other' && (
                  <AddressInput
                    disabled={!isCreating}
                    error={errors?.otherOwner}
                    fieldName={(fieldNamePrefix + 'otherOwner') as 'otherOwner'}
                    register={register}
                    validation={[
                      validateRequired,
                      makeValidateAddress(bech32Prefix),
                    ]}
                  />
                )}

                {ownerMode === 'many' && (
                  <div className={clsx('flex flex-col', isCreating && 'gap-2')}>
                    {manyOwnerFields.map(({ id }, index) => (
                      <div
                        key={id}
                        className="flex flex-row items-center gap-2"
                      >
                        <AddressInput
                          containerClassName="grow"
                          disabled={
                            !isCreating || !!manyOwnersCw1WhitelistContract
                          }
                          error={errors?.manyOwners?.[index]?.address}
                          fieldName={
                            (fieldNamePrefix +
                              `manyOwners.${index}.address`) as `manyOwners.${number}.address`
                          }
                          register={register}
                          validation={[
                            validateRequired,
                            makeValidateAddress(bech32Prefix),
                          ]}
                        />

                        {isCreating && !manyOwnersCw1WhitelistContract && (
                          <IconButton
                            Icon={Close}
                            disabled={creatingCw1WhitelistOwners}
                            onClick={() => removeManyOwner(index)}
                            size="sm"
                            variant="ghost"
                          />
                        )}
                      </div>
                    ))}

                    <InputErrorMessage
                      className="self-end pr-8"
                      error={errors?.manyOwnersCw1WhitelistContract}
                    />

                    {isCreating && !manyOwnersCw1WhitelistContract && (
                      <div className="flex flex-row justify-end gap-1 pr-8">
                        <Button
                          className="self-start"
                          loading={creatingCw1WhitelistOwners}
                          onClick={onCreateCw1WhitelistOwners}
                          variant="primary"
                        >
                          {t('button.save')}
                        </Button>

                        <Button
                          className="self-start"
                          disabled={creatingCw1WhitelistOwners}
                          onClick={() =>
                            appendManyOwner({
                              address: '',
                            })
                          }
                          variant="secondary"
                        >
                          <Add className="!h-4 !w-4" />
                          {t('button.add')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
        }

        <div className="flex flex-row flex-wrap gap-2">
          {/* Start Date */}
          <div className="flex max-w-xs flex-col gap-2">
            <InputLabel name={t('form.startDate')} />

            <div className="flex flex-col gap-1">
              <DateTimePicker
                control={control}
                disabled={!isCreating}
                error={errors?.startDate}
                fieldName={(fieldNamePrefix + 'startDate') as 'startDate'}
                required
              />
              <InputErrorMessage error={errors?.startDate} />
            </div>
          </div>

          {/* Finish Date, once created */}
          {!isCreating && finishDate && (
            <div className="flex max-w-xs flex-col gap-2">
              <InputLabel name={t('form.finishDate')} />
              <DateTimePickerNoForm disabled value={finishDate} />
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          <InputLabel name={t('form.steps')} primary />

          {stepFields.map(({ id }, index) => {
            const stepTimestamp =
              stepPoints && new Date(stepPoints[index].timestamp)

            return (
              <div
                key={id}
                className="flex flex-row flex-wrap items-center gap-2"
              >
                <div className="flex shrink-0 flex-col gap-1">
                  <InputLabel name={t('form.unlockPercent')} />

                  <NumericInput
                    disabled={!isCreating}
                    error={errors?.steps?.[index]?.percent}
                    fieldName={
                      (fieldNamePrefix +
                        `steps.${index}.percent`) as `steps.${number}.percent`
                    }
                    getValues={getValues}
                    max={100}
                    min={0}
                    numericValue
                    register={register}
                    setValue={setValue}
                    sizing="md"
                    step={0.01}
                    unit="%"
                    validation={[validateRequired, validateNonNegative]}
                  />

                  <InputErrorMessage error={errors?.steps?.[index]?.percent} />
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <div className="flex flex-row items-end justify-between gap-2">
                    <InputLabel name={'...' + t('form.afterDelay')} />

                    {/* Date Preview */}
                    {stepTimestamp && (
                      <p className="caption-text">
                        ({formatDateTimeTz(stepTimestamp)})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row gap-1">
                    <NumericInput
                      disabled={!isCreating}
                      error={errors?.steps?.[index]?.delay?.value}
                      fieldName={
                        (fieldNamePrefix +
                          `steps.${index}.delay.value`) as `steps.${number}.delay.value`
                      }
                      getValues={getValues}
                      min={1}
                      numericValue
                      register={register}
                      setValue={setValue}
                      sizing="md"
                      step={1}
                      unit={
                        isCreating
                          ? undefined
                          : t(`unit.${steps[index].delay.units}`, {
                              count: steps[index].delay.value,
                            }).toLocaleLowerCase()
                      }
                      validation={[validateRequired, validatePositive]}
                    />

                    {isCreating && (
                      <SelectInput
                        disabled={!isCreating}
                        error={errors?.steps?.[index]?.delay?.units}
                        fieldName={
                          (fieldNamePrefix +
                            `steps.${index}.delay.units`) as `steps.${number}.delay.units`
                        }
                        register={register}
                        validation={[validateRequired]}
                      >
                        {DurationUnitsValuesTimeOnly.map((type, idx) => (
                          <option key={idx} value={type}>
                            {t(`unit.${type}`, {
                              count: steps[index].delay.value,
                            }).toLocaleLowerCase()}
                          </option>
                        ))}
                      </SelectInput>
                    )}
                  </div>

                  <InputErrorMessage
                    error={
                      errors?.steps?.[index]?.delay?.value ||
                      errors?.steps?.[index]?.delay?.units
                    }
                  />
                </div>

                {isCreating && (
                  <IconButton
                    Icon={Close}
                    className="mt-6"
                    onClick={() => removeStep(index)}
                    size="sm"
                    variant="ghost"
                  />
                )}
              </div>
            )
          })}

          {isCreating && (
            <Button
              className="self-start"
              onClick={() =>
                appendStep({
                  percent: 25,
                  delay: {
                    value: 1,
                    units: DurationUnits.Months,
                  },
                })
              }
              variant="secondary"
            >
              {t('button.addStep')}
            </Button>
          )}

          <InputErrorMessage error={errors?.steps} />
        </div>

        <div className="rounded-md bg-background-tertiary p-2">
          <VestingStepsLineGraph
            startTimestamp={parsedStartDate || 0}
            steps={stepPoints ?? []}
            tokenSymbol={selectedSymbol || t('info.token')}
          />
        </div>

        {
          // Widgets prior to V1 use the factory owner.
          !widgetData.version &&
            !preV1VestingFactoryOwner.loading &&
            !preV1VestingFactoryOwner.errored && (
              <div className="flex flex-row items-center gap-4 rounded-md bg-background-secondary p-4">
                <WarningRounded className="!h-8 !w-8" />

                <div className="min-w-0 space-y-2">
                  {preV1VestingFactoryOwner.data === chainAddressOwner ? (
                    <p>
                      {t('info.vestingIsCancellableByOwner', {
                        context: context.type,
                      })}
                    </p>
                  ) : preV1VestingFactoryOwner.data ? (
                    <>
                      <p>{t('info.vestingIsCancellableByOther')}</p>

                      <CopyToClipboard
                        takeStartEnd={{ start: 16, end: 16 }}
                        value={preV1VestingFactoryOwner.data}
                      />
                    </>
                  ) : (
                    <p>{t('info.vestingNotCancellable')}</p>
                  )}
                </div>
              </div>
            )
        }
      </div>
    </ChainProvider>
  )
}
