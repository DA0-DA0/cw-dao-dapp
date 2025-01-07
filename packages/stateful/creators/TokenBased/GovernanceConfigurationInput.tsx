import { Add } from '@mui/icons-material'
import clsx from 'clsx'
import cloneDeep from 'lodash.clonedeep'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  Cw20BaseSelectors,
  genericTokenSelector,
  nativeSupplySelector,
  tokenFactoryDenomCreationFeeSelector,
} from '@dao-dao/state'
import {
  Button,
  ImageSelector,
  InputErrorMessage,
  InputLabel,
  Loader,
  NumericInput,
  SegmentedControls,
  TextInput,
  VotingPowerDistribution,
  VotingPowerDistributionEntry,
  useCachedLoading,
  useSupportedChainContext,
} from '@dao-dao/stateless'
import {
  ChainId,
  CreateDaoCustomValidator,
  DaoCreationGovernanceConfigInputProps,
  TokenType,
} from '@dao-dao/types'
import { TokenInfoResponse } from '@dao-dao/types/contracts/Cw20Base'
import {
  DISTRIBUTION_COLORS,
  NEW_DAO_TOKEN_DECIMALS,
  formatPercentOf100,
  humanReadableList,
  isValidBech32Address,
  isValidNativeTokenDenom,
  isValidUrl,
  makeValidateAddress,
  transformIpfsUrlToHttpsIfNecessary,
  validateNativeTokenDenom,
  validatePercent,
  validatePositive,
  validateRequired,
  validateTokenSymbol,
} from '@dao-dao/utils'

import { TokenBasedCreator } from '.'
import { EntityDisplay } from '../../components/EntityDisplay'
import { Trans } from '../../components/Trans'
import { useWallet } from '../../hooks/useWallet'
import { TierCard } from './TierCard'
import { CreatorData, GovernanceTokenType } from './types'

