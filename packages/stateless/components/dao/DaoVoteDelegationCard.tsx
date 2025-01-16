import { Add, ArrowDropDown } from '@mui/icons-material'
import clsx from 'clsx'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  DelegationForm,
  StatelessDaoVoteDelegationCardProps,
} from '@dao-dao/types'
import {
  validatePercent,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { Button } from '../buttons'
import { EntityDisplay } from '../EntityDisplay'
import { ErrorPage } from '../error'
import { InputErrorMessage, InputLabel, NumericInput } from '../inputs'
import { LineLoaders } from '../LineLoader'
import { Loader } from '../logo'
import { Modal } from '../modals'
import { FilterableItemPopup } from '../popup'

export const DaoVoteDelegationCard = ({
  className,
  totalVotingPower,
  delegates,
  delegations,
  registration,
  loadingRegistration,
  updateRegistration,
  loadingDelegate,
  delegate,
  loadingUndelegate,
  undelegate,
  Trans,
}: StatelessDaoVoteDelegationCardProps) => {
  const { t } = useTranslation()

  const [delegationModalOpen, setDelegationModalOpen] = useState(false)
  const delegationForm = useForm<DelegationForm>()

  const selectedDelegateAddress = delegationForm.watch('delegate')
  const selectedDelegate =
    !delegates.loading && !delegates.errored
      ? delegates.data.find(
          ({ delegate }) => delegate === selectedDelegateAddress
        )
      : undefined
  const selectedDelegateExistingDelegation =
    !delegations.loading && !delegations.errored
      ? delegations.data.find(
          ({ delegate }) => delegate === selectedDelegateAddress
        )
      : undefined

  const addNewDelegation = () => {
    delegationForm.setValue('delegate', '')
    delegationForm.setValue('percent', '10')
    setDelegationModalOpen(true)
  }

  return (
    <>
      <div
        className={clsx(
          'bg-background-tertiary flex flex-col rounded-md p-4 gap-4',
          className
        )}
      >
        <p className="primary-text">{t('title.delegations')}</p>

        {registration.loading ? (
          <Loader />
        ) : registration.errored ? (
          <ErrorPage error={registration.error} />
        ) : registration.data.registered ? (
          <>
            <p className="body-text text-text-secondary break-all -mt-2">
              <Trans i18nKey="info.delegatedVotingPower">
                You have been delegated{' '}
                <span className="text-text-brand-secondary font-mono">
                  {{
                    power: totalVotingPower.loading
                      ? '...'
                      : totalVotingPower.errored
                        ? HugeDecimal.from(
                            registration.data.power
                          ).toFormattedString()
                        : HugeDecimal.from(registration.data.power)
                            .div(totalVotingPower.data)
                            .times(100)
                            .toFormattedString({
                              maxNonZeroDecimals: 3,
                            }) + '%',
                  }}
                </span>{' '}
                of the total voting power.
              </Trans>
            </p>

            <Button
              className="self-start"
              loading={registration.loading || loadingRegistration}
              onClick={() => updateRegistration(false)}
              variant="secondary"
            >
              {t('button.stopBeingADelegate')}
            </Button>

            <p className="caption-text italic">
              {t('info.delegateCannotDelegate')}
            </p>
          </>
        ) : (
          <>
            <p className="secondary-text -mt-3">
              {t('info.voteDelegationDelegatorExplanation')}
            </p>

            <div className="flex flex-col gap-3">
              {delegations.loading ? (
                <LineLoaders lines={3} type="command" />
              ) : delegations.errored ? (
                <ErrorPage error={delegations.error} />
              ) : delegations.data.length > 0 ? (
                <>
                  <div className="flex flex-col mt-1">
                    {delegations.data.map(
                      ({ active, delegate, entity, percent }) => (
                        <Button
                          key={delegate}
                          className="!py-3 !px-4"
                          contentContainerClassName="justify-between"
                          onClick={() => {
                            delegationForm.setValue('delegate', delegate)
                            delegationForm.setValue(
                              'percent',
                              HugeDecimal.from(percent).times(100).toString()
                            )
                            setDelegationModalOpen(true)
                          }}
                          variant="ghost_outline"
                        >
                          <EntityDisplay
                            address={delegate}
                            loadingEntity={{ loading: false, data: entity }}
                          />

                          <p
                            className={clsx(
                              'body-text font-mono text-right',
                              active
                                ? 'text-text-brand-secondary'
                                : 'text-text-interactive-disabled'
                            )}
                          >
                            {HugeDecimal.from(percent)
                              .times(100)
                              .toFormattedString({
                                maxNonZeroDecimals: 3,
                              }) + '%'}
                          </p>
                        </Button>
                      )
                    )}
                  </div>

                  <Button
                    className="self-end"
                    onClick={addNewDelegation}
                    variant="secondary"
                  >
                    <Add className="!w-4 !h-4" />
                    {t('button.new')}
                  </Button>
                </>
              ) : (
                <Button
                  className="self-start -mt-2"
                  onClick={addNewDelegation}
                  variant="secondary"
                >
                  <Add className="!w-4 !h-4" />
                  {t('button.newDelegation')}
                </Button>
              )}
            </div>

            <p className="secondary-text -mb-2">
              {t('info.becomeDelegateExplanation', {
                context:
                  delegations.loading ||
                  delegations.errored ||
                  delegations.data.length > 0
                    ? 'undelegate'
                    : undefined,
              })}
            </p>

            <Button
              className="self-start"
              loading={loadingRegistration}
              onClick={
                !registration.loading && !registration.errored
                  ? () => updateRegistration(!registration.data.registered)
                  : undefined
              }
              variant="secondary"
            >
              {t('button.becomeADelegate')}
            </Button>
          </>
        )}
      </div>

      <Modal
        containerClassName="min-w-72"
        header={{
          title: t('title.delegation'),
        }}
        onClose={() => setDelegationModalOpen(false)}
        visible={delegationModalOpen}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={delegationForm.handleSubmit(delegate)}
        >
          <div className="flex flex-col gap-2">
            <InputLabel name={t('title.delegate')} />

            {!delegates.loading && !delegates.errored && (
              <FilterableItemPopup
                filterableItemKeys={DELEGATE_FILTERABLE_ITEM_KEYS}
                items={delegates.data.map(({ delegate, entity, power }) => ({
                  key: delegate,
                  iconUrl: entity.imageUrl,
                  label: entity.name || entity.address,
                  rightNode: (
                    <p className="primary-text text-text-brand-secondary font-mono">
                      {totalVotingPower.loading || totalVotingPower.errored
                        ? HugeDecimal.from(power).toFormattedString()
                        : HugeDecimal.from(power)
                            .div(totalVotingPower.data)
                            .times(100)
                            .toFormattedString({
                              maxNonZeroDecimals: 3,
                            }) + '%'}
                    </p>
                  ),
                }))}
                onSelect={({ key }) => delegationForm.setValue('delegate', key)}
                trigger={{
                  type: 'button',
                  props: {
                    contentContainerClassName: 'justify-between !gap-4',
                    size: 'lg',
                    variant: 'ghost_outline',
                    children: (
                      <>
                        {selectedDelegate ? (
                          <EntityDisplay
                            address={selectedDelegate.delegate}
                            loadingEntity={{
                              loading: false,
                              data: selectedDelegate.entity,
                            }}
                            noCopy
                            noLink
                          />
                        ) : (
                          <p className="text-text-secondary">
                            {t('button.selectDelegate')}
                          </p>
                        )}

                        <ArrowDropDown className="text-icon-primary !h-6 !w-6" />
                      </>
                    ),
                  },
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <InputLabel name={t('title.percent')} />
            <NumericInput
              fieldName="percent"
              max={100}
              min={0.0001}
              register={delegationForm.register}
              step={0.0001}
              unit="%"
              validation={[validateRequired, validatePercent, validatePositive]}
            />
            <InputErrorMessage
              error={delegationForm.formState.errors.percent}
            />
          </div>

          <div className="border-border-secondary flex flex-row gap-2 items-center justify-end -mx-6 -mb-6 mt-2 px-6 py-5 border-t">
            {selectedDelegateExistingDelegation && (
              <Button
                disabled={loadingDelegate}
                loading={loadingUndelegate}
                onClick={() => undelegate(selectedDelegateAddress)}
                variant="secondary"
              >
                {t('button.undelegate')}
              </Button>
            )}

            <Button
              disabled={loadingUndelegate}
              loading={loadingDelegate}
              type="submit"
              variant="brand"
            >
              {selectedDelegateExistingDelegation
                ? t('button.updateDelegation')
                : t('button.delegate')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const DELEGATE_FILTERABLE_ITEM_KEYS = ['key', 'name']
