import { useEffect, useState } from 'react'
import { UseFormWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import { genericTokenSelector } from '@dao-dao/state/recoil'
import {
  GovernanceTokenType,
  CreatorData as TokenBasedCreatorData,
} from '@dao-dao/stateful/creators/TokenBased/types'
import {
  AddressInput,
  FormSwitchCard,
  InputErrorMessage,
  InputLabel,
  Loader,
  MoneyEmoji,
  SelectInput,
  TokenInput,
  useCachedLoadable,
  useChainContext,
} from '@dao-dao/stateless'
import {
  DaoCreationVotingConfigItem,
  DaoCreationVotingConfigItemInputProps,
  DaoCreationVotingConfigItemReviewProps,
  DaoCreationVotingConfigWithProposalDeposit,
  DepositRefundPolicy,
  GenericToken,
  TokenInputOption,
  TokenType,
} from '@dao-dao/types'
import {
  NEW_DAO_TOKEN_DECIMALS,
  TokenBasedCreatorId,
  getChainAssets,
  isValidBech32Address,
  makeValidateAddress,
} from '@dao-dao/utils'

const DepositRefundPolicyValues = Object.values(DepositRefundPolicy)

const ProposalDepositInput = ({
  newDao: { creator },
  data: {
    proposalDeposit: { enabled, type, denomOrAddress, token },
  },
  register,
  setValue,
  getValues,
  watch,
  errors,
}: DaoCreationVotingConfigItemInputProps<DaoCreationVotingConfigWithProposalDeposit>) => {
  const { t } = useTranslation()
  const {
    chain: { chainId, bech32Prefix },
    nativeToken,
  } = useChainContext()

  const isTokenBasedCreator = creator.id === TokenBasedCreatorId
  const tokenBasedCreatorData = creator.data as TokenBasedCreatorData

  const governanceTokenLoadable = useRecoilValueLoadable<
    GenericToken | undefined
  >(
    isTokenBasedCreator
      ? tokenBasedCreatorData.govTokenType === GovernanceTokenType.New
        ? constSelector({
            chainId,
            type: TokenType.Cw20,
            denomOrAddress: '',
            symbol: tokenBasedCreatorData.newInfo.symbol,
            decimals: NEW_DAO_TOKEN_DECIMALS,
            imageUrl: tokenBasedCreatorData.newInfo.imageUrl,
            source: {
              chainId,
              type: TokenType.Cw20,
              denomOrAddress: 'NEW_CW20',
            },
          })
        : constSelector(tokenBasedCreatorData.existingToken)
      : constSelector(undefined)
  )

  const tokenLoadable = useCachedLoadable(
    type === 'cw20' &&
      denomOrAddress &&
      isValidBech32Address(denomOrAddress, bech32Prefix)
      ? genericTokenSelector({
          chainId,
          type: TokenType.Cw20,
          denomOrAddress,
        })
      : type === 'native'
        ? genericTokenSelector({
            chainId,
            type: TokenType.Native,
            denomOrAddress,
          })
        : type === 'voting_module_token'
          ? governanceTokenLoadable.state === 'hasValue'
            ? constSelector(governanceTokenLoadable.contents)
            : constSelector(undefined)
          : constSelector(undefined)
  )
  const tokenLoaded =
    tokenLoadable.state === 'hasValue' ? tokenLoadable.contents : undefined

  // Update token and cw20 address error.
  const [cw20AddressError, setCw20AddressError] = useState<string>()
  useEffect(() => {
    // Update token info so we can use symbol and decimals later.
    if (
      tokenLoadable.state === 'hasValue' &&
      token !== tokenLoadable.contents
    ) {
      setValue('proposalDeposit.token', tokenLoadable.contents)
    }

    if (tokenLoadable.state !== 'hasError' || type !== 'cw20') {
      if (cw20AddressError) {
        setCw20AddressError(undefined)
      }
      return
    }

    if (!cw20AddressError && type === 'cw20') {
      setCw20AddressError(t('error.notCw20Address'))
    }
  }, [
    tokenLoadable.state,
    tokenLoadable.contents,
    setValue,
    t,
    cw20AddressError,
    token,
    type,
  ])

  const availableTokens: TokenInputOption[] = [
    // Governance token first.
    ...(isTokenBasedCreator &&
    governanceTokenLoadable.state === 'hasValue' &&
    !!governanceTokenLoadable.contents
      ? [
          {
            ...governanceTokenLoadable.contents,
            type:
              governanceTokenLoadable.contents.type === TokenType.Cw20
                ? // Only works for cw20.
                  'voting_module_token'
                : TokenType.Native,
            denomOrAddress:
              governanceTokenLoadable.contents.type === TokenType.Cw20
                ? // Only works for cw20.
                  'voting_module_token'
                : governanceTokenLoadable.contents.denomOrAddress,
            decimals: governanceTokenLoadable.contents.decimals,
            description: t('title.governanceToken'),
          },
        ]
      : []),
    // Then native.
    ...(nativeToken ? [nativeToken] : []),
    // Then other CW20.
    {
      chainId,
      type: TokenType.Cw20,
      denomOrAddress: 'other_cw20',
      decimals: tokenLoaded?.decimals ?? 0,
      symbol:
        (type === TokenType.Cw20 && tokenLoaded?.symbol) || t('form.cw20Token'),
      imageUrl: (type === TokenType.Cw20 && tokenLoaded?.imageUrl) || undefined,
      source: {
        chainId,
        type: TokenType.Cw20,
        denomOrAddress: 'other_cw20',
      },
    },
    // Then the chain assets.
    ...getChainAssets(chainId).filter(
      ({ denomOrAddress }) => denomOrAddress !== nativeToken?.denomOrAddress
    ),
  ]
  const selectedToken = availableTokens.find(
    (token) =>
      // `voting_module_token` and `cw20` only correspond to one token above.
      // `native` can be multiple, so match on denom.
      token.type === type &&
      (type !== TokenType.Native || token.denomOrAddress === denomOrAddress)
  )

  return (
    <div className="flex flex-col gap-2">
      <FormSwitchCard
        fieldName="proposalDeposit.enabled"
        setValue={setValue}
        sizing="sm"
        value={enabled}
      />

      {enabled && (
        <>
          <div className="space-y-1">
            <TokenInput
              amount={{
                watch:
                  watch as UseFormWatch<DaoCreationVotingConfigWithProposalDeposit>,
                setValue,
                getValues,
                register,
                fieldName: 'proposalDeposit.amount',
                error: errors?.proposalDeposit?.amount,
                step: HugeDecimal.one.toHumanReadableNumber(
                  tokenLoaded?.decimals ?? 0
                ),
              }}
              onSelectToken={({ type, denomOrAddress }) => {
                // Type-check, should never happen.
                if (
                  type !== 'voting_module_token' &&
                  type !== TokenType.Native &&
                  type !== TokenType.Cw20
                ) {
                  return
                }

                setValue('proposalDeposit.type', type)

                if (type === TokenType.Native) {
                  setValue('proposalDeposit.denomOrAddress', denomOrAddress)
                } else {
                  // `voting_module_token` doesn't need one set, and cw20 shows
                  // an address input, so clear for both.
                  setValue('proposalDeposit.denomOrAddress', '')
                }
              }}
              required={false}
              selectedToken={selectedToken}
              tokenFallback={
                type === 'cw20'
                  ? !isValidBech32Address(denomOrAddress, bech32Prefix)
                    ? t('form.cw20Token')
                    : tokenLoadable.state === 'loading' && <Loader size={24} />
                  : undefined
              }
              tokens={{ loading: false, data: availableTokens }}
            />

            <InputErrorMessage error={errors?.proposalDeposit?.amount} />
          </div>

          {type === 'cw20' && (
            <div className="flex flex-col gap-1">
              <AddressInput
                error={
                  errors?.proposalDeposit?.denomOrAddress ?? cw20AddressError
                }
                fieldName="proposalDeposit.denomOrAddress"
                placeholder={t('form.tokenAddress')}
                register={register}
                type="contract"
                validation={[makeValidateAddress(bech32Prefix)]}
              />

              <InputErrorMessage
                error={
                  errors?.proposalDeposit?.denomOrAddress ??
                  (cw20AddressError
                    ? { type: 'validate', message: cw20AddressError }
                    : undefined)
                }
              />
            </div>
          )}

          <InputLabel className="mt-1" name={t('form.refundPolicyTitle')} />
          <SelectInput
            error={errors?.proposalDeposit?.refundPolicy}
            fieldName="proposalDeposit.refundPolicy"
            register={register}
          >
            {DepositRefundPolicyValues.map((depositRefundPolicy) => (
              <option key={depositRefundPolicy} value={depositRefundPolicy}>
                {t(`depositRefundPolicy.${depositRefundPolicy}`)}
              </option>
            ))}
          </SelectInput>
        </>
      )}
    </div>
  )
}

const ProposalDepositReview = ({
  data: {
    proposalDeposit: { enabled, amount, token },
  },
}: DaoCreationVotingConfigItemReviewProps<DaoCreationVotingConfigWithProposalDeposit>) => {
  const { t } = useTranslation()

  const decimals = token?.decimals ?? 0
  const symbol = token?.symbol || t('info.tokens')

  return !enabled ? (
    <>{t('info.none')}</>
  ) : (
    <>
      {t('format.token', {
        amount: HugeDecimal.fromHumanReadable(
          amount,
          decimals
        ).toInternationalizedHumanReadableString({
          decimals,
        }),
        symbol,
      })}
    </>
  )
}

export const makeProposalDepositVotingConfigItem =
  (): DaoCreationVotingConfigItem<DaoCreationVotingConfigWithProposalDeposit> => ({
    Icon: MoneyEmoji,
    nameI18nKey: 'form.proposalDepositTitle',
    descriptionI18nKey: 'form.proposalDepositDescription',
    tooltipI18nKey: 'info.proposalDepositTooltip',
    Input: ProposalDepositInput,
    getInputError: () => undefined,
    Review: ProposalDepositReview,
  })
