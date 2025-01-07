import { Check, Close } from '@mui/icons-material'
import clsx from 'clsx'
import JSON5 from 'json5'
import { ComponentType, useEffect } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  CodeMirrorInput,
  FormSwitch,
  GovernanceProposal,
  IconButton,
  InputErrorMessage,
  InputLabel,
  NestedActionsEditor,
  NestedActionsEditorOptions,
  SelectInput,
  TextAreaInput,
  TextInput,
  TokenInput,
  useActionOptions,
  useChainContext,
  useDaoIfAvailable,
} from '@dao-dao/stateless'
import {
  AddressInputProps,
  ChainId,
  ContractVersion,
  GOVERNANCE_PROPOSAL_TYPES,
  GOVERNANCE_PROPOSAL_TYPE_CUSTOM,
  GenericToken,
  GenericTokenBalance,
  GenericTokenBalanceWithOwner,
  GovProposalActionDisplayProps,
  GovernanceProposalActionData,
  LoadingData,
  LoadingDataWithError,
  StatefulTokenAmountDisplayProps,
} from '@dao-dao/types'
import { ActionComponent, ActionContextType } from '@dao-dao/types/actions'
import { CommunityPoolSpendProposal } from '@dao-dao/types/protobuf/codegen/cosmos/distribution/v1beta1/distribution'
import { Cosmos_govv1beta1Content_FromAmino } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { ParameterChangeProposal } from '@dao-dao/types/protobuf/codegen/cosmos/params/v1beta1/params'
import { SoftwareUpgradeProposal } from '@dao-dao/types/protobuf/codegen/cosmos/upgrade/v1beta1/upgrade'
import {
  getChainAssets,
  govProposalActionDataToDecodedContent,
  makeValidateAddress,
  processError,
  validateJSON,
  validateRequired,
} from '@dao-dao/utils'

export type GovernanceProposalOptions = {
  minDeposits: LoadingDataWithError<
    (GenericTokenBalance & {
      min: string
    })[]
  >
  communityPoolBalances: LoadingData<GenericTokenBalanceWithOwner[]>
  TokenAmountDisplay: ComponentType<StatefulTokenAmountDisplayProps>
  AddressInput: ComponentType<AddressInputProps<GovernanceProposalActionData>>
  GovProposalActionDisplay: ComponentType<GovProposalActionDisplayProps>
} & NestedActionsEditorOptions

export const GovernanceProposalComponent: ActionComponent<
  GovernanceProposalOptions,
  GovernanceProposalActionData
