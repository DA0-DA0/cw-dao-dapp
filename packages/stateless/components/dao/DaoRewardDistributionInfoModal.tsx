import { ArrowForwardIos, Check } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import { StatelessDaoRewardDistributionInfoModalProps } from '@dao-dao/types'
import {
  formatExpiration,
  getHumanReadableRewardDistributionLabel,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { Button } from '../buttons'
import { InputErrorMessage, InputLabel, NumericInput } from '../inputs'
import { Modal } from '../modals'
import { TokenAmountDisplay } from '../token'
import { Tooltip, TooltipInfoIcon } from '../tooltip'

export const DaoRewardDistributionInfoModal = ({
  distribution,
  onClose,
  onFund,
  funding,
  remaining,
  visible,
}: StatelessDaoRewardDistributionInfoModalProps) => {
  const { t } = useTranslation()

  const [showingDistribute, setShowingDistribute] = useState(false)
  const [funded, setFunded] = useState(false)
  useEffect(() => {
    if (!funded) {
      return
    }

    const timeout = setTimeout(() => {
      setFunded(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [funded])

  const {
    register,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<{
    amount: string
  }>({
    defaultValues: {
      amount: '1',
    },
  })

  const amount = watch('amount')
  const hugeAmount = HugeDecimal.fromHumanReadable(
    amount,
    distribution?.token.decimals ?? 0
  )

  return (
    <Modal
      contentContainerClassName="gap-4 items-start"
      footerContent={
        !distribution ? undefined : showingDistribute ? (
          <div className="flex flex-col gap-2">
            <p className="title-text">{t('title.addFunds')}</p>

            <p className="secondary-text -mt-1 mb-1">
              {t('info.distributeToDaoMembersFromWallet')}
            </p>

            <div className="flex flex-row gap-2">
              <NumericInput
                containerClassName="grow"
                error={errors?.amount}
                fieldName="amount"
                getValues={getValues}
                min={0}
                register={register}
                setValue={setValue}
                step={HugeDecimal.one.toHumanReadableNumber(
                  distribution.token.decimals
                )}
                unit={'$' + distribution.token.symbol}
                validation={[validateRequired, validatePositive]}
              />

              <Button
                disabled={hugeAmount.isNaN() || hugeAmount.isZero()}
                loading={funding}
                onClick={() =>
                  onFund(hugeAmount).then((success) => setFunded(success))
                }
                variant="secondary"
              >
                {funded ? t('button.distributed') : t('button.distribute')}
                {funded && <Check className="!h-5 !w-5" />}
              </Button>
            </div>

            <InputErrorMessage error={errors?.amount} />
          </div>
        ) : (
          <Tooltip
            title={
              distribution.open_funding
                ? t('info.distributeToDaoMembersFromWallet')
                : t('info.onlyDaoCanDistribute')
            }
          >
            <Button
              disabled={!distribution.open_funding}
              onClick={() => setShowingDistribute(true)}
              size="lg"
              variant="secondary"
            >
              {t('button.addFunds')}
              <ArrowForwardIos className="!h-4 !w-4" />
            </Button>
          </Tooltip>
        )
      }
      header={{
        supertitle: distribution ? t('title.rewardDistribution') : undefined,
        title: distribution
          ? getHumanReadableRewardDistributionLabel(t, distribution)
          : t('title.rewardDistribution'),
        imageUrl: distribution?.token.imageUrl || undefined,
      }}
      onClose={() => {
        onClose()
        // Wait for the modal to close before hiding this to prevent flickering.
        setTimeout(() => setShowingDistribute(false), 500)
      }}
      titleClassName="!title-text"
      visible={visible}
    >
      <div className="flex flex-col gap-1">
        <InputLabel name={t('title.status')} />
        {distribution ? (
          <div className="flex flex-row gap-1 items-center">
            <p className="primary-text">
              {'paused' in distribution.active_epoch.emission_rate
                ? t('title.paused')
                : !remaining.loading &&
                    !remaining.errored &&
                    !remaining.updating &&
                    remaining.data.isZero()
                  ? t('title.completed')
                  : t('title.live')}
            </p>

            {!('paused' in distribution.active_epoch.emission_rate) && (
              <TooltipInfoIcon
                size="sm"
                title={t('info.addFundsToContinueDistributing')}
              />
            )}
          </div>
        ) : (
          <p>...</p>
        )}
      </div>

      {distribution &&
        ('linear' in distribution.active_epoch.emission_rate ? (
          <>
            <div className="flex flex-col gap-1">
              <InputLabel name={t('title.dateStarted')} />
              {distribution ? (
                <p className="primary-text">
                  {formatExpiration(t, distribution.active_epoch.started_at)}
                </p>
              ) : (
                <p>...</p>
              )}
            </div>

            {!remaining.errored && (
              <div className="flex flex-col gap-1">
                <InputLabel
                  name={t('title.rewardsRemaining')}
                  tooltip={t('info.rewardsRemainingTooltip')}
                />
                <TokenAmountDisplay
                  amount={
                    !remaining.loading && remaining.updating
                      ? { loading: true }
                      : remaining
                  }
                  className="primary-text"
                  decimals={distribution.token.decimals}
                  symbol={distribution.token.symbol}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <InputLabel
              name={
                'immediate' in distribution.active_epoch.emission_rate
                  ? t('title.rewardsDistributed')
                  : // Paused
                    t('title.rewardsLocked')
              }
            />
            <TokenAmountDisplay
              amount={HugeDecimal.from(distribution.funded_amount)}
              className="primary-text"
              decimals={distribution.token.decimals}
              symbol={distribution.token.symbol}
            />
          </div>
        ))}
    </Modal>
  )
}