export const GovernanceConfigurationInput = ({
  data,
  context: {
    form: {
      control,
      formState: { errors },
      register,
      setValue,
      getValues,
      setError,
      clearErrors,
      watch,
    },
    setCustomValidator,
  },
}: DaoCreationGovernanceConfigInputProps<CreatorData>) => {
  const { t } = useTranslation()
  const { address: walletAddress } = useWallet()

  const {
    chain: { chainId, bech32Prefix },
    config,
  } = useSupportedChainContext()

  const isBitsong =
    chainId === ChainId.BitsongMainnet || chainId === ChainId.BitsongTestnet

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({
    control,
    name: 'creator.data.tiers',
  })

  const addTierRef = useRef<HTMLButtonElement>(null)
  const addTier = useCallback(() => {
    appendTier(cloneDeep(TokenBasedCreator.makeDefaultConfig(config).tiers[0]))
    // Scroll button to bottom of screen.
    addTierRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [appendTier, config])

  // Load token factory denom creation fee.
  const tokenFactoryDenomCreationFeeLoading = useCachedLoading(
    tokenFactoryDenomCreationFeeSelector(chainId),
    undefined
  )
  useEffect(() => {
    if (
      data.govTokenType === GovernanceTokenType.New &&
      !tokenFactoryDenomCreationFeeLoading.loading
    ) {
      setValue(
        'creator.data.tokenFactoryDenomCreationFee',
        tokenFactoryDenomCreationFeeLoading.data
      )
    } else {
      // No fee for using existing token.
      setValue('creator.data.tokenFactoryDenomCreationFee', undefined)
    }
  }, [data.govTokenType, setValue, tokenFactoryDenomCreationFeeLoading])

  // Fill in default first tier info if tiers not yet edited.
  const [loadedPage, setLoadedPage] = useState(false)
  useEffect(() => {
    if (loadedPage) return
    setLoadedPage(true)

    if (
      !(
        data.tiers.length === 1 &&
        data.tiers[0].name === '' &&
        data.tiers[0].members.length === 1 &&
        data.tiers[0].members[0].address === ''
      )
    )
      return

    setValue('creator.data.tiers.0.name', t('form.defaultTierName'))
    if (walletAddress) {
      setValue('creator.data.tiers.0.members.0.address', walletAddress)
    }
  }, [data.tiers, loadedPage, setValue, t, walletAddress])

  //! Validate tiers.
  // Custom validation function for this page. Called upon attempt to navigate
  // forward.
  const customValidator: CreateDaoCustomValidator = useCallback(
    (setNewErrors) => {
      let valid = true

      const totalWeight =
        data.tiers.reduce(
          (acc, { weight, members }) => acc + weight * members.length,
          0
        ) || 0
      // Ensure voting power has been given to at least one member.
      if (totalWeight === 0) {
        if (setNewErrors) {
          setError('creator.data._tiersError', {
            message: t('error.noVotingPower'),
          })
        }
        valid = false
      } else if (errors?.creator?.data?._tiersError) {
        clearErrors('creator.data._tiersError')
      }

      // Ensure each tier has at least one member.
      data.tiers.forEach((tier, tierIndex) => {
        if (tier.members.length === 0) {
          if (setNewErrors) {
            setError(`creator.data.tiers.${tierIndex}._error`, {
              message: t('error.noMembers'),
            })
          }
          valid = false
        } else if (errors?.creator?.data?.tiers?.[tierIndex]?._error) {
          clearErrors(`creator.data.tiers.${tierIndex}._error`)
        }
      })

      return valid
    },
    [
      clearErrors,
      data.tiers,
      errors?.creator?.data?._tiersError,
      errors?.creator?.data?.tiers,
      setError,
      t,
    ]
  )
  // Update with function reference as needed.
  useEffect(() => {
    setCustomValidator(customValidator)
  }, [customValidator, setCustomValidator])

  //! Validate new governance token.
  const { initialTreasuryPercent, initialSupply } = data.newInfo
  const totalMemberPercent = data.tiers.reduce(
    (acc, { weight }) => acc + weight,
    0
  )
  const govTokenPercentsSumTo100 =
    initialTreasuryPercent + totalMemberPercent === 100

  const allowsNative =
    // default when unset
    !config.tokenDaoType ||
    config.tokenDaoType === TokenType.Native ||
    config.tokenDaoType === 'both'
  const allowsCw20 =
    config.tokenDaoType === TokenType.Cw20 || config.tokenDaoType === 'both'

  //! Validate existing governance token.
  const existingGovernanceTokenIsCw20 =
    allowsCw20 &&
    !!data.existingTokenDenomOrAddress &&
    isValidBech32Address(data.existingTokenDenomOrAddress, bech32Prefix)
  const existingGovernanceTokenIsNative =
    allowsNative &&
    !!data.existingTokenDenomOrAddress &&
    // Match CW20 contract addresses first, since native tokens typically do not
    // look like contract addresses.
    !existingGovernanceTokenIsCw20 &&
    isValidNativeTokenDenom(data.existingTokenDenomOrAddress)
  const existingGovernanceTokenIsValid =
    existingGovernanceTokenIsNative || existingGovernanceTokenIsCw20

  const existingGovernanceTokenLoadable = useRecoilValueLoadable(
    existingGovernanceTokenIsValid
      ? genericTokenSelector({
          chainId,
          type: existingGovernanceTokenIsNative
            ? TokenType.Native
            : TokenType.Cw20,
          denomOrAddress: data.existingTokenDenomOrAddress,
        })
      : constSelector(undefined)
  )
  const existingGovernanceTokenSupply = useRecoilValueLoadable<
    TokenInfoResponse | number | undefined
  >(
    existingGovernanceTokenLoadable.state === 'hasValue' &&
      existingGovernanceTokenLoadable.contents
      ? existingGovernanceTokenIsNative
        ? nativeSupplySelector({
            chainId,
            denom: data.existingTokenDenomOrAddress,
          })
        : Cw20BaseSelectors.tokenInfoSelector({
            chainId,
            contractAddress: data.existingTokenDenomOrAddress,
            params: [],
          })
      : constSelector(undefined)
  )
  useEffect(() => {
    setValue(
      'creator.data.existingToken',
      existingGovernanceTokenLoadable.state === 'hasValue'
        ? existingGovernanceTokenLoadable.contents
        : undefined
    )

    // Update token type if token is loaded.
    const tokenType = existingGovernanceTokenLoadable.valueMaybe()?.type
    if (tokenType) {
      setValue('creator.data.selectedTokenType', tokenType)
    }

    const existingTokenSupply =
      existingGovernanceTokenSupply.state === 'hasValue'
        ? typeof existingGovernanceTokenSupply.contents === 'number'
          ? HugeDecimal.from(existingGovernanceTokenSupply.contents).toString()
          : existingGovernanceTokenSupply.contents?.total_supply
        : undefined
    setValue('creator.data.existingTokenSupply', existingTokenSupply)

    const tokenErrored = existingGovernanceTokenLoadable.state === 'hasError'
    const supplyErrored = existingGovernanceTokenSupply.state === 'hasError'

    if (
      !tokenErrored &&
      !supplyErrored &&
      (!existingTokenSupply || existingTokenSupply !== '0')
    ) {
      if (errors?.creator?.data?.existingToken?._error) {
        clearErrors('creator.data.existingToken._error')
      }
      return
    }

    if (!errors?.creator?.data?.existingToken?._error) {
      setError('creator.data.existingToken._error', {
        type: 'manual',
        message:
          tokenErrored || supplyErrored
            ? existingGovernanceTokenIsNative
              ? t('error.failedToGetFactoryTokenInfo')
              : t('error.failedToGetTokenInfo', {
                  tokenType: 'CW20',
                })
            : t('error.noTokenSupply'),
      })
    }
  }, [
    clearErrors,
    errors?.creator?.data?.existingToken?._error,
    existingGovernanceTokenLoadable,
    setError,
    setValue,
    t,
    existingGovernanceTokenSupply,
    existingGovernanceTokenIsNative,
  ])

  //! Bar chart data

  const barData: VotingPowerDistributionEntry[] = [
    ...(tierFields.length === 1
      ? // Displaying each member of the first tier as separate pie wedges.
        data.tiers[0].members.map(({ address }, memberIndex) => ({
          address: address.trim(),
          // Backup if address is empty.
          label: t('form.membersAddress'),
          // Governance token-based DAO tier weights are split amongst members.
          votingPowerPercent:
            data.tiers[0].weight / data.tiers[0].members.length,
          color: DISTRIBUTION_COLORS[memberIndex % DISTRIBUTION_COLORS.length],
        }))
      : // Displaying entire tier as one pie wedge.
        data.tiers.map(({ name, weight }, tierIndex) => ({
          label: name.trim() || t('title.tierNum', { tier: tierIndex + 1 }),
          // Governance token-based DAO tier weights are split amongst members.
          votingPowerPercent: weight,
          color: DISTRIBUTION_COLORS[tierIndex % DISTRIBUTION_COLORS.length],
        }))),
    {
      label: t('title.treasury'),
      color: 'var(--text-interactive-disabled)',
      section: 2,
      votingPowerPercent: data.newInfo.initialTreasuryPercent,
    },
  ]

  const imageUrl = watch('creator.data.newInfo.imageUrl')
  const metadataUrl = watch('creator.data.newInfo.metadataUrl')
  const metadataUrlImageUrl = watch('creator.data.newInfo.metadataUrlImageUrl')
  useEffect(() => {
    if (
      !imageUrl ||
      !isValidUrl(imageUrl, true) ||
      // if metadata URL set and valid, make sure it's for the right image
      (metadataUrl &&
        isValidUrl(imageUrl, true) &&
        metadataUrlImageUrl === imageUrl)
    ) {
      return
    }

    const uploadImage = async () => {
      // Next.js API route.
      const response = await fetch('/api/uploadJson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageUrl }),
      })

      if (!response.ok) {
        const fallback = `Failed to upload image metadata. Status: ${response.status} ${response.statusText}. Please try again.`
        throw new Error(
          (await response.json().catch(() => ({ error: fallback })))?.error ||
            fallback
        )
      }

      const { cid } = await response.json()
      if (!cid) {
        throw new Error('Failed to upload image metadata. Please try again.')
      }

      setValue('creator.data.newInfo.metadataUrl', `ipfs://${cid}`)
      setValue('creator.data.newInfo.metadataUrlImageUrl', imageUrl)
    }

    // Check that imageUrl points to a valid image.
    fetch(transformIpfsUrlToHttpsIfNecessary(imageUrl)).then(async (res) => {
      if (!res.ok || !res.headers.get('content-type')?.includes('image')) {
        return
      }

      uploadImage().catch((e) => {
        console.error(e)
        toast.error(
          e instanceof Error
            ? e.message
            : 'Failed to upload image metadata. Please try again.'
        )
      })
    })
  }, [imageUrl, metadataUrl, metadataUrlImageUrl, setValue])

  return (
    <>
      <SegmentedControls
        className="mt-8 mb-4 w-max"
        onSelect={(tokenType) =>
          setValue('creator.data.govTokenType', tokenType)
        }
        selected={data.govTokenType}
        tabs={[
          {
            label: t('button.createAToken'),
            value: GovernanceTokenType.New,
            disabled:
              config.tokenCreationUnderDevelopment || config.noTokenFactory,
            tooltip: config.tokenCreationUnderDevelopment
              ? t('info.tokenCreationUnderDevelopment')
              : config.noTokenFactory
                ? t('info.tokenCreationNoTokenFactory')
                : undefined,
          },
          {
            label: t('button.useExistingToken'),
            value: GovernanceTokenType.Existing,
          },
        ]}
      />

      {data.govTokenType === GovernanceTokenType.New ? (
        <>
          <div className="mb-10 rounded-lg bg-background-tertiary">
            <div className="flex flex-row justify-between items-center flex-wrap gap-x-16 gap-y-4 border-b border-border-base p-4">
              <p className="primary-text text-text-body">
                {t('form.tokenDefinition')}
              </p>

              {config.tokenDaoType === 'both' && (
                <SegmentedControls
                  className="w-max"
                  onSelect={(type) =>
                    setValue('creator.data.selectedTokenType', type)
                  }
                  selected={data.selectedTokenType}
                  tabs={[
                    {
                      label: t('form.native'),
                      value: TokenType.Native,
                    },
                    {
                      label: 'CW20',
                      value: TokenType.Cw20,
                    },
                  ]}
                />
              )}
            </div>

            <div className="flex flex-col items-stretch sm:flex-row">
              <div className="flex flex-col items-stretch sm:flex-row">
                {/* TODO(tokenfactory-image): add back in once token factory  supports URI metadata */}
                {(data.selectedTokenType === TokenType.Cw20 || isBitsong) && (
                  <div className="flex flex-col items-center gap-5 border-b border-border-secondary py-6 px-10 sm:border-r sm:border-b-0">
                    <InputLabel name={t('form.image')} />
                    <ImageSelector
                      Trans={Trans}
                      error={errors.creator?.data?.newInfo?.imageUrl}
                      fieldName="creator.data.newInfo.imageUrl"
                      register={register}
                      setValue={setValue}
                      size={40}
                      watch={watch}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-5 border-b border-border-secondary py-6 px-8 sm:border-b-0 sm:border-r">
                  <InputLabel name={t('form.symbol')} />
                  <div className="flex flex-col">
                    <div className="flex flex-row items-center gap-2">
                      <p className="flex items-center justify-center rounded-full text-base text-text-tertiary">
                        $
                      </p>
                      <TextInput
                        error={errors.creator?.data?.newInfo?.symbol}
                        fieldName="creator.data.newInfo.symbol"
                        placeholder={t('form.governanceTokenSymbolPlaceholder')}
                        register={register}
                        validation={[validateRequired, validateTokenSymbol]}
                      />
                    </div>

                    <InputErrorMessage
                      error={errors.creator?.data?.newInfo?.symbol}
                    />
                  </div>
                </div>
              </div>
              <div className="flex grow flex-col gap-5 py-6 px-8">
                <InputLabel name={t('form.name')} />
                <div className="flex flex-col">
                  <TextInput
                    error={errors.creator?.data?.newInfo?.name}
                    fieldName="creator.data.newInfo.name"
                    placeholder={t('form.governanceTokenNamePlaceholder')}
                    register={register}
                    validation={[validateRequired]}
                  />
                  <InputErrorMessage
                    error={errors.creator?.data?.newInfo?.name}
                  />
                </div>
              </div>
            </div>

            {/* Max token supply for BitSong fantokens */}
            {isBitsong && (
              <div className="flex flex-col gap-6 border-t border-border-secondary py-7 px-6">
                <div className="flex flex-row items-center gap-6">
                  <p className="primary-text text-text-body">
                    {t('form.maxTokenSupply')}
                  </p>

                  <div className="flex grow flex-col">
                    <div className="flex grow flex-row items-center gap-2">
                      <NumericInput
                        className="symbol-small-body-text font-mono leading-5 text-text-secondary"
                        containerClassName="grow"
                        error={errors.creator?.data?.newInfo?.maxSupply}
                        fieldName="creator.data.newInfo.maxSupply"
                        ghost
                        min={data.newInfo.initialSupply}
                        register={register}
                        step={HugeDecimal.one.toHumanReadableNumber(
                          NEW_DAO_TOKEN_DECIMALS
                        )}
                        validation={[
                          validatePositive,
                          validateRequired,
                          (maxSupply) =>
                            HugeDecimal.from(maxSupply || 0).gte(
                              data.newInfo.initialSupply
                            ) || t('error.maxSupplyMustBeAtLeastInitialSupply'),
                        ]}
                      />
                      <p className="symbol-small-body-text font-mono leading-5 text-text-tertiary">
                        $
                        {data.newInfo.symbol.trim() ||
                          t('info.token').toLocaleUpperCase()}
                      </p>
                    </div>

                    <InputErrorMessage
                      className="self-end"
                      error={errors.creator?.data?.newInfo?.maxSupply}
                    />
                  </div>
                </div>

                <p className="secondary-text">
                  {t('info.maxTokenSupplyDescription')}
                </p>
              </div>
            )}

            <div className="flex flex-row items-center gap-6 border-t border-border-secondary py-7 px-6">
              <p className="primary-text text-text-body">
                {t('form.initialTokenSupply')}
              </p>

              <div className="flex grow flex-col">
                <div className="flex grow flex-row items-center gap-2">
                  <NumericInput
                    className="symbol-small-body-text font-mono leading-5 text-text-secondary"
                    containerClassName="grow"
                    error={errors.creator?.data?.newInfo?.initialSupply}
                    fieldName="creator.data.newInfo.initialSupply"
                    ghost
                    register={register}
                    step={HugeDecimal.one.toHumanReadableNumber(
                      NEW_DAO_TOKEN_DECIMALS
                    )}
                    validation={[validatePositive, validateRequired]}
                  />
                  <p className="symbol-small-body-text font-mono leading-5 text-text-tertiary">
                    $
                    {data.newInfo.symbol.trim() ||
                      t('info.token').toLocaleUpperCase()}
                  </p>
                </div>

                <InputErrorMessage
                  className="self-end"
                  error={errors.creator?.data?.newInfo?.initialSupply}
                />
              </div>
            </div>

            <div className="flex flex-col gap-6 py-7 px-6 border-t border-border-secondary">
              <div className="flex flex-row items-center gap-6">
                <p className="primary-text text-text-body">
                  {t('info.treasuryPercent')}
                </p>

                <div className="flex grow flex-col">
                  <div className="flex grow flex-row items-center gap-2">
                    <NumericInput
                      className="symbol-small-body-text font-mono leading-5 text-text-secondary"
                      containerClassName="grow"
                      error={
                        errors.creator?.data?.newInfo?.initialTreasuryPercent
                      }
                      fieldName="creator.data.newInfo.initialTreasuryPercent"
                      ghost
                      max={100}
                      min={0}
                      numericValue
                      register={register}
                      step={0.0001}
                      validation={[
                        validatePercent,
                        validateRequired,
                        // Error displayed in place of description.
                        () => govTokenPercentsSumTo100,
                      ]}
                    />

                    <p className="symbol-small-body-text font-mono leading-5 text-text-tertiary">
                      %
                    </p>
                  </div>

                  <InputErrorMessage
                    className="self-end"
                    error={errors.creator?.data?.newInfo?.initialSupply}
                  />
                </div>
              </div>

              <p
                className={clsx(
                  'secondary-text',
                  !govTokenPercentsSumTo100 && 'text-text-interactive-error'
                )}
              >
                {govTokenPercentsSumTo100
                  ? t('info.treasuryBalanceDescription', {
                      numberOfTokensMinted: initialSupply,
                      memberPercent: formatPercentOf100(totalMemberPercent),
                      treasuryPercent: formatPercentOf100(
                        initialTreasuryPercent
                      ),
                    })
                  : t('error.govTokenBalancesDoNotSumTo100', {
                      totalPercent: formatPercentOf100(
                        initialTreasuryPercent + totalMemberPercent
                      ),
                    })}
              </p>
            </div>
          </div>

          <p className="title-text mb-8">
            {t('title.initialTokenDistribution')}
          </p>

          <VotingPowerDistribution
            key={tierFields.length === 1 ? 'member' : 'tier'}
            // Force re-render when switching between tier-view and member-view.
            EntityDisplay={EntityDisplay}
            className="mb-6"
            data={barData}
          />

          <div className="flex flex-col items-stretch gap-4">
            {tierFields.map(({ id }, idx) => (
              <TierCard
                key={id}
                control={control}
                data={data}
                errors={errors}
                getValues={getValues}
                register={register}
                remove={
                  tierFields.length === 1 ? undefined : () => removeTier(idx)
                }
                setValue={setValue}
                showColorDotOnMember={tierFields.length === 1}
                tierIndex={idx}
                watch={watch}
              />
            ))}

            <div className="flex flex-col">
              <Button
                className="self-start"
                onClick={addTier}
                ref={addTierRef}
                variant="secondary"
              >
                <Add className="!h-6 !w-6 text-icon-primary" />
                <p>{t('button.addTier')}</p>
              </Button>

              <InputErrorMessage error={errors.creator?.data?._tiersError} />
            </div>
          </div>
        </>
      ) : data.govTokenType === GovernanceTokenType.Existing ? (
        <div className="rounded-lg bg-background-tertiary">
          <div className="flex h-14 flex-row items-center border-b border-border-base p-4">
            <p className="primary-text text-text-body">
              {t('form.tokenIdentifier')}
            </p>
          </div>

          <div className="space-y-2 p-4">
            <div>
              <TextInput
                className="symbol-small-body-text font-mono text-text-secondary"
                error={errors.creator?.data?.existingTokenDenomOrAddress}
                fieldName="creator.data.existingTokenDenomOrAddress"
                ghost
                placeholder={humanReadableList(
                  [
                    // eslint-disable-next-line i18next/no-literal-string
                    ...(allowsNative ? ['denom', 'ibc/HASH'] : []),
                    ...(allowsCw20 ? [bech32Prefix + '...'] : []),
                  ],
                  'OR'
                )}
                register={register}
                validation={[
                  validateRequired,
                  (value) => {
                    let validation = ''
                    if (allowsCw20) {
                      const v = makeValidateAddress(bech32Prefix)(value)
                      if (v === true) {
                        return true
                      }
                      validation = v
                    }
                    if (allowsNative) {
                      const v = validateNativeTokenDenom(value)
                      if (v === true) {
                        return true
                      }
                      // Concat both validation error strings if present.
                      validation = `${validation} ${v}`.trim()
                    }
                    return validation || 'Invalid token identifier.'
                  },
                ]}
              />
              <InputErrorMessage
                error={
                  errors.creator?.data?.existingTokenDenomOrAddress ||
                  errors.creator?.data?.existingToken?._error
                }
              />
            </div>

            {existingGovernanceTokenLoadable.state === 'loading' ? (
              <Loader />
            ) : existingGovernanceTokenLoadable.state === 'hasValue' ? (
              <p className="primary-text text-text-interactive-valid">
                ${existingGovernanceTokenLoadable.valueMaybe()?.symbol}
              </p>
            ) : (
              <InputErrorMessage
                error={existingGovernanceTokenLoadable.errorMaybe()}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