> = (props) => {
  const {
    fieldNamePrefix,
    errors,
    isCreating,
    options: {
      minDeposits,
      communityPoolBalances,
      GovProposalActionDisplay,
      TokenAmountDisplay,
      AddressInput,
    },
    data,
  } = props

  const { t } = useTranslation()
  const {
    register,
    setValue,
    getValues,
    watch,
    control,
    setError,
    clearErrors,
  } = useFormContext<GovernanceProposalActionData>()

  const { context } = useActionOptions()
  // Type-check, this action should not be used in a non-gov action context.
  if (context.type !== ActionContextType.Gov) {
    throw new Error('Invalid action context.')
  }

  const supportsV1GovProposals = context.params.supportsV1

  const useV1LegacyContent = watch(
    (fieldNamePrefix + 'useV1LegacyContent') as 'useV1LegacyContent'
  )
  const expedited = watch((fieldNamePrefix + 'expedited') as 'expedited')

  // Whether or not this action is being used directly on a governance page (as
  // opposed to in a DAO proposal).
  const onGovernancePage =
    useDaoIfAvailable()?.coreVersion === ContractVersion.Gov

  const {
    chainId,
    chain: { bech32Prefix },
    nativeToken,
  } = useChainContext()

  const selectedMinDepositToken =
    minDeposits.loading || minDeposits.errored
      ? undefined
      : minDeposits.data.find(
          ({ token }) => token.denomOrAddress === data.deposit[0].denom
        )
  const minDepositTokenDecimals = selectedMinDepositToken?.token.decimals ?? 0
  const depositVotingMin = HugeDecimal.from(selectedMinDepositToken?.min ?? 0)
  const depositSubmitMin = depositVotingMin.times(
    context.params.minInitialDepositRatio
  )
  const depositTokenBalance = HugeDecimal.from(
    selectedMinDepositToken?.balance ?? 0
  )

  const {
    fields: spendFields,
    append: appendSpend,
    remove: removeSpend,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix + 'legacy.spends') as 'legacy.spends',
  })

  const availableTokens: GenericToken[] = Object.values(
    Object.fromEntries(
      [
        // First native.
        ...(nativeToken ? [nativeToken] : []),
        // Then community pool tokens.
        ...(!communityPoolBalances.loading
          ? communityPoolBalances.data.map(({ token }) => token)
          : []),
        // Then the chain assets.
        ...getChainAssets(chainId).filter(
          ({ denomOrAddress }) =>
            !nativeToken || denomOrAddress !== nativeToken.denomOrAddress
        ),
      ].map((token) => [token.denomOrAddress, token])
    )
  )

  // When any legacy fields change, encode and store it.
  const legacy = watch((fieldNamePrefix + 'legacy') as 'legacy')
  const title = watch((fieldNamePrefix + 'title') as 'title')
  const description = watch((fieldNamePrefix + 'description') as 'description')
  useEffect(() => {
    clearErrors((fieldNamePrefix + 'legacyContent') as 'legacyContent')

    if (supportsV1GovProposals && !useV1LegacyContent) {
      return
    }

    try {
      const {
        typeUrl,
        spends,
        spendRecipient,
        parameterChanges,
        upgradePlan,
        custom,
      } = legacy

      const parsedUpgradePlan = JSON5.parse(upgradePlan)
      const parsedCustom = JSON5.parse(custom)

      const spendAmount = spends.map(({ amount, denom, decimals }) =>
        HugeDecimal.fromHumanReadable(amount, decimals).toCoin(denom)
      )

      const content =
        typeUrl === GOVERNANCE_PROPOSAL_TYPE_CUSTOM
          ? Cosmos_govv1beta1Content_FromAmino({
              type: parsedCustom.type,
              value: {
                ...parsedCustom.value,
                // Automatically insert title and description.
                title,
                description,
              },
            })
          : GOVERNANCE_PROPOSAL_TYPES.find(
              (type) => type.typeUrl === typeUrl
            )?.toProtoMsg({
              // all
              title,
              description,
              // CommunityPoolSpendProposal
              amount: spendAmount,
              recipient: spendRecipient,
              // ParameterChangeProposal
              changes: JSON5.parse(parameterChanges),
              // SoftwareUpgradeProposal
              plan: {
                ...parsedUpgradePlan,
                height: !isNaN(Number(parsedUpgradePlan.height))
                  ? BigInt(parsedUpgradePlan.height)
                  : -1n,
              },
            })

      setValue(
        (fieldNamePrefix + 'legacyContent') as 'legacyContent',
        content as any
      )
    } catch (err) {
      console.error(err)
      setError((fieldNamePrefix + 'legacyContent') as 'legacyContent', {
        type: 'manual',
        message: processError(err, { forceCapture: false }),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    description,
    fieldNamePrefix,
    // Object reference does not change when contents do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(legacy),
    setValue,
    supportsV1GovProposals,
    title,
    useV1LegacyContent,
  ])

  return (
    <>
      {isCreating ? (
        <>
          <div
            className={clsx(
              onGovernancePage
                ? 'rounded-lg bg-background-tertiary'
                : 'flex flex-col gap-4'
            )}
          >
            <div
              className={clsx(
                onGovernancePage
                  ? 'flex flex-col gap-2 py-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6'
                  : 'flex flex-col gap-1'
              )}
            >
              <InputLabel name={t('form.title')} primary={onGovernancePage} />

              <div className="flex grow flex-col">
                <TextInput
                  disabled={!isCreating}
                  error={errors?.title}
                  fieldName={(fieldNamePrefix + 'title') as 'title'}
                  placeholder={t('form.proposalsTitlePlaceholder')}
                  register={register}
                  validation={[validateRequired]}
                />
                <InputErrorMessage error={errors?.title} />
              </div>
            </div>

            <div
              className={clsx(
                onGovernancePage
                  ? 'flex flex-col gap-2 border-y border-border-secondary p-6 pt-5 sm:gap-4'
                  : 'flex flex-col gap-1'
              )}
            >
              <InputLabel
                name={t('form.description')}
                primary={onGovernancePage}
              />

              <div className="flex grow flex-col">
                <TextAreaInput
                  disabled={!isCreating}
                  error={errors?.description}
                  fieldName={(fieldNamePrefix + 'description') as 'description'}
                  placeholder={t('form.proposalsDescriptionPlaceholder')}
                  register={register}
                  rows={5}
                  validation={[validateRequired]}
                />
                <InputErrorMessage error={errors?.description} />
              </div>
            </div>

            {supportsV1GovProposals && (
              <div
                className={clsx(
                  'flex flex-col gap-2 py-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
                  onGovernancePage
                    ? 'border-b border-border-secondary py-5 px-6'
                    : 'rounded-md bg-background-tertiary p-4'
                )}
              >
                <InputLabel
                  name={t('title.metadata')}
                  optional
                  primary={onGovernancePage}
                />

                <div className="flex grow flex-col">
                  <TextInput
                    disabled={!isCreating}
                    error={errors?.metadata}
                    fieldName={(fieldNamePrefix + 'metadata') as 'metadata'}
                    register={register}
                  />
                  <InputErrorMessage error={errors?.metadata} />
                </div>
              </div>
            )}

            {
              // Support expedited field on Osmosis.
              (chainId === ChainId.OsmosisMainnet ||
                chainId === ChainId.OsmosisTestnet) && (
                <div
                  className={clsx(
                    'flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2',
                    onGovernancePage
                      ? 'border-b border-border-secondary py-5 px-6'
                      : 'rounded-md bg-background-tertiary p-4'
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <InputLabel
                      name={t('form.expedited')}
                      primary={onGovernancePage}
                    />

                    <p className="caption-text max-w-sm">
                      {t('form.expeditedDescription')}
                    </p>
                  </div>

                  <div className="flex grow flex-col items-end">
                    <FormSwitch
                      fieldName={(fieldNamePrefix + 'expedited') as 'expedited'}
                      setValue={setValue}
                      sizing="md"
                      value={expedited}
                    />
                  </div>
                </div>
              )
            }

            <div
              className={clsx(
                'flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2',
                onGovernancePage
                  ? 'py-5 px-6'
                  : '-mt-2 rounded-md bg-background-tertiary p-4'
              )}
            >
              <div className="flex flex-col gap-1">
                <InputLabel
                  name={t('form.initialDeposit')}
                  primary={onGovernancePage}
                />

                <p className="caption-text max-w-sm">
                  {t('info.govDepositDescription', {
                    amount:
                      depositVotingMin.toInternationalizedHumanReadableString({
                        decimals: minDepositTokenDecimals,
                      }),
                    minAmount:
                      depositSubmitMin.toInternationalizedHumanReadableString({
                        decimals: minDepositTokenDecimals,
                      }),
                    symbol:
                      selectedMinDepositToken?.token.symbol ?? t('info.tokens'),
                  })}
                </p>
              </div>

              <div className="flex grow flex-col items-end">
                <TokenInput
                  amount={{
                    watch,
                    setValue,
                    getValues,
                    register,
                    fieldName: (fieldNamePrefix +
                      'deposit.0.amount') as 'deposit.0.amount',
                    error: errors?.deposit?.[0]?.amount,
                    min: depositSubmitMin.toHumanReadableNumber(
                      minDepositTokenDecimals
                    ),
                    step: HugeDecimal.one.toHumanReadableNumber(
                      minDepositTokenDecimals
                    ),
                    // Validate that balance is sufficient to pay the deposit.
                    validations: [
                      (value) =>
                        isNaN(value) ||
                        !selectedMinDepositToken ||
                        depositTokenBalance.gte(value) ||
                        t('error.insufficientBalance', {
                          amount:
                            depositTokenBalance.toInternationalizedHumanReadableString(
                              {
                                decimals: minDepositTokenDecimals,
                              }
                            ),
                          tokenSymbol: selectedMinDepositToken.token.symbol,
                        }),
                    ],
                  }}
                  onSelectToken={({ denomOrAddress, decimals }) => {
                    setValue(
                      (fieldNamePrefix +
                        'deposit.0.denom') as 'deposit.0.denom',
                      denomOrAddress
                    )
                    setValue(
                      (fieldNamePrefix +
                        'deposit.0.decimals') as 'deposit.0.decimals',
                      decimals
                    )
                  }}
                  readOnly={!isCreating}
                  selectedToken={selectedMinDepositToken?.token}
                  tokens={
                    minDeposits.loading
                      ? { loading: true }
                      : minDeposits.errored
                        ? { loading: false, data: [] }
                        : {
                            loading: false,
                            data: minDeposits.data.map(({ token }) => token),
                          }
                  }
                />
                <InputErrorMessage error={errors?.deposit?.[0]?.amount} />
              </div>
            </div>

            {/* Allow using legacy proposal content for v1 gov proposals. */}
            {supportsV1GovProposals && (
              <div
                className={clsx(
                  'flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2',
                  onGovernancePage
                    ? 'border-t border-border-secondary py-5 px-6'
                    : '-mt-2 rounded-md bg-background-tertiary p-4'
                )}
              >
                <InputLabel
                  name={t('form.useLegacyProposalType')}
                  primary={onGovernancePage}
                />

                <div className="flex grow flex-col items-end">
                  <FormSwitch
                    fieldName={
                      (fieldNamePrefix +
                        'useV1LegacyContent') as 'useV1LegacyContent'
                    }
                    setValue={setValue}
                    sizing="md"
                    value={useV1LegacyContent}
                  />
                </div>
              </div>
            )}

            {(!supportsV1GovProposals || useV1LegacyContent) && (
              <div
                className={clsx(
                  'flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2',
                  onGovernancePage
                    ? 'border-t border-border-secondary py-5 px-6'
                    : '-mt-2 rounded-md bg-background-tertiary p-4'
                )}
              >
                <InputLabel
                  name={t('form.proposalType')}
                  primary={onGovernancePage}
                />

                <div className="flex grow flex-col items-end">
                  <SelectInput
                    error={errors?.legacy?.type}
                    fieldName={
                      (fieldNamePrefix + 'legacy.typeUrl') as 'legacy.typeUrl'
                    }
                    register={register}
                  >
                    {GOVERNANCE_PROPOSAL_TYPES.map(({ typeUrl }) => (
                      <option key={typeUrl} value={typeUrl}>
                        {t(`govProposalType.${typeUrl.split('.').pop()}`)}
                      </option>
                    ))}

                    <option value={GOVERNANCE_PROPOSAL_TYPE_CUSTOM}>
                      {t('title.custom')}
                    </option>
                  </SelectInput>
                </div>
              </div>
            )}
          </div>

          {supportsV1GovProposals && !useV1LegacyContent ? (
            <div
              className={clsx(onGovernancePage && 'mt-4 flex flex-col gap-4')}
            >
              <InputLabel name={t('title.actions')} title={onGovernancePage} />

              <NestedActionsEditor {...props} />
            </div>
          ) : (
            <>
              {data.legacy.typeUrl === CommunityPoolSpendProposal.typeUrl && (
                <>
                  <div className="flex max-w-prose flex-col gap-1">
                    <InputLabel name={t('form.recipient')} />
                    <AddressInput
                      disabled={!isCreating}
                      error={errors?.legacy?.spendRecipient}
                      fieldName={
                        (fieldNamePrefix +
                          'legacy.spendRecipient') as 'legacy.spendRecipient'
                      }
                      register={register}
                      validation={[
                        validateRequired,
                        makeValidateAddress(bech32Prefix),
                      ]}
                    />
                    <InputErrorMessage error={errors?.legacy?.spendRecipient} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <InputLabel name={t('form.proposedSpends')} />

                    <div className="flex flex-row flex-wrap items-end justify-between gap-6">
                      <div className="flex grow flex-col gap-1">
                        <div className="flex flex-col items-stretch gap-2">
                          {spendFields.map(({ id }, index) => {
                            const denom = watch(
                              (fieldNamePrefix +
                                `legacy.spends.${index}.denom`) as `legacy.spends.${number}.denom`
                            )
                            const selectedToken = availableTokens.find(
                              ({ denomOrAddress }) => denomOrAddress === denom
                            )
                            if (!selectedToken) {
                              return null
                            }

                            return (
                              <div
                                key={id}
                                className="flex flex-row items-center gap-2"
                              >
                                <TokenInput
                                  amount={{
                                    watch,
                                    setValue,
                                    getValues,
                                    register,
                                    fieldName: (fieldNamePrefix +
                                      `legacy.spends.${index}.amount`) as `legacy.spends.${number}.amount`,
                                    error:
                                      errors?.legacy?.spends?.[index]?.amount,
                                    min: HugeDecimal.one.toHumanReadableNumber(
                                      selectedToken.decimals
                                    ),
                                    step: HugeDecimal.one.toHumanReadableNumber(
                                      selectedToken.decimals
                                    ),
                                  }}
                                  onSelectToken={({
                                    denomOrAddress,
                                    decimals,
                                  }) => {
                                    setValue(
                                      (fieldNamePrefix +
                                        `legacy.spends.${index}.denom`) as `legacy.spends.${number}.denom`,
                                      denomOrAddress
                                    )
                                    setValue(
                                      (fieldNamePrefix +
                                        `legacy.spends.${index}.decimals`) as `legacy.spends.${number}.decimals`,
                                      decimals
                                    )
                                  }}
                                  selectedToken={selectedToken}
                                  tokens={{
                                    loading: false,
                                    data: availableTokens,
                                  }}
                                />

                                <IconButton
                                  Icon={Close}
                                  onClick={() => removeSpend(index)}
                                  size="sm"
                                  variant="ghost"
                                />
                              </div>
                            )
                          })}

                          {isCreating && (
                            <Button
                              className="self-start"
                              onClick={() =>
                                appendSpend({
                                  amount: '1',
                                  denom: nativeToken?.denomOrAddress || '',
                                })
                              }
                              variant="secondary"
                            >
                              {t('button.addPayment')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {data.legacy.typeUrl === ParameterChangeProposal.typeUrl && (
                <div className="flex flex-col items-stretch gap-1">
                  <InputLabel name={t('form.parameterChanges')} />
                  <CodeMirrorInput
                    control={control}
                    error={errors?.legacy?.parameterChanges}
                    fieldName={
                      (fieldNamePrefix +
                        'legacy.parameterChanges') as 'legacy.parameterChanges'
                    }
                    validation={[validateJSON]}
                  />
                  {errors?.legacy?.parameterChanges?.message ? (
                    <p className="text-error flex items-center gap-1 text-sm">
                      <Close className="inline w-5" />{' '}
                      <span>{errors.legacy?.parameterChanges?.message}</span>
                    </p>
                  ) : (
                    <p className="text-success flex items-center gap-1 text-sm">
                      <Check className="inline w-5" /> {t('info.jsonIsValid')}
                    </p>
                  )}
                </div>
              )}

              {data.legacy.typeUrl === SoftwareUpgradeProposal.typeUrl && (
                <div className="flex flex-col items-stretch gap-1">
                  <InputLabel name={t('form.plan')} />
                  <CodeMirrorInput
                    control={control}
                    error={errors?.legacy?.upgradePlan}
                    fieldName={
                      (fieldNamePrefix +
                        'legacy.upgradePlan') as 'legacy.upgradePlan'
                    }
                    validation={[validateJSON]}
                  />
                  {errors?.legacy?.upgradePlan?.message ? (
                    <p className="text-error flex items-center gap-1 text-sm">
                      <Close className="inline w-5" />{' '}
                      <span>{errors.legacy?.upgradePlan?.message}</span>
                    </p>
                  ) : (
                    <p className="text-success flex items-center gap-1 text-sm">
                      <Check className="inline w-5" /> {t('info.jsonIsValid')}
                    </p>
                  )}
                </div>
              )}

              {data.legacy.typeUrl === GOVERNANCE_PROPOSAL_TYPE_CUSTOM && (
                <div className="flex flex-col items-stretch gap-1">
                  <InputLabel name={t('title.custom')} />

                  <CodeMirrorInput
                    control={control}
                    error={errors?.legacy?.custom}
                    fieldName={
                      (fieldNamePrefix + 'legacy.custom') as 'legacy.custom'
                    }
                    validation={[validateJSON]}
                  />
                  {errors?.legacy?.custom?.message ? (
                    <p className="text-error flex items-center gap-1 text-sm">
                      <Close className="inline w-5" />{' '}
                      <span>{errors.legacy?.custom?.message}</span>
                    </p>
                  ) : (
                    <p className="text-success flex items-center gap-1 text-sm">
                      <Check className="inline w-5" /> {t('info.jsonIsValid')}
                    </p>
                  )}
                </div>
              )}

              <InputErrorMessage error={errors?.legacyContent} />
            </>
          )}
        </>
      ) : (
        <GovernanceProposal
          GovProposalActionDisplay={GovProposalActionDisplay}
          TokenAmountDisplay={TokenAmountDisplay}
          content={govProposalActionDataToDecodedContent(data)}
          deposit={data.deposit.map(({ denom, amount, decimals }) => ({
            denom,
            amount: HugeDecimal.fromHumanReadable(amount, decimals).toString(),
          }))}
        />
      )}
    </>
  )
}
