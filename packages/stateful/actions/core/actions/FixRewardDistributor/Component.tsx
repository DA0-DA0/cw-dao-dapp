import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  ErrorPage,
  Loader,
  MarkdownRenderer,
  TokenAmountDisplay,
} from '@dao-dao/stateless'
import {
  DaoRewardDistributor,
  DistributionWithV250RecoveryInfo,
  LoadingDataWithError,
  TokenWithV250RecoveryInfo,
  V250RewardDistributorRecoveryInfo,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import {
  getFallbackImage,
  getHumanReadableRewardDistributionLabel,
  serializeTokenSource,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

export type FixRewardDistributorData = {
  /**
   * Pause and withdraw all current linear distributions.
   */
  step1: {
    distributor: string
    id: number
  }[]
}

export type FixRewardDistributorOptions = {
  /**
   * Existing reward distributors on v2.5.0.
   */
  distributors: DaoRewardDistributor[]
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

2. Upgrade the reward distributor contracts to v2.6.0, withdraw the missed rewards by subtracting all unclaimed distributed rewards from the funds leftover in the contract, and unpause the previously active distributions. You can also specify how much to re-fund the distributions with based on the recovered amount.

These two steps must be completed in order, with step 1 being executed before step 2 begins. This is because distributions must be paused and undistributed rewards must be withdrawn before the calculation of missed rewards can be performed.

Optionally, during step 1, you may create a new reward distributor contract to seamlessly replace existing distributions and keep distributing rewards before step 2 is done, but you should still complete step 2 to recover any missed rewards.
`.trim()

export const FixRewardDistributorComponent: ActionComponent<
  FixRewardDistributorOptions
> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: { distributors, recovery },
}) => {
  const { t } = useTranslation()
  const { register, setValue, watch, getValues } =
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
                {recovery.data.step.needsPause.map((info) => (
                  <Distribution
                    key={info.distributor.id + info.distribution.id}
                    {...info}
                  />
                ))}
              </div>

              <p className="primary-text">
                UNDISTRIBUTED REWARDS TO BE WITHDRAWN:
              </p>

              <div className="flex flex-col gap-2 pl-4">
                {recovery.data.step.needsWithdraw.map((info) => (
                  <Distribution
                    key={info.distributor.id + info.distribution.id}
                    {...info}
                  />
                ))}
              </div>
            </>
          ) : recovery.data.step.step === 2 ? (
            <>
              <p className="title-text">Step 2.</p>

              <p className="primary-text">MISSED REWARDS TO BE RECOVERED:</p>

              <div className="flex flex-col gap-2 pl-4">
                {recovery.data.step.needsForceWithdraw.map((info) => (
                  <Token
                    key={info.distributor.id + serializeTokenSource(info.token)}
                    {...info}
                  />
                ))}
              </div>
            </>
          ) : (
            <p>Done!</p>
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
                    key={info.distributor.id + info.distribution.id}
                    {...info}
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
                    {...info}
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
  distributor,
  distribution,
  claimable,
  undistributed,
}: DistributionWithV250RecoveryInfo) => {
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
        {getHumanReadableRewardDistributionLabel(t, distribution)}
      </div>

      <div className="flex flex-row gap-4 items-center justify-between">
        <p className="text-text-secondary">Distributor</p>
        <p>{distributor.id}</p>
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

      {!('immediate' in distribution.active_epoch.emission_rate) &&
        !('paused' in distribution.active_epoch.emission_rate) && (
          <p>NEEDS PAUSE</p>
        )}
      {!undistributed.isZero() && <p>NEEDS WITHDRAW</p>}
    </div>
  )
}

const Token = ({
  distributor,
  token,
  balance,
  claimable,
  undistributed,
  missed,
}: TokenWithV250RecoveryInfo) => {
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

      {!missed.isZero() && <p>NEEDS RECOVERY</p>}
    </div>
  )
}
