import { InformationCircleIcon } from '@heroicons/react/outline'
import Emoji from 'a11y-react-emoji'
import { useFormContext } from 'react-hook-form'

import { Trans, useTranslation } from '@dao-dao/i18n'
import {
  FormSwitch,
  InputErrorMessage,
  InputLabel,
  NumberInput,
  SelectInput,
  Tooltip,
} from '@dao-dao/ui'
import {
  validatePercent,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { ActionCard, ActionComponent } from '..'

export interface UpdateProposalConfigOptions {
  governanceTokenSymbol?: string
}

export const UpdateProposalConfigComponent: ActionComponent<
  UpdateProposalConfigOptions
> = ({
  getFieldName,
  errors,
  onRemove,
  readOnly,
  options: { governanceTokenSymbol },
}) => {
  const { t } = useTranslation()
  const { register, setValue, watch } = useFormContext()

  const depositRequired = watch(getFieldName('depositRequired'))
  const thresholdType = watch(getFieldName('thresholdType'))
  const quorumType = watch(getFieldName('quorumType'))
  const proposalDuration = watch(getFieldName('proposalDuration'))
  const thresholdPercentage = watch(getFieldName('thresholdPercentage'))
  const quorumPercentage = watch(getFieldName('quorumPercentage'))

  const percentageThresholdSelected = thresholdType === '%'
  const percentageQuorumSelected = quorumType === '%'

  return (
    <ActionCard
      emoji={<Emoji label={t('emoji.gear')} symbol="⚙️" />}
      onRemove={onRemove}
      title={t('form.updateVotingConfigTitle')}
    >
      <p className="secondary-text mb-3 max-w-prose">
        <Trans i18nKey="form.updateVotingConfigDescription">
          This will update the voting configuration for this DAO. A bad
          configuration can lock the DAO or create unexpected voting outcomes.
          Take care. If you have questions, please feel free to ask in the{' '}
          <a
            className="underline"
            href="https://discord.gg/sAaGuyW3D2"
            rel="noreferrer"
            target="_blank"
          >
            DAO DAO Discord
          </a>
          .
        </Trans>
      </p>
      <div className="flex flex-row flex-wrap gap-2">
        {governanceTokenSymbol !== undefined && (
          <div className="flex grow flex-row items-center justify-between gap-4 rounded-md bg-card py-2 px-3 md:w-min">
            <div className="flex flex-row gap-2">
              <Tooltip label={t('form.requireProposalDepositTooltip')}>
                <InformationCircleIcon className="secondary-text h-4 w-4" />
              </Tooltip>

              <p className="secondary-text w-max">
                {t('form.requireProposalDepositTitle')}
              </p>
            </div>
            <FormSwitch
              fieldName={getFieldName('depositRequired')}
              readOnly={readOnly}
              setValue={setValue}
              sizing="sm"
              watch={watch}
            />
          </div>
        )}
        <div className="flex grow flex-row items-center justify-between gap-4 rounded-md bg-card py-2 px-3 md:w-min">
          <div className="flex flex-row gap-2">
            <Tooltip label={t('form.onlyMembersExecuteTooltip')}>
              <InformationCircleIcon className="secondary-text h-4 w-4" />
            </Tooltip>

            <p className="secondary-text w-max">
              {t('form.onlyMembersExecuteTitle')}
            </p>
          </div>
          <FormSwitch
            fieldName={getFieldName('onlyMembersExecute')}
            readOnly={readOnly}
            setValue={setValue}
            sizing="sm"
            watch={watch}
          />
        </div>
      </div>

      {depositRequired && (
        <div className="flex flex-row flex-wrap justify-between gap-4 rounded-lg border border-default p-3 md:gap-1">
          <div className="flex max-w-prose flex-col gap-2 lg:basis-1/2">
            <h3 className="primary-text">
              <Emoji label={t('emoji.money')} symbol="💵" />{' '}
              {t('form.proposalDepositTitle')}
            </h3>
            <p className="secondary-text">
              {t('form.proposalDepositDescription')}
            </p>
          </div>
          <div className="flex grow flex-col gap-1">
            <div className="flex flex-col gap-1">
              <InputLabel
                name={`${t(
                  'form.proposalDepositTitle'
                )} ($${governanceTokenSymbol})`}
              />
              <NumberInput
                disabled={readOnly}
                error={errors?.depositInfo?.deposit}
                fieldName={getFieldName('depositInfo.deposit')}
                register={register}
                step={0.000001}
                validation={[validateRequired, validatePositive]}
              />
              <InputErrorMessage error={errors?.depositInfo?.deposit} />
            </div>
            <div className="flex grow flex-row items-center justify-between gap-4 rounded-md bg-card py-2 px-3">
              <div className="flex flex-row gap-2">
                <Tooltip label={t('form.refundFailedProposalsTooltip')}>
                  <InformationCircleIcon className="secondary-text h-4 w-4" />
                </Tooltip>

                <p className="secondary-text w-max">
                  {t('form.refundFailedProposalsTitle')}
                </p>
              </div>
              <FormSwitch
                fieldName={getFieldName('depositInfo.refundFailedProposals')}
                readOnly={readOnly}
                setValue={setValue}
                sizing="sm"
                watch={watch}
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 rounded-lg border border-default p-3 md:gap-1">
        <div className="flex max-w-prose flex-col gap-2 lg:basis-1/2">
          <h3 className="primary-text">
            <Emoji label={t('emoji.chart')} symbol="📊" />{' '}
            {t('form.passingThresholdTitle')}
          </h3>
          <p className="secondary-text">
            {t('form.passingThresholdDescription')}
          </p>
        </div>
        <div className="flex grow flex-row flex-wrap justify-center gap-2">
          {percentageThresholdSelected && (
            <div className="flex flex-col gap-1">
              <NumberInput
                disabled={readOnly}
                error={errors?.thresholdPercentage}
                fieldName={getFieldName('thresholdPercentage')}
                onPlusMinus={[
                  () =>
                    setValue(
                      getFieldName('thresholdPercentage'),
                      Math.max(thresholdPercentage + 1, 1)
                    ),
                  () =>
                    setValue(
                      getFieldName('thresholdPercentage'),
                      Math.max(thresholdPercentage - 1, 1)
                    ),
                ]}
                register={register}
                sizing="sm"
                validation={[validateRequired, validatePercent]}
              />
              <InputErrorMessage error={errors?.thresholdPercentage} />
            </div>
          )}
          <SelectInput
            disabled={readOnly}
            fieldName={getFieldName('thresholdType')}
            register={register}
          >
            <option value="majority">{t('info.majority')}</option>
            <option value="%">%</option>
          </SelectInput>
        </div>
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 rounded-lg border border-default p-3 md:gap-1">
        <div className="flex max-w-prose flex-col gap-2 lg:basis-1/2">
          <h3 className="primary-text">
            <Emoji label={t('emoji.people')} symbol="👥" />{' '}
            {t('form.quorumTitle')}
          </h3>
          <p className="secondary-text">{t('form.quorumDescription')}</p>
        </div>
        <div className="flex grow flex-row flex-wrap justify-center gap-2">
          {percentageQuorumSelected && (
            <div className="flex flex-col gap-1">
              <NumberInput
                disabled={readOnly}
                error={errors?.quorumPercentage}
                fieldName={getFieldName('quorumPercentage')}
                onPlusMinus={[
                  () =>
                    setValue(
                      getFieldName('quorumPercentage'),
                      Math.max(quorumPercentage + 1, 1)
                    ),
                  () =>
                    setValue(
                      getFieldName('quorumPercentage'),
                      Math.max(quorumPercentage - 1, 1)
                    ),
                ]}
                register={register}
                sizing="sm"
                validation={[validateRequired, validatePercent]}
              />
              <InputErrorMessage error={errors?.quorumPercentage} />
            </div>
          )}
          <SelectInput
            disabled={readOnly}
            fieldName={getFieldName('quorumType')}
            register={register}
          >
            <option value="majority">{t('info.majority')}</option>
            <option value="%">%</option>
          </SelectInput>
        </div>
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 rounded-lg border border-default p-3 md:gap-1">
        <div className="flex max-w-prose flex-col gap-2 lg:basis-1/2">
          <h3 className="primary-text">
            <Emoji label={t('emoji.clock')} symbol="⏰" />{' '}
            {t('form.votingDurationTitle')}
          </h3>
          <p className="secondary-text">
            {t('form.votingDurationDescription')}
          </p>
        </div>
        <div className="flex grow flex-row flex-wrap justify-center gap-2">
          <div className="flex flex-col gap-1">
            <NumberInput
              disabled={readOnly}
              error={errors?.proposalDuration}
              fieldName={getFieldName('proposalDuration')}
              onPlusMinus={[
                () =>
                  setValue(
                    getFieldName('proposalDuration'),
                    Math.max(proposalDuration + 1, 1)
                  ),
                () =>
                  setValue(
                    getFieldName('proposalDuration'),
                    Math.max(proposalDuration - 1, 1)
                  ),
              ]}
              register={register}
              sizing="sm"
              validation={[validatePositive, validateRequired]}
            />
            <InputErrorMessage error={errors?.proposalDuration} />
          </div>
          <SelectInput
            disabled={readOnly}
            fieldName={getFieldName('proposalDurationUnits')}
            register={register}
          >
            <option value="weeks">
              {t('unit.weeks', { count: proposalDuration })}
            </option>
            <option value="days">
              {t('unit.days', { count: proposalDuration })}
            </option>
            <option value="hours">
              {t('unit.hours', { count: proposalDuration })}
            </option>
            <option value="minutes">
              {t('unit.minutes', { count: proposalDuration })}
            </option>
            <option value="seconds">
              {t('unit.seconds', { count: proposalDuration })}
            </option>
          </SelectInput>
        </div>
      </div>
    </ActionCard>
  )
}
