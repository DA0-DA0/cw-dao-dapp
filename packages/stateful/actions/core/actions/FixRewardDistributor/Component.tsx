import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ErrorPage, Loader, TokenAmountDisplay } from '@dao-dao/stateless'
import {
  DaoRewardDistributor,
  LoadingDataWithError,
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
      <p className="title-text">Step 1.</p>

      {recovery.loading ? (
        <Loader />
      ) : recovery.errored ? (
        <ErrorPage error={recovery.error} />
      ) : (
        <>
          <div className="flex flex-row gap-2 items-center">
            <p className="text-text-secondary">
              Number of addresses with claimable rewards
            </p>
            <p className="primary-text">
              {recovery.data.addressesWithClaimableRewards.length}
            </p>
          </div>

          <div className="flex flex-col gap-2 self-start">
            <p className="primary-text">Distributions</p>

            {recovery.data.distributions.map(
              ({ distribution, claimable, undistributed }) => (
                <div
                  key={distribution.id}
                  className="rounded-md bg-background-tertiary p-2 flex flex-col gap-2"
                >
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

                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-text-secondary">Claimable</p>
                    <TokenAmountDisplay
                      amount={claimable}
                      decimals={distribution.token.decimals}
                      iconUrl={distribution.token.imageUrl}
                      showFullAmount
                      symbol={distribution.token.symbol}
                    />
                  </div>

                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-text-secondary">Undistributed</p>
                    <TokenAmountDisplay
                      amount={undistributed}
                      decimals={distribution.token.decimals}
                      iconUrl={distribution.token.imageUrl}
                      showFullAmount
                      symbol={distribution.token.symbol}
                    />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="flex flex-col gap-2 self-start">
            <p className="primary-text">Tokens</p>

            {recovery.data.tokens.map(
              ({ token, claimable, undistributed, missed }) => (
                <div
                  key={serializeTokenSource(token)}
                  className="rounded-md bg-background-tertiary p-2 flex flex-col gap-2"
                >
                  <div className="flex flex-row gap-2 items-center">
                    <div
                      className="h-6 w-6 shrink-0 rounded-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${toAccessibleImageUrl(
                          token.imageUrl ||
                            getFallbackImage(token.denomOrAddress)
                        )})`,
                      }}
                    ></div>
                    {token.symbol}
                  </div>

                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-text-secondary">Claimable</p>
                    <TokenAmountDisplay
                      amount={claimable}
                      decimals={token.decimals}
                      iconUrl={token.imageUrl}
                      showFullAmount
                      symbol={token.symbol}
                    />
                  </div>

                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-text-secondary">Undistributed</p>
                    <TokenAmountDisplay
                      amount={undistributed}
                      decimals={token.decimals}
                      iconUrl={token.imageUrl}
                      showFullAmount
                      symbol={token.symbol}
                    />
                  </div>

                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-text-secondary">Missed</p>
                    <TokenAmountDisplay
                      amount={missed}
                      decimals={token.decimals}
                      iconUrl={token.imageUrl}
                      showFullAmount
                      symbol={token.symbol}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </>
  )
}
