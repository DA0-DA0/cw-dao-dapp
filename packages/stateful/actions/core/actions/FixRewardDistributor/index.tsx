import { useQueries } from '@tanstack/react-query'
import uniq from 'lodash.uniq'

import {
  contractQueries,
  daoRewardsDistributorExtraQueries,
} from '@dao-dao/state/query'
import { ActionBase, WrenchEmoji, useActionOptions } from '@dao-dao/stateless'
import {
  ContractVersion,
  DaoRewardDistributor,
  TokenWithV250RecoveryInfo,
  UnifiedCosmosMsg,
  V250RewardDistributorRecoveryInfo,
} from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  getDaoRewardDistributors,
  makeCombineQueryResultsIntoLoadingDataWithError,
  parseContractVersion,
  tokensEqual,
} from '@dao-dao/utils'

import {
  FixRewardDistributorComponent,
  FixRewardDistributorData,
} from './Component'

export class FixRewardDistributorAction extends ActionBase<FixRewardDistributorData> {
  public readonly key = ActionKey.FixRewardDistributor
  public readonly Component: ActionComponent<
    undefined,
    FixRewardDistributorData
  >

  /**
   * Existing reward distributors on v2.5.0.
   */
  private distributors: DaoRewardDistributor[] = []

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can fund reward distributions')
    }

    super(options, {
      Icon: WrenchEmoji,
      label: options.t('title.fixRewardDistributor'),
      description: options.t('info.fixRewardDistributorDescription'),
      // Default hidden and unhide if we detect a v2.5.0 distributor.
      hideFromPicker: true,
    })

    this.distributors = getDaoRewardDistributors(options.context.dao.info.items)

    const action = this
    const daoAddress = options.context.dao.coreAddress
    this.Component = function Component(props) {
      const {
        chain: { chainId },
        queryClient,
      } = useActionOptions()

      const recovery = useQueries({
        queries: action.distributors.map(({ address }) =>
          daoRewardsDistributorExtraQueries.v250DistributionRecoveryInfo(
            queryClient,
            {
              chainId,
              address,
              daoAddress,
            }
          )
        ),
        combine: makeCombineQueryResultsIntoLoadingDataWithError({
          transform: (info): V250RewardDistributorRecoveryInfo => {
            // Combine each distributor's recovery info.
            const distributions = info.flatMap((i) => i.distributions)
            const tokens = info.reduce((acc, { tokens }) => {
              tokens.forEach(({ token, claimable, missed, undistributed }) => {
                const existing = acc.find((t) => tokensEqual(t.token, token))
                if (existing) {
                  existing.claimable = existing.claimable.plus(claimable)
                  existing.missed = existing.missed.plus(missed)
                  existing.undistributed =
                    existing.undistributed.plus(undistributed)
                } else {
                  acc.push({ token, claimable, missed, undistributed })
                }
              })
              return acc
            }, [] as TokenWithV250RecoveryInfo[])
            const addressesWithClaimableRewards = uniq(
              info.flatMap(
                ({ addressesWithClaimableRewards }) =>
                  addressesWithClaimableRewards
              )
            )

            return {
              distributions,
              tokens,
              addressesWithClaimableRewards,
            }
          },
        }),
      })

      return (
        <FixRewardDistributorComponent
          {...props}
          options={{
            distributors: action.distributors,
            recovery,
          }}
        />
      )
    }
  }

  async setup() {
    this.distributors = (
      await Promise.all(
        this.distributors.map(async ({ id, address }) => {
          const { info } = await this.options.queryClient.fetchQuery(
            contractQueries.info(this.options.queryClient, {
              chainId: this.options.chain.chainId,
              address,
            })
          )

          const version = parseContractVersion(info.version)

          return { id, address, version }
        })
      )
    ).flatMap(({ id, address, version }): DaoRewardDistributor | [] =>
      version === ContractVersion.V250 ? { id, address } : []
    )

    this.metadata.hideFromPicker = this.distributors.length === 0

    this.defaults = {
      step1: [],
    }
  }

  encode({ step1 }: FixRewardDistributorData): UnifiedCosmosMsg[] {
    return []
  }

  breakdownMessage(decodedMessage: any) {
    return null
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    try {
      return !!this.breakdownMessage(decodedMessage)
    } catch {
      return false
    }
  }

  async decode([
    { decodedMessage },
  ]: ProcessedMessage[]): Promise<FixRewardDistributorData> {
    return {
      step1: [],
    }
  }
}
