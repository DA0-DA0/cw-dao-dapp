/* eslint-disable i18next/no-literal-string */

import { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Collapsible,
  ErrorPage,
  FormSwitchCard,
  InputErrorMessage,
  InputLabel,
  Loader,
  MarkdownRenderer,
  NumericInput,
  TokenAmountDisplay,
} from '@dao-dao/stateless'
import {
  DistributionWithV250RecoveryInfo,
  LoadingDataWithError,
  TokenWithV250RecoveryInfo,
  V250RewardDistributorRecoveryInfo,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { EmissionRate } from '@dao-dao/types/contracts/DaoRewardsDistributor'
import {
  getFallbackImage,
  getHumanReadableRewardDistributionLabel,
  getRewardDistributionKey,
  serializeTokenSource,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

export type FixRewardDistributorData = {
  /**
   * The step to perform.
   */
  step: V250RewardDistributorRecoveryInfo['step'] | undefined
  /**
   * Whether or not to resume distributions in step 2. Map of distribution key
   * (via getRewardDistributionKey) -> boolean. If undefined, defaults to false.
   */
  resume: Record<string, boolean>
  /**
   * Amounts to re-fund the distributions with in step 2. Map of distribution
   * key (via getRewardDistributionKey) -> amount to re-fund with. This is only
   * performed if the distribution is also resumed.
   */
  fundAmounts: Record<string, string>
}

export type FixRewardDistributorOptions = {
  /**
   * Recovery information for all reward distributions.
   */
  recovery: LoadingDataWithError<V250RewardDistributorRecoveryInfo>
}

const explanation = `
In v2.5.0 of the reward distributor, there is a bug that causes skipped
rewards when intervals are large and voting powers change often. This
action automates the steps to upgrade the reward distributor and recover
any missed rewards. There are two steps:

1. Pause all distributions currently in progress, and withdraw any undistributed rewards. Already distributed rewards that have not yet been claimed are _not_ affected.

2. Upgrade the reward distributor contracts, withdraw the missed rewards by subtracting all unclaimed distributed rewards from the funds leftover in the contract, and resume the previously active distributions. When resuming, you'll likely also want to fund the distributions again with the recovered amount.

These two steps must be completed in order, with step 1 being executed before step 2 begins. This is because distributions must be paused and undistributed rewards must be withdrawn before the calculation of missed rewards can be performed. You may not need to do step 1 if all distributions are already paused and have no undistributed rewards.
`.trim()

export const FixRewardDistributorComponent: ActionComponent<
  FixRewardDistributorOptions
> = ({ fieldNamePrefix, errors, options: { recovery } }) => {
  const { watch, register, getValues, setValue } =
    useFormContext<FixRewardDistributorData>()

  return (
    <>
      <MarkdownRenderer markdown={explanation} />

      {recovery.loading ? (
        <Loader />
      ) : recovery.errored ? (
        <ErrorPage error={recovery.error} />
      ) : (
        <>
          {recovery.data.step.step === 1 ? (
            <>
              <p className="title-text">STEP 1</p>

              <p className="primary-text">TO BE PAUSED:</p>

              <div className="flex flex-col gap-2 pl-4">
                {recovery.data.step.needsPause.length ? (
                  recovery.data.step.needsPause.map((info) => (
                    <Distribution
                      key={getRewardDistributionKey(
                        info.distributor.address,
                        info.distribution.id
                      )}
                      info={info}
                    />
                  ))
                ) : (
                  <p>None</p>
                )}
              </div>

              <p className="primary-text">
                UNDISTRIBUTED REWARDS TO BE WITHDRAWN:
              </p>

              <div className="flex flex-col gap-2 pl-4">
                {recovery.data.step.needsWithdraw.length ? (
                  recovery.data.step.needsWithdraw.map((info) => (
                    <Distribution
                      key={getRewardDistributionKey(
                        info.distributor.address,
                        info.distribution.id
                      )}
                      info={info}
                    />
                  ))
                ) : (
                  <p>None</p>
                )}
              </div>
            </>
          ) : recovery.data.step.step === 2 ? (
            <>
              <p className="title-text">STEP 2</p>

              <p className="primary-text">MISSED REWARDS TO BE RECOVERED:</p>

              <div className="flex flex-col gap-2 pl-4">
                {recovery.data.step.needsForceWithdraw.length ? (
                  recovery.data.step.needsForceWithdraw.map((info) => (
                    <Token
                      key={
                        info.distributor.id + serializeTokenSource(info.token)
                      }
                      info={info}
                    />
                  ))
                ) : (
                  <p>None</p>
                )}
              </div>

              <p className="primary-text">CAN BE RESUMED:</p>

              <div className="flex flex-col gap-2 pl-4">
                {recovery.data.step.canBeResumed.length ? (
                  recovery.data.step.canBeResumed.map((info) => {
                    const key = getRewardDistributionKey(
                      info.distributor.address,
                      info.distribution.id
                    )

                    const resumeKey = (fieldNamePrefix +
                      `resume.${key}`) as `resume.${string}`
                    const resuming = watch(resumeKey)

                    return (
                      <Distribution key={key} info={info}>
                        <FormSwitchCard
                          fieldName={resumeKey}
                          label="Resume"
                          setValue={setValue}
                          watch={watch}
                        />

                        {resuming && (
                          <div className="flex flex-col gap-1">
                            <InputLabel
                              name="Amount"
                              tooltip="Since all funds were withdrawn, you'll need to fund the distribution again to start distributing rewards."
                            />
                            <NumericInput
                              error={errors?.fundAmounts?.[key]}
                              fieldName={
                                (fieldNamePrefix +
                                  `fundAmounts.${key}`) as `fundAmounts.${string}`
                              }
                              getValues={getValues}
                              min={0}
                              register={register}
                              setValue={setValue}
                              step={HugeDecimal.one.toHumanReadableNumber(
                                info.distribution.token.decimals
                              )}
                            />
                            <InputErrorMessage
                              error={errors?.fundAmounts?.[key]}
                            />
                          </div>
                        )}
                      </Distribution>
                    )
                  })
                ) : (
                  <p>None</p>
                )}
              </div>
            </>
          ) : (
            <p>DONE</p>
          )}

          <Collapsible
            contentContainerClassName="flex flex-col gap-4 items-start"
            defaultCollapsed
            label="All data"
            noContentIndent
            noHeaderIndent
          >
            <p className="primary-text">DISTRIBUTIONS</p>

            <div className="flex flex-col gap-2 pl-4">
              {recovery.data.data.flatMap(({ distributions }) =>
                distributions.map((info) => (
                  <Distribution
                    key={getRewardDistributionKey(
                      info.distributor.address,
                      info.distribution.id
                    )}
                    info={info}
                  />
                ))
              )}
            </div>

            <p className="primary-text">TOKENS</p>

            <div className="flex flex-col gap-2 pl-4">
              {recovery.data.data.flatMap(({ tokens }) =>
                tokens.map((info) => (
                  <Token
                    key={info.distributor.id + serializeTokenSource(info.token)}
                    info={info}
                  />
                ))
              )}
            </div>
          </Collapsible>
        </>
      )}
    </>
  )
}

const Distribution = ({
  info: { distribution, claimable, undistributed, savedEmissionRate },
  children,
}: {
  info: DistributionWithV250RecoveryInfo & {
    // if can be resumed, this will be defined
    savedEmissionRate?: EmissionRate
  }
  children?: ReactNode
}) => {
  const { t } = useTranslation()
  return (
    <div className="rounded-md bg-background-tertiary p-2 flex flex-col gap-2 self-start">
      <div className="flex flex-row gap-2 items-center">
        <div
          className="h-6 w-6 shrink-0 rounded-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${toAccessibleImageUrl(
              distribution.token.imageUrl ||
                getFallbackImage(distribution.token.denomOrAddress)
            )})`,
          }}
        ></div>
        {getHumanReadableRewardDistributionLabel(
          t,
          distribution,
          savedEmissionRate
        )}
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Claimable</p>
        <TokenAmountDisplay
          amount={claimable}
          decimals={distribution.token.decimals}
          iconUrl={distribution.token.imageUrl}
          showAllDecimals
          showFullAmount
          symbol={distribution.token.symbol}
        />
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Undistributed</p>
        <TokenAmountDisplay
          amount={undistributed}
          decimals={distribution.token.decimals}
          iconUrl={distribution.token.imageUrl}
          showAllDecimals
          showFullAmount
          symbol={distribution.token.symbol}
        />
      </div>

      {children && (
        <div className="flex flex-col gap-2 p-2 rounded-md bg-background-tertiary">
          {children}
        </div>
      )}
    </div>
  )
}

const Token = ({
  info: { distributor, token, balance, claimable, undistributed, missed },
}: {
  info: TokenWithV250RecoveryInfo
}) => {
  return (
    <div className="rounded-md bg-background-tertiary p-2 flex flex-col gap-2 self-start">
      <div className="flex flex-row gap-2 items-center">
        <div
          className="h-6 w-6 shrink-0 rounded-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${toAccessibleImageUrl(
              token.imageUrl || getFallbackImage(token.denomOrAddress)
            )})`,
          }}
        ></div>
        {token.symbol}
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Distributor</p>
        <p>{distributor.id}</p>
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Balance</p>
        <TokenAmountDisplay
          amount={balance}
          decimals={token.decimals}
          iconUrl={token.imageUrl}
          showFullAmount
          symbol={token.symbol}
        />
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Claimable</p>
        <TokenAmountDisplay
          amount={claimable}
          decimals={token.decimals}
          iconUrl={token.imageUrl}
          showAllDecimals
          showFullAmount
          symbol={token.symbol}
        />
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Undistributed</p>
        <TokenAmountDisplay
          amount={undistributed}
          decimals={token.decimals}
          iconUrl={token.imageUrl}
          showAllDecimals
          showFullAmount
          symbol={token.symbol}
        />
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Missed</p>
        <TokenAmountDisplay
          amount={missed}
          decimals={token.decimals}
          iconUrl={token.imageUrl}
          showAllDecimals
          showFullAmount
          symbol={token.symbol}
        />
      </div>
    </div>
  )
}
