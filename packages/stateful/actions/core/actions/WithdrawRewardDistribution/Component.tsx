import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  DaoRewardDistributionPicker,
  InputErrorMessage,
  InputLabel,
  MarkdownRenderer,
  TokenAmountDisplay,
} from '@dao-dao/stateless'
import { DaoRewardDistributionWithRemaining } from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'

export type WithdrawRewardDistributionData = {
  address: string
  id: number
}

export type WithdrawRewardDistributionOptions = {
  /**
   * Existing reward distributions.
   */
  distributions: DaoRewardDistributionWithRemaining[]
}

export const WithdrawRewardDistributionComponent: ActionComponent<
  WithdrawRewardDistributionOptions
> = ({ fieldNamePrefix, isCreating, options: { distributions } }) => {
  const { t } = useTranslation()
  const { setValue, watch } = useFormContext<WithdrawRewardDistributionData>()

  const address = watch((fieldNamePrefix + 'address') as 'address')
  const id = watch((fieldNamePrefix + 'id') as 'id')

  const selectedDistribution = distributions.find(
    (distribution) => distribution.address === address && distribution.id === id
  )

  return (
    <>
      <MarkdownRenderer
        className="body-text text-text-secondary"
        markdown={t('info.withdrawRewardDistributionExplanation')}
      />

      <div className="flex flex-col gap-2 self-start">
        <InputLabel name={t('title.distribution')} primary />

        <DaoRewardDistributionPicker
          disabled={!isCreating}
          distributions={distributions}
          getDescription={(distribution) => (
            <TokenAmountDisplay
              amount={distribution.remaining}
              className="text-text-interactive-valid"
              decimals={distribution.token.decimals}
              suffix={' ' + t('info.remaining')}
              symbol={distribution.token.symbol}
            />
          )}
          onSelect={({ address, id }) => {
            setValue((fieldNamePrefix + 'address') as 'address', address)
            setValue((fieldNamePrefix + 'id') as 'id', id)
          }}
          selectButtonVariant={!address ? 'primary' : 'ghost_outline'}
          selectedDistribution={selectedDistribution}
        />

        {isCreating && selectedDistribution && (
          <p className="text-text-interactive-valid">
            {t('info.tokensWillBeWithdrawn', {
              amount: selectedDistribution.remaining.toFormattedString({
                decimals: selectedDistribution.token.decimals,
              }),
              tokenSymbol: selectedDistribution.token.symbol,
            })}
          </p>
        )}
      </div>

      {isCreating &&
        selectedDistribution &&
        'immediate' in selectedDistribution.active_epoch.emission_rate && (
          <InputErrorMessage
            className="!mt-0 max-w-prose"
            error={t('info.cannotWithdrawImmediateRewardDistribution')}
          />
        )}
    </>
  )
}
