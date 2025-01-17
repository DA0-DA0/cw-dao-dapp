import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  DaoRewardDistributionPicker,
  InputErrorMessage,
  InputLabel,
  MarkdownRenderer,
  NumericInput,
  SegmentedControls,
  SelectInput,
  StatusCard,
  SwitchCard,
} from '@dao-dao/stateless'
import {
  DaoRewardDistribution,
  DurationUnitsValues,
  DurationWithUnits,
  TokenType,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import {
  convertDurationToDurationWithUnits,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

export type UpdateRewardDistributionData = {
  address: string
  id: number
  immediate: boolean
  rate: {
    amount: string
    duration: DurationWithUnits
  }
  openFunding?: boolean | null
}

export type UpdateRewardDistributionOptions = {
  /**
   * Existing reward distributions.
   */
  distributions: DaoRewardDistribution[]
}

export const UpdateRewardDistributionComponent: ActionComponent<
  UpdateRewardDistributionOptions
> = ({ fieldNamePrefix, errors, isCreating, options: { distributions } }) => {
  const { t } = useTranslation()
  const { register, setValue, getValues, watch } =
    useFormContext<UpdateRewardDistributionData>()

  const address = watch((fieldNamePrefix + 'address') as 'address')
  const id = watch((fieldNamePrefix + 'id') as 'id')
  const immediate = watch((fieldNamePrefix + 'immediate') as 'immediate')
  const rateDuration = watch(
    (fieldNamePrefix + 'rate.duration') as 'rate.duration'
  )
  const openFunding = watch((fieldNamePrefix + 'openFunding') as 'openFunding')

  const selectedDistribution = distributions.find(
    (distribution) => distribution.address === address && distribution.id === id
  )

  const decimals = selectedDistribution?.token.decimals ?? 0

  return (
    <>
      <div className="flex flex-col gap-2 self-start">
        <InputLabel name={t('title.distribution')} primary />

        <DaoRewardDistributionPicker
          disabled={!isCreating}
          distributions={distributions}
          onSelect={({ address, id, active_epoch, token, open_funding }) => {
            setValue((fieldNamePrefix + 'address') as 'address', address)
            setValue((fieldNamePrefix + 'id') as 'id', id)
            setValue(
              (fieldNamePrefix + 'immediate') as 'immediate',
              'immediate' in active_epoch.emission_rate
            )
            if ('linear' in active_epoch.emission_rate) {
              setValue(
                (fieldNamePrefix + 'rate.amount') as 'rate.amount',
                HugeDecimal.from(
                  active_epoch.emission_rate.linear.amount
                ).toHumanReadableString(token.decimals)
              )
              setValue(
                (fieldNamePrefix + 'rate.duration') as 'rate.duration',
                convertDurationToDurationWithUnits(
                  active_epoch.emission_rate.linear.duration
                )
              )
            }
            setValue(
              (fieldNamePrefix + 'openFunding') as 'openFunding',
              open_funding
            )
          }}
          selectButtonVariant={!address ? 'primary' : 'ghost_outline'}
          selectedDistribution={selectedDistribution}
        />
      </div>

      {selectedDistribution && (
        <>
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

            {immediate && (
              <StatusCard
                className="max-w-prose"
                content={t('info.immediateDistributesAllFundedRewards')}
                style="warning"
              />
            )}

            {!immediate && (
              <div className="flex flex-wrap flex-row gap-x-4 gap-y-2 px-4 py-3 bg-background-tertiary rounded-md max-w-prose">
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
                    selectedDistribution?.token
                      ? '$' + selectedDistribution.token.symbol
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
                      <InputErrorMessage
                        error={errors?.rate?.duration?.value}
                      />
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

            {/* Only show open funding switch if defined. Backwards compatibility for update actions that didn't have the field. Also CW20 distributions must have open funding enabled, so disallow changing this if it's not native. */}
            {typeof openFunding === 'boolean' &&
              selectedDistribution?.token.type === TokenType.Native && (
                <div className="mt-2 flex flex-col gap-2 items-start">
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
          </div>
        </>
      )}
    </>
  )
}
