import clsx from 'clsx'
import { TFunction } from 'next-i18next'
import { ComponentType, useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  InputErrorMessage,
  InputLabel,
  NumericInput,
  SelectInput,
  TokenAmountDisplay,
  ValidatorPicker,
  useChainContext,
} from '@dao-dao/stateless'
import { AddressInputProps, TokenStake, Validator } from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import {
  StakingActionType,
  isValidValidatorAddress,
  makeValidateAddress,
  makeValidateValidatorAddress,
  secondsToWdhms,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

export const getStakeActions = (
  t: TFunction
): {
  type: StakingActionType
  name: string
}[] => [
  {
    type: StakingActionType.Delegate,
    name: t('title.stake'),
  },
  {
    type: StakingActionType.Undelegate,
    name: t('title.unstake'),
  },
  {
    type: StakingActionType.Redelegate,
    name: t('title.restake'),
  },
  {
    type: StakingActionType.WithdrawDelegatorReward,
    name: t('title.claimRewards'),
  },
  {
    type: StakingActionType.SetWithdrawAddress,
    name: t('title.setWithdrawAddress'),
  },
]

export type ManageStakingOptions = {
  nativeBalance: string
  stakes: TokenStake[]
  validators: Validator[]
  executed: boolean
  claimedRewards?: HugeDecimal
  nativeUnstakingDurationSeconds: number
  AddressInput: ComponentType<AddressInputProps<ManageStakingData>>
}

export type ManageStakingData = {
  chainId: string
  type: StakingActionType
  validator: string
  // For use when redelegating.
  toValidator: string
  // For use when setting withdraw address.
  withdrawAddress: string
  amount: string

  _error?: string
}

export const ManageStakingComponent: ActionComponent<
  ManageStakingOptions,
  ManageStakingData
> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: {
    nativeBalance,
    stakes,
    validators,
    executed,
    claimedRewards,
    nativeUnstakingDurationSeconds,
    AddressInput,
  },
}) => {
  const { t } = useTranslation()

  const { register, watch, setError, clearErrors, setValue, getValues } =
    useFormContext<ManageStakingData>()
  const stakeActions = getStakeActions(t)

  const stakedValidatorAddresses = new Set(
    stakes.map((s) => s.validator.address)
  )

  const type = watch((fieldNamePrefix + 'type') as 'type')
  const validator = watch((fieldNamePrefix + 'validator') as 'validator')
  // For use when redelegating.
  const toValidator = watch((fieldNamePrefix + 'toValidator') as 'toValidator')
  const amount = watch((fieldNamePrefix + 'amount') as 'amount')

  const selectedAction = stakeActions.find((a) => a.type === type)

  const {
    chain: { bech32Prefix },
    nativeToken,
  } = useChainContext()

  if (!nativeToken) {
    throw new Error(t('error.missingNativeToken'))
  }

  // Metadata for the given denom.
  const minAmount = HugeDecimal.one.toHumanReadableNumber(nativeToken.decimals)

  // Get how much is staked and pending for the selected validator.
  const sourceValidatorStaked =
    (isValidValidatorAddress(validator, bech32Prefix) &&
      stakes.find(({ validator: { address } }) => address === validator)
        ?.amount) ||
    HugeDecimal.zero
  const sourceValidatorPendingRewards =
    (isValidValidatorAddress(validator, bech32Prefix) &&
      stakes.find(({ validator: { address } }) => address === validator)
        ?.rewards) ||
    HugeDecimal.zero

  // If staking, maxAmount is denom treasury balance. Otherwise (for
  // undelegating and redelegating), maxAmount is the staked amount for the
  // source validator.
  const maxAmount =
    type === StakingActionType.Delegate
      ? HugeDecimal.from(nativeBalance)
      : sourceValidatorStaked

  // Manually validate based on context.
  const validate = useCallback((): string | boolean => {
    // No validation for setting withdraw address.
    if (type === StakingActionType.SetWithdrawAddress) {
      return true
    }

    if (!validator) {
      return t('error.noValidatorFound')
    }

    // Validate validator address.
    const validateValidator =
      makeValidateValidatorAddress(bech32Prefix)(validator)
    if (typeof validateValidator === 'string') {
      return validateValidator
    }

    if (
      // Don't validate max stakable amount, instead showing the warning defined
      // below all this. This lets users spend funds that are made available by
      // previous actions in the same transaction.
      type === StakingActionType.Delegate ||
      // No further validation for claiming rewards.
      type === StakingActionType.WithdrawDelegatorReward
    ) {
      return true
    }

    // Logic for undelegating.
    if (type === StakingActionType.Undelegate) {
      return (
        sourceValidatorStaked
          .toHumanReadable(nativeToken.decimals)
          .gte(amount) ||
        (sourceValidatorStaked.isZero()
          ? t('error.nothingStaked')
          : t('error.stakeInsufficient', {
              amount: maxAmount.toInternationalizedHumanReadableString({
                decimals: nativeToken.decimals,
              }),
              tokenSymbol: nativeToken.symbol,
            }))
      )
    }
    // Logic for redelegating.
    else if (type === StakingActionType.Redelegate) {
      // Validate toValidator address.
      if (!toValidator) {
        return t('error.noValidatorFound')
      }
      const validateToValidator =
        makeValidateValidatorAddress(bech32Prefix)(toValidator)
      if (typeof validateToValidator === 'string') {
        return validateToValidator
      }

      return (
        sourceValidatorStaked
          .toHumanReadable(nativeToken.decimals)
          .gte(amount) ||
        (sourceValidatorStaked.isZero()
          ? t('error.nothingStaked')
          : t('error.stakeInsufficient', {
              amount: maxAmount.toInternationalizedHumanReadableString({
                decimals: nativeToken.decimals,
              }),
              tokenSymbol: nativeToken.symbol,
            }))
      )
    }

    return t('error.unexpectedError')
  }, [
    validator,
    bech32Prefix,
    type,
    maxAmount,
    t,
    amount,
    nativeToken.symbol,
    nativeToken.decimals,
    sourceValidatorStaked,
    toValidator,
  ])

  // Perform validation.
  useEffect(() => {
    if (!amount && errors?._error) {
      clearErrors((fieldNamePrefix + '_error') as '_error')
      return
    }

    const validation = validate()
    if (validation === true && errors?._error) {
      clearErrors((fieldNamePrefix + '_error') as '_error')
    } else if (typeof validation === 'string' && !errors?._error) {
      setError((fieldNamePrefix + '_error') as '_error', {
        type: 'custom',
        message: validation,
      })
    }
  }, [setError, clearErrors, validate, fieldNamePrefix, amount, errors?._error])

  // A warning if the denom was not found in the treasury or the amount is too
  // high. We don't want to make this an error because often people want to
  // spend funds that a previous action makes available, so just show a warning.
  const delegateWarning =
    isCreating &&
    maxAmount.toHumanReadable(nativeToken.decimals).lt(amount) &&
    type === StakingActionType.Delegate
      ? t('error.insufficientFundsWarning', {
          amount: maxAmount.toInternationalizedHumanReadableString({
            decimals: nativeToken.decimals,
          }),
          tokenSymbol: nativeToken.symbol,
        })
      : undefined

  return (
    <>
      <div className="flex flex-col gap-2">
        <div
          className={clsx(
            'flex flex-col gap-2',
            // When creating, show in row. Otherwise, show in column since it
            // becomes a title instead of a select.
            isCreating && 'xs:flex-row'
          )}
        >
          {/* Choose type of stake operation. */}
          {isCreating ? (
            <SelectInput
              containerClassName={clsx(
                'shrink-0',
                type === StakingActionType.SetWithdrawAddress && 'grow'
              )}
              defaultValue={stakeActions[0].type}
              disabled={!isCreating}
              error={errors?.type}
              fieldName={(fieldNamePrefix + 'type') as 'type'}
              onChange={(value) => {
                // If setting to non-delegate stake type and currently set
                // validator is not one we are staked to, set back to first staked
                // validator in list.
                if (
                  value !== StakingActionType.Delegate &&
                  !stakedValidatorAddresses.has(validator)
                ) {
                  setValue(
                    (fieldNamePrefix + 'validator') as 'validator',
                    stakes.length > 0 ? stakes[0].validator.address : ''
                  )
                }
              }}
              register={register}
            >
              {stakeActions.map(({ name, type }, idx) => (
                <option key={idx} value={type}>
                  {name}
                </option>
              ))}
            </SelectInput>
          ) : (
            <p className="primary-text mb-1">
              {selectedAction?.name || t('info.unknown')}
            </p>
          )}

          {type !== StakingActionType.SetWithdrawAddress && (
            // Choose source validator.
            <ValidatorPicker
              displayClassName="grow min-w-0"
              onSelect={({ address }) =>
                setValue(
                  (fieldNamePrefix + 'validator') as 'validator',
                  address
                )
              }
              readOnly={!isCreating}
              selectedAddress={validator}
              stakes={stakes}
              token={nativeToken}
              validators={
                type === StakingActionType.Delegate
                  ? validators
                  : // If not delegating, source validator must be one we are staked with.
                    stakes.map(({ validator }) => validator)
              }
            />
          )}
        </div>

        {/* If not withdrawing reward or updating withdraw address, show amount input. */}
        {type !== StakingActionType.WithdrawDelegatorReward &&
          type !== StakingActionType.SetWithdrawAddress && (
            <NumericInput
              containerClassName="grow"
              disabled={!isCreating}
              error={errors?.amount}
              fieldName={(fieldNamePrefix + 'amount') as 'amount'}
              getValues={getValues}
              min={minAmount}
              register={register}
              setValue={setValue}
              step={minAmount}
              unit={'$' + nativeToken.symbol}
              validation={[validateRequired, validatePositive]}
            />
          )}
      </div>

      {type === StakingActionType.SetWithdrawAddress && (
        <div className="flex flex-col gap-1">
          <InputLabel name={t('form.withdrawAddress')} />
          <AddressInput
            disabled={!isCreating}
            error={errors?.withdrawAddress}
            fieldName={
              (fieldNamePrefix + 'withdrawAddress') as 'withdrawAddress'
            }
            register={register}
            validation={[makeValidateAddress(bech32Prefix)]}
          />
          <InputErrorMessage error={errors?.withdrawAddress} />
        </div>
      )}

      {type !== StakingActionType.SetWithdrawAddress &&
        (type !== StakingActionType.WithdrawDelegatorReward ||
          // If claiming rewards, show pending rewards if not executed, and
          // claimed rewards if executed.
          (executed && !!claimedRewards) ||
          (!executed && sourceValidatorPendingRewards.isPositive())) &&
        // Only show balance if creating.
        isCreating && (
          <div className="flex flex-row items-center gap-2">
            <p className="secondary-text font-semibold">
              {type === StakingActionType.Delegate
                ? t('title.balance')
                : type === StakingActionType.WithdrawDelegatorReward
                  ? executed
                    ? t('info.claimedRewards')
                    : t('info.pendingRewards')
                  : // type === StakingActionType.Undelegate || type === StakingActionType.Redelegate
                    t('title.staked')}
              :
            </p>

            <TokenAmountDisplay
              amount={
                type === StakingActionType.WithdrawDelegatorReward
                  ? executed
                    ? (claimedRewards ?? HugeDecimal.zero)
                    : sourceValidatorPendingRewards
                  : maxAmount
              }
              decimals={nativeToken.decimals}
              iconUrl={nativeToken.imageUrl}
              onClick={
                type !== StakingActionType.WithdrawDelegatorReward
                  ? () =>
                      setValue(
                        (fieldNamePrefix + 'amount') as 'amount',
                        maxAmount.toHumanReadableString(nativeToken.decimals)
                      )
                  : undefined
              }
              showFullAmount
              symbol={nativeToken.symbol}
            />
          </div>
        )}

      {type === StakingActionType.Undelegate && isCreating && (
        <p className="caption-text">
          {nativeUnstakingDurationSeconds
            ? t('info.unstakingDurationExplanation', {
                duration: secondsToWdhms(nativeUnstakingDurationSeconds),
              })
            : t('info.unstakingDurationNoneExplanation')}
        </p>
      )}

      {/* If redelegating, show selection for destination validator. */}
      {type === StakingActionType.Redelegate && (
        <div className="flex flex-col items-start gap-1">
          <InputLabel name={t('form.toValidator')} />
          <ValidatorPicker
            onSelect={({ address }) =>
              setValue(
                (fieldNamePrefix + 'toValidator') as 'toValidator',
                address
              )
            }
            readOnly={!isCreating}
            selectedAddress={toValidator}
            stakes={stakes}
            token={nativeToken}
            validators={validators}
          />
        </div>
      )}

      {isCreating &&
        (errors?.denom ||
          errors?.amount ||
          errors?._error ||
          delegateWarning) && (
          <div className="-mt-2 flex flex-col gap-1">
            <InputErrorMessage error={errors?.denom} />
            <InputErrorMessage error={errors?.amount} />
            <InputErrorMessage error={errors?._error} />
            <InputErrorMessage error={delegateWarning} warning />
          </div>
        )}
    </>
  )
}
