import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  InputErrorMessage,
  InputLabel,
  TokenInput,
  useActionOptions,
} from '@dao-dao/stateless'
import { ActionComponent } from '@dao-dao/types'
import {
  isValidBech32Address,
  makeValidateAddress,
  validateRequired,
} from '@dao-dao/utils'

import { InstantiateTokenSwapOptions } from '../types'

// Form displayed when the user is instantiating a new token swap.
export const InstantiateTokenSwap: ActionComponent<
  InstantiateTokenSwapOptions
> = ({
  fieldNamePrefix,
  errors,
  options: {
    selfPartyTokenBalances,
    counterpartyTokenBalances,
    onInstantiate,
    instantiating,
    AddressInput,
    Trans,
  },
}) => {
  const { t } = useTranslation()
  const {
    chain: { bech32Prefix },
  } = useActionOptions()
  const { register, watch, setValue, getValues, trigger } = useFormContext()

  const selfParty = watch(fieldNamePrefix + 'selfParty')
  const counterparty = watch(fieldNamePrefix + 'counterparty')

  const selfToken = selfPartyTokenBalances.find(
    ({ token }) => selfParty.denomOrAddress === token.denomOrAddress
  )
  const selfDecimals = selfToken?.token.decimals ?? 0
  const selfMax = HugeDecimal.from(selfToken?.balance ?? 0)
  const selfSymbol = selfToken?.token.symbol ?? t('info.tokens')

  const counterpartyToken = counterpartyTokenBalances.loading
    ? undefined
    : counterpartyTokenBalances.data.find(
        ({ token }) => counterparty.denomOrAddress === token.denomOrAddress
      )
  const counterpartyDecimals = counterpartyToken?.token.decimals ?? 0
  const counterpartyMax = HugeDecimal.from(counterpartyToken?.balance ?? 0)
  const counterpartySymbol = counterpartyToken?.token.symbol ?? t('info.tokens')

  const counterpartyAddressValid =
    !!counterparty.address &&
    isValidBech32Address(counterparty.address, bech32Prefix)

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose">
        <Trans i18nKey="form.tokenSwapCreateInstructions">
          In this step, you will create the token swap. This creation step
          describes how many funds each party needs to send for the swap to
          complete.{' '}
          <span className="font-bold underline">
            No funds will be transferred at this time.
          </span>
        </Trans>
      </p>

      <div className="space-y-2">
        <InputLabel name={t('form.whoIsCounterparty')} />

        <AddressInput
          error={errors?.counterparty?.address}
          fieldName={fieldNamePrefix + 'counterparty.address'}
          register={register}
          validation={[validateRequired, makeValidateAddress(bech32Prefix)]}
        />

        <InputErrorMessage error={errors?.counterparty?.address} />
      </div>

      <div className="space-y-2">
        <InputLabel>
          <Trans i18nKey="form.whatReceiveCounterpartyQuestion">
            What do you need to{' '}
            <span className="font-bold underline">receive</span> from the
            counterparty for the token swap to complete?
          </Trans>
        </InputLabel>

        {/* Allow to enter value for counterparty greater than what they currently have in the treasury, since they could accept it at a future time when they do have the amount. In other words, don't set a max. */}
        <TokenInput
          amount={{
            watch,
            setValue,
            getValues,
            register,
            fieldName: fieldNamePrefix + 'counterparty.amount',
            error: errors?.counterparty?.amount,
            min: HugeDecimal.one.toHumanReadableNumber(counterpartyDecimals),
            step: HugeDecimal.one.toHumanReadableNumber(counterpartyDecimals),
          }}
          disabled={!counterpartyAddressValid}
          onSelectToken={({ type, denomOrAddress, decimals }) => {
            // Update type, denomOrAddress, and decimals.
            setValue(fieldNamePrefix + 'counterparty.type', type)
            setValue(
              fieldNamePrefix + 'counterparty.denomOrAddress',
              denomOrAddress
            )
            setValue(fieldNamePrefix + 'counterparty.decimals', decimals)
          }}
          selectedToken={counterpartyToken?.token}
          tokens={
            // Don't load when counterparty address is not yet valid, because
            // these will be perpetually loading until the address is entered.
            !counterpartyAddressValid
              ? { loading: false, data: [] }
              : counterpartyTokenBalances.loading
                ? { loading: true }
                : {
                    loading: false,
                    data: counterpartyTokenBalances.data.map(
                      ({ token }) => token
                    ),
                  }
          }
        />

        {/* Warn if counterparty does not have the requested amount. */}
        {counterpartyMax
          .toHumanReadable(counterpartyDecimals)
          .lt(counterparty.amount) && (
          <p className="caption-text text-text-interactive-warning-body">
            {t('error.counterpartyBalanceInsufficient', {
              amount: counterpartyMax.toInternationalizedHumanReadableString({
                decimals: counterpartyDecimals,
              }),
              tokenSymbol: counterpartySymbol,
            })}
          </p>
        )}

        <InputErrorMessage error={errors?.counterparty?.amount} />
        <InputErrorMessage error={errors?.counterparty?.denomOrAddress} />
      </div>

      <div className="space-y-2">
        <InputLabel>
          <Trans i18nKey="form.whatSendCounterpartyQuestion">
            What do you need to{' '}
            <span className="font-bold underline">send</span> to the
            counterparty for the token swap to complete?
          </Trans>
        </InputLabel>

        <TokenInput
          amount={{
            watch,
            setValue,
            getValues,
            register,
            fieldName: fieldNamePrefix + 'selfParty.amount',
            error: errors?.selfParty?.amount,
            min: HugeDecimal.one.toHumanReadableNumber(selfDecimals),
            step: HugeDecimal.one.toHumanReadableNumber(selfDecimals),
            max: selfMax.toHumanReadableString(selfDecimals),
            validations: [
              (value) =>
                selfMax.toHumanReadable(selfDecimals).gte(value) ||
                t('error.treasuryInsufficient', {
                  amount: selfMax.toInternationalizedHumanReadableString({
                    decimals: selfDecimals,
                  }),
                  tokenSymbol: selfSymbol,
                }),
            ],
          }}
          onSelectToken={({ type, denomOrAddress, decimals }) => {
            // Update type, denomOrAddress, and decimals.
            setValue(fieldNamePrefix + 'selfParty.type', type)
            setValue(
              fieldNamePrefix + 'selfParty.denomOrAddress',
              denomOrAddress
            )
            setValue(fieldNamePrefix + 'selfParty.decimals', decimals)
          }}
          selectedToken={selfToken?.token}
          tokens={{
            loading: false,
            data: selfPartyTokenBalances.map(({ token }) => token),
          }}
        />

        <InputErrorMessage error={errors?.selfParty?.amount} />
        <InputErrorMessage error={errors?.selfParty?.denomOrAddress} />
      </div>

      <Button
        className="self-end"
        loading={instantiating}
        onClick={async () => {
          // Manually validate just the instantiation fields.
          const valid = await trigger([
            fieldNamePrefix + 'selfParty',
            fieldNamePrefix + 'counterparty',
          ])
          valid && onInstantiate()
        }}
        size="lg"
      >
        {t('button.create')}
      </Button>
    </div>
  )
}
