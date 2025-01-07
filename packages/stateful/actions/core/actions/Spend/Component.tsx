import { ArrowRightAltRounded } from '@mui/icons-material'
import { ComponentType, RefAttributes, useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  AccountSelector,
  Button,
  ChainLabel,
  ChainLogo,
  ChainProvider,
  FormSwitchCard,
  IbcDestinationChainPicker,
  InputErrorMessage,
  InputLabel,
  InputThemedText,
  Loader,
  NumericInput,
  PercentButton,
  SelectInput,
  StatusCard,
  TokenAmountDisplay,
  TokenInput,
  useActionOptions,
  useDetectWrap,
} from '@dao-dao/stateless'
import {
  AddressInputProps,
  DurationUnitsValuesTimeOnly,
  DurationWithUnits,
  Entity,
  EntityType,
  GenericToken,
  GenericTokenBalance,
  GenericTokenBalanceWithOwner,
  LoadingData,
  LoadingDataWithError,
  SkipMultiChainMsg,
  TokenType,
} from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
} from '@dao-dao/types/actions'
import { Params as NobleTariffParams } from '@dao-dao/types/protobuf/codegen/tariff/params'
import {
  formatDateTimeTz,
  formatPercentOf100,
  getAccountAddress,
  getChainForChainId,
  getDisplayNameForChainId,
  getSupportedChainConfig,
  isValidBech32Address,
  makeValidateAddress,
  processError,
  transformBech32Address,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

export type SpendData = {
  fromChainId: string
  /*
   * If same as fromChainId, then normal spend or CW20 transfer. Otherwise, IBC
   * transfer.
   */
  toChainId: string
  /*
   * Address with the tokens. This is needed since there may be multiple
   * accounts controlled by the DAO on the same chain.
   */
  from: string
  to: string
  amount: string
  denom: string
  /**
   * Whether or not `denom` is a CW20 token address. CW20 tokens cannot be sent
   * to a different chain.
   */
  cw20: boolean
  /**
   * Relative IBC transfer timeout after max voting period.
   */
  ibcTimeout?: DurationWithUnits
  /**
   * Once created, this is loaded from the message.
   */
  _absoluteIbcTimeout?: number
  /**
   * If true, will not use the PFM optimized path from Skip.
   */
  useDirectIbcPath?: boolean
  /**
   * Defined once loaded for IBC transfers. Needed for transforming.
   */
  _skipIbcTransferMsg?: LoadingDataWithError<SkipMultiChainMsg>
  /**
   * Loaded from IBC transfer message on decode.
   */
  _ibcData?: {
    sourceChannel: string
    /**
     * Loaded for packet-forwarding-middleware detection after creation (likely
     * created using Skip's router API).
     */
    pfmMemo?: string
  }
}

export type SpendOptions = {
  // The tokens in all accounts controlled by the spender.
  tokens: LoadingData<GenericTokenBalanceWithOwner[]>
  // The current token input. May or may not be in the list of tokens above, if
  // they entered a custom token.
  token: LoadingDataWithError<GenericToken>
  // The current recipient entity.
  currentEntity: Entity | undefined
  // If this is an IBC transfer, this is the path of chains.
  ibcPath: LoadingDataWithError<string[]>
  // If this is an IBC transfer, show the expected receive amount.
  ibcAmountOut: LoadingDataWithError<HugeDecimal | undefined>
  // If this is an IBC transfer and a multi-TX route exists that unwinds the
  // tokens correctly but doesn't use PFM, this is the better path.
  betterNonPfmIbcPath: LoadingData<string[] | undefined>
  // If this is an IBC transfer, these are the chains with missing accounts.
  missingAccountChainIds?: string[]
  // If this spend is Noble USDC and leaves Noble at some point, these are the
  // fee settings.
  nobleTariff: LoadingDataWithError<NobleTariffParams | null>
  // If this spend incurs an IBC transfer fee on Neutron, show it.
  neutronTransferFee: LoadingDataWithError<GenericTokenBalance[] | undefined>
  // Whether or not the proposal max voting period is in blocks.
  proposalModuleMaxVotingPeriodInBlocks: boolean
  // Used to render pfpk or DAO profiles when selecting addresses.
  AddressInput: ComponentType<
    AddressInputProps<SpendData> & RefAttributes<HTMLDivElement>
  >
  // Hide the destination chain/address picker.
  noChangeDestination?: boolean
}

export const SpendComponent: ActionComponent<SpendOptions> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: {
    tokens,
    token,
    currentEntity,
    ibcPath,
    ibcAmountOut,
    betterNonPfmIbcPath,
    missingAccountChainIds,
    nobleTariff,
    neutronTransferFee,
    proposalModuleMaxVotingPeriodInBlocks,
    AddressInput,
    noChangeDestination,
  },
  addAction,
  remove,
}) => {
  const { t } = useTranslation()
  const {
    context,
    chain: { chainId: mainChainId },
  } = useActionOptions()

  const { register, watch, setValue, getValues } = useFormContext<SpendData>()

  const spendChainId = watch((fieldNamePrefix + 'fromChainId') as 'fromChainId')
  const spendAmount = watch((fieldNamePrefix + 'amount') as 'amount')
  const spendDenom = watch((fieldNamePrefix + 'denom') as 'denom')
  const isCw20 = watch((fieldNamePrefix + 'cw20') as 'cw20')
  const from = watch((fieldNamePrefix + 'from') as 'from')
  const recipient = watch((fieldNamePrefix + 'to') as 'to')
  const useDirectIbcPath = watch(
    (fieldNamePrefix + 'useDirectIbcPath') as 'useDirectIbcPath'
  )
  const ibcTimeout = watch((fieldNamePrefix + 'ibcTimeout') as 'ibcTimeout')
  const _absoluteIbcTimeout = watch(
    (fieldNamePrefix + '_absoluteIbcTimeout') as '_absoluteIbcTimeout'
  )

  // Cannot send to a different chain from the gov module.
  const toChainId =
    context.type === ActionContextType.Gov
      ? spendChainId
      : watch((fieldNamePrefix + 'toChainId') as 'toChainId')
  const toChain = getChainForChainId(toChainId)

  // IBC transfer if destination chain ID is different from source chain ID.
  // Don't show until amount is nonzero, since the Skip API requires a nonzero
  // amount to compute the IBC path.
  const showIbcPath = spendChainId !== toChainId && !!spendAmount

  // On destination chain ID change, update address intelligently.
  useEffect(() => {
    // If no current entity, or the loaded entity is different from entered
    // recipient, do nothing. Only update address intelligently if we have
    // loaded the entity for the entered recipient.
    if (
      !currentEntity ||
      !recipient ||
      // Do nothing for module accounts as they only exist on the current chain.
      currentEntity.type === EntityType.Module ||
      // Non-DAO on current chain.
      (currentEntity.type !== EntityType.Dao ||
      // DAO on native chain (core contract address).
      !currentEntity.polytoneProxy
        ? recipient !== currentEntity.address
        : // DAO on other chain (polytone proxy address).
          recipient !== currentEntity.polytoneProxy.address)
    ) {
      return
    }

    let newRecipient: string | undefined

    // Convert wallet address to destination chain's format.
    if (currentEntity.type === EntityType.Wallet) {
      newRecipient =
        // Use profile address if set, falling back to transforming the address
        // (which is unreliable due to different chains using different HD
        // paths).
        currentEntity.profile?.chains[toChain.chainId]?.address ||
        transformBech32Address(currentEntity.address, toChain.chainId)
    }
    // Get DAO core address or its corresponding polytone proxy. Clear if no
    // account on the destination chain.
    else if (currentEntity.type === EntityType.Dao) {
      newRecipient =
        getAccountAddress({
          accounts: currentEntity.daoInfo.accounts,
          chainId: toChain.chainId,
        }) || ''
    }

    if (newRecipient && newRecipient !== recipient) {
      setValue((fieldNamePrefix + 'to') as 'to', newRecipient)
    }
  }, [context, currentEntity, fieldNamePrefix, recipient, setValue, toChain])

  // If entering a custom token, we need to show a list of from chains/addresses
  // that the DAO controls. Usually that information is retrieved from the token
  // list.
  const [customToken, setCustomToken] = useState(false)

  const loadedCustomToken =
    customToken &&
    !token.loading &&
    !token.errored &&
    token.data.chainId === spendChainId &&
    token.data.denomOrAddress === spendDenom &&
    token.data.decimals > 0

  // Don't select token if entering a custom token.
  const selectedToken =
    customToken || tokens.loading
      ? undefined
      : tokens.data.find(
          ({ owner, token }) =>
            owner.address === from &&
            token.chainId === spendChainId &&
            token.denomOrAddress === spendDenom &&
            (token.type === TokenType.Cw20) === isCw20
        )

  const decimals = loadedCustomToken
    ? token.data.decimals
    : selectedToken?.token.decimals || 0

  const balance = HugeDecimal.from(selectedToken?.balance ?? 0)

  // A warning if the denom was not found in the treasury or the amount is too
  // high. We don't want to make this an error because often people want to
  // spend funds that a previous action makes available, so just show a warning.
  const symbol = selectedToken?.token.symbol || spendDenom
  const warning =
    customToken || !isCreating || tokens.loading || !spendDenom
      ? undefined
      : !selectedToken
        ? t('error.unknownDenom', { denom: spendDenom })
        : balance.toHumanReadable(decimals).lt(spendAmount)
          ? t('error.insufficientFundsWarning', {
              amount: balance.toInternationalizedHumanReadableString({
                decimals,
              }),
              tokenSymbol: symbol,
            })
          : undefined

  const {
    containerRef: toContainerRef,
    childRef: toChildRef,
    wrapped: toWrapped,
  } = useDetectWrap()

  return (
    <>
      {isCreating ? (
        <>
          <InputLabel className="-mb-2" name={t('form.from')} />

          <div className="flex min-w-0 flex-row flex-wrap items-stretch gap-1">
            <AccountSelector
              accounts={context.accounts}
              className="w-auto grow"
              disabled={
                // Enable account picker if entering custom token since we can't
                // automatically determine where it's coming from.
                !isCreating || !customToken
              }
              onSelect={(account) => {
                setValue(
                  (fieldNamePrefix + 'fromChainId') as 'fromChainId',
                  account.chainId
                )
                setValue((fieldNamePrefix + 'from') as 'from', account.address)
              }}
              selectedAccount={context.accounts.find(
                (a) => a.chainId === spendChainId && a.address === from
              )}
            />

            <TokenInput
              allowCustomToken
              amount={{
                watch,
                setValue,
                getValues,
                register,
                fieldName: (fieldNamePrefix + 'amount') as 'amount',
                error: errors?.amount,
                min: HugeDecimal.one.toHumanReadableNumber(decimals),
                step: HugeDecimal.one.toHumanReadableNumber(decimals),
                // For custom token, show unit if loaded successfully.
                unit: loadedCustomToken ? token.data.symbol : undefined,
                unitIconUrl: loadedCustomToken
                  ? token.data.imageUrl || undefined
                  : undefined,
                unitClassName: '!text-text-primary',
              }}
              containerClassName="grow !max-w-full"
              onCustomTokenChange={(custom) => {
                setValue((fieldNamePrefix + 'denom') as 'denom', custom)
                // If denom entered is a valid contract address, it's most
                // likely a cw20 token. I've never seen a native denom that was
                // formatted like an address.
                setValue(
                  (fieldNamePrefix + 'cw20') as 'cw20',
                  isValidBech32Address(
                    custom,
                    getChainForChainId(spendChainId).bech32Prefix
                  )
                )
              }}
              onSelectToken={(token) => {
                setCustomToken(!token)

                // Custom token
                if (!token) {
                  return
                }

                // If chain changes and the dest chain is the same, switch it.
                if (
                  spendChainId === toChainId &&
                  token.chainId !== spendChainId
                ) {
                  setValue(
                    (fieldNamePrefix + 'toChainId') as 'toChainId',
                    token.chainId
                  )
                }

                setValue(
                  (fieldNamePrefix + 'fromChainId') as 'fromChainId',
                  token.chainId
                )
                setValue(
                  (fieldNamePrefix + 'from') as 'from',
                  token.owner.address
                )

                setValue(
                  (fieldNamePrefix + 'denom') as 'denom',
                  token.denomOrAddress
                )
                setValue(
                  (fieldNamePrefix + 'cw20') as 'cw20',
                  token.type === TokenType.Cw20
                )

                // If token is cw20, set destination chain to same as source.
                if (token.type === TokenType.Cw20) {
                  setValue(
                    (fieldNamePrefix + 'toChainId') as 'toChainId',
                    token.chainId
                  )
                }
              }}
              readOnly={!isCreating}
              selectedToken={selectedToken?.token}
              tokens={
                tokens.loading
                  ? { loading: true }
                  : {
                      loading: false,
                      data: tokens.data.map(({ owner, balance, token }) => ({
                        ...token,
                        owner,
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

          {isCreating && !!(errors?.amount || warning) && (
            <div className="-mt-4 -ml-1 flex flex-col gap-1">
              <InputErrorMessage error={errors?.amount} />
              <InputErrorMessage error={warning} warning />
            </div>
          )}

          {
            // Show custom token load status and decimal conversion info once a
            // denom has started being entered.
            isCreating &&
              customToken &&
              !!spendDenom &&
              (!token.loading && !token.updating ? (
                loadedCustomToken ? (
                  <StatusCard
                    className="-mt-2"
                    content={t('info.spendActionCustomTokenDecimalsFound', {
                      tokenSymbol: token.data.symbol,
                      decimals: token.data.decimals,
                    })}
                    size="xs"
                    style="success"
                  />
                ) : (
                  <StatusCard
                    className="-mt-2"
                    content={t('error.customTokenNoDecimals')}
                    size="xs"
                    style="warning"
                  />
                )
              ) : (
                <StatusCard
                  className="-mt-2"
                  content={t('info.loadingCustomToken')}
                  size="xs"
                  style="loading"
                />
              ))
          }

          {selectedToken && isCreating && (
            <div className="flex flex-row justify-between flex-wrap items-center -mt-2 mb-2 gap-x-8 gap-y-2">
              <div className="flex flex-row items-center gap-2">
                <p className="caption-text">{t('info.yourBalance')}:</p>

                <TokenAmountDisplay
                  amount={balance}
                  decimals={selectedToken.token.decimals}
                  iconUrl={selectedToken.token.imageUrl}
                  onClick={() =>
                    setValue(
                      (fieldNamePrefix + 'amount') as 'amount',
                      balance.toHumanReadableString(decimals)
                    )
                  }
                  showFullAmount
                  symbol={selectedToken.token.symbol}
                />
              </div>

              {balance.isPositive() && (
                <div className="grid grid-cols-5 gap-1">
                  {[10, 25, 50, 75, 100].map((percent) => (
                    <PercentButton
                      key={percent}
                      amount={HugeDecimal.fromHumanReadable(
                        spendAmount,
                        decimals
                      )}
                      loadingMax={{ loading: false, data: balance }}
                      percent={percent}
                      setAmount={(amount) =>
                        setValue(
                          (fieldNamePrefix + 'amount') as 'amount',
                          amount.toHumanReadableString(decimals)
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <InputLabel className="-mb-2" name={t('form.to')} />

          <div
            className="flex min-w-0 flex-row flex-wrap items-stretch gap-1"
            ref={toContainerRef}
          >
            {/* Cannot send over IBC from the gov module. */}
            {isCreating &&
              context.type !== ActionContextType.Gov &&
              !noChangeDestination && (
                <IbcDestinationChainPicker
                  buttonClassName={toWrapped ? 'grow' : undefined}
                  disabled={selectedToken?.token.type === TokenType.Cw20}
                  includeSourceChain
                  onSelect={(chainId) => {
                    // Type-check. None option is disabled so should not be
                    // possible.
                    if (!chainId) {
                      return
                    }

                    setValue(
                      (fieldNamePrefix + 'toChainId') as 'toChainId',
                      chainId
                    )
                  }}
                  selectedChainId={toChainId}
                  sourceChainId={spendChainId}
                />
              )}

            {/* Change search address and placeholder based on destination chain. */}
            <div className="flex grow flex-row items-stretch" ref={toChildRef}>
              <ChainProvider chainId={toChainId}>
                <AddressInput
                  containerClassName="grow"
                  disabled={!isCreating || noChangeDestination}
                  error={errors?.to}
                  fieldName={(fieldNamePrefix + 'to') as 'to'}
                  register={register}
                  validation={[
                    validateRequired,
                    makeValidateAddress(toChain.bech32Prefix),
                  ]}
                />
              </ChainProvider>
            </div>
          </div>

          <InputErrorMessage className="-mt-4" error={errors?.to} />
        </>
      ) : (
        <div className="flex flex-row gap-3 items-center">
          <TokenAmountDisplay
            amount={HugeDecimal.fromHumanReadable(spendAmount, decimals)}
            decimals={decimals}
            iconClassName="!h-6 !w-6"
            iconUrl={
              token.loading || token.errored ? undefined : token.data.imageUrl
            }
            showChainId={spendChainId}
            showFullAmount
            symbol={
              token.loading || token.errored ? spendDenom : token.data.symbol
            }
          />

          <ArrowRightAltRounded className="!h-6 !w-6 !text-icon-secondary" />

          <ChainProvider chainId={toChainId}>
            <AddressInput
              containerClassName="-ml-2"
              disabled
              fieldName={(fieldNamePrefix + 'to') as 'to'}
              register={register}
            />
          </ChainProvider>
        </div>
      )}

      {showIbcPath && (
        <div className="border-border-primary flex flex-col gap-3 rounded-md border-2 border-dashed p-4">
          <div className="flex flex-row flex-wrap items-start justify-between gap-x-8 gap-y-2">
            <InputLabel
              name={t('title.ibcTransferPath')}
              tooltip={t('info.ibcTransferPathTooltip', {
                context:
                  ibcPath.loading ||
                  ibcPath.errored ||
                  ibcPath.data.length === 2
                    ? undefined
                    : // If more than one hop in the path, this uses packet-forward-middleware.
                      'pfm',
              })}
            />

            {isCreating &&
              ((!ibcPath.loading &&
                !ibcPath.errored &&
                ibcPath.data.length > 2) ||
                useDirectIbcPath) && (
                <FormSwitchCard
                  fieldName={
                    (fieldNamePrefix + 'useDirectIbcPath') as 'useDirectIbcPath'
                  }
                  label={t('form.useDirectIbcPath')}
                  setValue={setValue}
                  sizing="sm"
                  tooltip={t('form.useDirectIbcPathTooltip')}
                  tooltipIconSize="sm"
                  value={useDirectIbcPath}
                />
              )}
          </div>

          {ibcPath.loading ? (
            <Loader className="!justify-start" fill={false} size={26} />
          ) : ibcPath.errored ? (
            <p className="body-text text-text-interactive-error">
              {processError(ibcPath.error, {
                forceCapture: false,
              })}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-row items-center gap-3">
                {ibcPath.data.map((chainId, index) => (
                  <>
                    <ChainLabel chainId={chainId} />

                    {index !== ibcPath.data.length - 1 && (
                      <ArrowRightAltRounded className="text-text-secondary !h-5 !w-5" />
                    )}
                  </>
                ))}
              </div>

              {selectedToken &&
                !nobleTariff.loading &&
                !nobleTariff.errored &&
                nobleTariff.data &&
                nobleTariff.data.transferFeeDenom ===
                  selectedToken.token.source.denomOrAddress && (
                  <NobleTariff
                    amount={spendAmount}
                    params={nobleTariff.data}
                    token={selectedToken.token}
                  />
                )}

              {!neutronTransferFee.loading &&
                !neutronTransferFee.errored &&
                neutronTransferFee.data && (
                  <p className="secondary-text text-text-interactive-warning-body max-w-prose">
                    {t('info.neutronTransferFeeApplied', {
                      fee: neutronTransferFee.data
                        .map(({ token, balance }) =>
                          t('format.token', {
                            amount: HugeDecimal.from(
                              balance
                            ).toInternationalizedHumanReadableString({
                              decimals: token.decimals,
                            }),
                            symbol: token.symbol,
                          })
                        )
                        .join(', '),
                    })}
                  </p>
                )}

              {isCreating &&
                !betterNonPfmIbcPath.loading &&
                betterNonPfmIbcPath.data && (
                  <StatusCard
                    className="max-w-xl"
                    content={
                      <div className="flex flex-col gap-3">
                        <p className="primary-text text-text-interactive-warning-body">
                          {t('info.betterNonPfmIbcPathAvailable')}
                        </p>

                        <div className="flex flex-row items-center gap-3">
                          {betterNonPfmIbcPath.data.map((chainId, index) => (
                            <>
                              <div className="flex flex-row items-center gap-2">
                                <ChainLogo chainId={chainId} />

                                <p className="primary-text">
                                  {getDisplayNameForChainId(chainId)}
                                </p>
                              </div>

                              {index !==
                                betterNonPfmIbcPath.data!.length - 1 && (
                                <ArrowRightAltRounded className="text-text-secondary !h-5 !w-5" />
                              )}
                            </>
                          ))}
                        </div>
                      </div>
                    }
                    style="warning"
                  />
                )}

              {isCreating && !!missingAccountChainIds?.length && (
                <StatusCard
                  className="max-w-xl"
                  content={
                    <div className="flex flex-col items-start gap-3">
                      <p className="primary-text text-text-interactive-warning-body">
                        {t('info.betterPfmIbcPathAvailable', {
                          chains: missingAccountChainIds
                            .map((chainId) => getDisplayNameForChainId(chainId))
                            .join(', '),
                          count: missingAccountChainIds.length,
                        })}
                      </p>

                      {addAction && (
                        <Button
                          onClick={() => {
                            // Remove the current action.
                            remove()
                            // Add missing chains. Use polytone if possible, or
                            // ICA otherwise.
                            missingAccountChainIds.forEach((chainId) => {
                              const hasPolytoneConnection =
                                !!getSupportedChainConfig(mainChainId)
                                  ?.polytone?.[chainId]

                              if (hasPolytoneConnection) {
                                addAction({
                                  actionKey: ActionKey.CreateCrossChainAccount,
                                  data: {
                                    chainId,
                                  },
                                })
                              } else {
                                addAction({
                                  actionKey: ActionKey.CreateIca,
                                  data: {
                                    chainId,
                                  },
                                })
                                addAction({
                                  actionKey: ActionKey.HideIca,
                                  data: {
                                    chainId,
                                    register: true,
                                  },
                                })
                              }
                            })
                          }}
                        >
                          {t('button.addAccountCreationActions')}
                        </Button>
                      )}
                    </div>
                  }
                  style="warning"
                />
              )}
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2">
            <InputLabel
              name={t('form.ibcTimeout')}
              tooltip={t('form.ibcTimeoutTooltip', {
                context: !isCreating
                  ? 'created'
                  : proposalModuleMaxVotingPeriodInBlocks
                    ? 'blocks'
                    : undefined,
              })}
            />

            {isCreating ? (
              <>
                <div className="flex flex-row gap-1">
                  <NumericInput
                    disabled={!isCreating}
                    error={errors?.ibcTimeout?.value}
                    fieldName={
                      (fieldNamePrefix +
                        'ibcTimeout.value') as 'ibcTimeout.value'
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
                        : t(`unit.${ibcTimeout?.units}`, {
                            count: ibcTimeout?.value,
                          }).toLocaleLowerCase()
                    }
                    validation={[validateRequired, validatePositive]}
                  />

                  {isCreating && (
                    <SelectInput
                      disabled={!isCreating}
                      error={errors?.ibcTimeout?.units}
                      fieldName={
                        (fieldNamePrefix +
                          'ibcTimeout.units') as 'ibcTimeout.units'
                      }
                      register={register}
                      validation={[validateRequired]}
                    >
                      {DurationUnitsValuesTimeOnly.map((type, idx) => (
                        <option key={idx} value={type}>
                          {t(`unit.${type}`, {
                            count: ibcTimeout?.value,
                          }).toLocaleLowerCase()}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </div>

                <InputErrorMessage
                  error={errors?.ibcTimeout?.value || errors?.ibcTimeout?.units}
                />
              </>
            ) : _absoluteIbcTimeout ? (
              <InputThemedText className="!p-0 font-mono !ring-0">
                {formatDateTimeTz(new Date(_absoluteIbcTimeout))}
              </InputThemedText>
            ) : (
              <p className="text-text-interactive-error italic">
                {t('error.loadingData')}
              </p>
            )}
          </div>

          {selectedToken &&
            !ibcAmountOut.loading &&
            !ibcAmountOut.updating &&
            !ibcAmountOut.errored &&
            ibcAmountOut.data &&
            !ibcAmountOut.data
              .toHumanReadable(selectedToken.token.decimals)
              .eq(spendAmount) && (
              <div className="flex flex-col gap-2 mt-1">
                <InputLabel name={t('form.amountReceived')} />

                <TokenAmountDisplay
                  amount={ibcAmountOut.data}
                  decimals={selectedToken.token.decimals}
                  iconUrl={selectedToken.token.imageUrl}
                  showFullAmount
                  symbol={selectedToken.token.symbol}
                />
              </div>
            )}
        </div>
      )}
    </>
  )
}

type NobleTariffProps = {
  token: GenericToken
  amount: string
  params: NobleTariffParams
}

const NobleTariff = ({
  token: { symbol, decimals },
  amount: _amount,
  params: { transferFeeBps, transferFeeMax },
}: NobleTariffProps) => {
  const { t } = useTranslation()

  const amount = HugeDecimal.fromHumanReadable(_amount, decimals)

  const feeDecimal = Number(transferFeeBps) / 1e4
  const maxFee = HugeDecimal.from(transferFeeMax)
  const fee =
    _amount && !amount.isNaN()
      ? HugeDecimal.min(amount.times(feeDecimal), maxFee)
      : HugeDecimal.zero

  if (fee.isZero()) {
    return null
  }

  return (
    <p className="secondary-text text-text-interactive-warning-body max-w-prose">
      {t('info.nobleTariffApplied', {
        feePercent: formatPercentOf100(feeDecimal * 100),
        tokenSymbol: symbol,
        maxFee: maxFee.toInternationalizedHumanReadableString({
          decimals,
        }),
        fee: fee.toInternationalizedHumanReadableString({
          decimals,
        }),
        output: amount.minus(fee).toInternationalizedHumanReadableString({
          decimals,
        }),
      })}
    </p>
  )
}
