import { QueryClient, queryOptions } from '@tanstack/react-query'
import uniq from 'lodash.uniq'

import { HugeDecimal } from '@dao-dao/math'
import {
  ContractVersion,
  DaoRewardDistribution,
  DaoRewardDistributor,
  DistributionWithV250RecoveryInfo,
  GenericTokenBalanceAndValue,
  GenericTokenWithUsdPrice,
  PendingDaoRewards,
  TokenType,
  TokenWithV250RecoveryInfo,
  V250RewardDistributorRecoveryInfo,
} from '@dao-dao/types'
import {
  DistributionPendingRewards,
  DistributionState,
  PendingRewardsResponse,
} from '@dao-dao/types/contracts/DaoRewardsDistributor'
import {
  deserializeTokenSource,
  getDaoRewardDistributors,
  getRewardDistributorSavedEmissionRateStorageItemKey,
  getRewardDistributorStorageItemKey,
  objectMatchesStructure,
  parseContractVersion,
  serializeTokenSource,
  tokenSourcesEqual,
  tokensEqual,
} from '@dao-dao/utils'

import { contractQueries } from '../contract'
import { daoQueries } from '../dao'
import { indexerQueries } from '../indexer'
import { tokenQueries } from '../token'
import { daoDaoCoreQueries } from './DaoDaoCore'
import { daoRewardsDistributorQueries } from './DaoRewardsDistributor'

/**
 * Fetch a DAO reward distribution.
 */
export const fetchDaoRewardDistribution = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    id,
  }: {
    chainId: string
    address: string
    id: number
  }
): Promise<DaoRewardDistribution> => {
  const state = await queryClient.fetchQuery(
    daoRewardsDistributorQueries.distribution(queryClient, {
      chainId,
      contractAddress: address,
      args: {
        id,
      },
    })
  )

  const token = await queryClient.fetchQuery(
    tokenQueries.info(queryClient, {
      chainId,
      type: 'cw20' in state.denom ? TokenType.Cw20 : TokenType.Native,
      denomOrAddress:
        'cw20' in state.denom ? state.denom.cw20 : state.denom.native,
    })
  )

  return {
    chainId,
    address,
    token,
    ...state,
  }
}

/**
 * Fetch all DAO reward distributions.
 */
export const fetchDaoRewardDistributions = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<DaoRewardDistribution[]> => {
  let states: DistributionState[] | undefined
  try {
    states = (
      await queryClient.fetchQuery(
        indexerQueries.queryContract(queryClient, {
          chainId,
          contractAddress: address,
          formula: 'daoRewardsDistributor/distributions',
        })
      )
    ).distributions
  } catch (err) {
    console.error(err)
  }

  // If indexer query fails, fallback to contract query.
  if (!states) {
    states = []
    const limit = 15
    while (true) {
      const page = (
        await queryClient.fetchQuery(
          daoRewardsDistributorQueries.distributions(queryClient, {
            chainId,
            contractAddress: address,
            args: {
              limit,
              startAfter: states[states.length - 1]?.id,
            },
          })
        )
      )?.distributions

      if (!page?.length) {
        break
      }

      // Cache each distribution individually, to be used in the distribution
      // query at the bottom of this function.
      for (const distribution of page) {
        queryClient.setQueryData(
          daoRewardsDistributorQueries.distribution(queryClient, {
            chainId,
            contractAddress: address,
            args: {
              id: distribution.id,
            },
          }).queryKey,
          distribution
        )
      }

      states.push(...page)

      // If we have less than the limit of items, we've exhausted them.
      if (page.length < limit) {
        break
      }
    }
  }

  const distributions = await Promise.all(
    states.map(({ id }) =>
      queryClient.fetchQuery(
        daoRewardsDistributorExtraQueries.distribution(queryClient, {
          chainId,
          address,
          id,
        })
      )
    )
  )

  return distributions
}

/**
 * List all pending rewards.
 */
export const listAllDaoRewardDistributorPendingRewards = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    recipient,
  }: {
    chainId: string
    address: string
    recipient: string
  }
): Promise<PendingRewardsResponse> => {
  const rewards: DistributionPendingRewards[] = []

  const limit = 15
  while (true) {
    const page = (
      await queryClient.fetchQuery(
        daoRewardsDistributorQueries.pendingRewards({
          chainId,
          contractAddress: address,
          args: {
            address: recipient,
            limit,
            startAfter: rewards[rewards.length - 1]?.id,
          },
        })
      )
    )?.pending_rewards

    if (!page?.length) {
      break
    }

    rewards.push(...page)

    // If we have less than the limit of items, we've exhausted them.
    if (page.length < limit) {
      break
    }
  }

  return {
    pending_rewards: rewards,
  }
}

/**
 * Fetch all DAO reward distributions.
 */
export const fetchAllDaoRewardDistributions = async (
  queryClient: QueryClient,
  {
    chainId,
    daoAddress,
  }: {
    chainId: string
    daoAddress: string
  }
): Promise<DaoRewardDistribution[]> => {
  // Active distributors for a DAO.
  const distributors = (
    await queryClient.fetchQuery(
      daoDaoCoreQueries.listAllItems(queryClient, {
        chainId,
        contractAddress: daoAddress,
        args: {
          prefix: getRewardDistributorStorageItemKey(''),
        },
      })
    )
  ).map(([, value]) => value)

  // Fetch all distributions with pending rewards from all distributors.
  const distributions = (
    await Promise.all(
      distributors.map((address) =>
        queryClient.fetchQuery(
          daoRewardsDistributorExtraQueries.distributions(queryClient, {
            chainId,
            address,
          })
        )
      )
    )
  ).flat()

  return distributions
}

/**
 * Fetch all DAO reward distributions and pending rewards for an account.
 */
export const fetchPendingDaoRewards = async (
  queryClient: QueryClient,
  {
    chainId,
    daoAddress,
    recipient,
  }: {
    chainId: string
    daoAddress: string
    recipient: string
  }
): Promise<PendingDaoRewards> => {
  // Active distributors for a DAO.
  const distributors = (
    await queryClient.fetchQuery(
      daoDaoCoreQueries.listAllItems(queryClient, {
        chainId,
        contractAddress: daoAddress,
        args: {
          prefix: getRewardDistributorStorageItemKey(''),
        },
      })
    )
  ).map(([, value]) => value)

  // Fetch all distributions with pending rewards from all distributors.
  const distributions = (
    await Promise.all(
      distributors.map(
        async (address): Promise<PendingDaoRewards['distributions']> => {
          const [distributions, { pending_rewards }] = await Promise.all([
            queryClient.fetchQuery(
              daoRewardsDistributorExtraQueries.distributions(queryClient, {
                chainId,
                address,
              })
            ),
            queryClient.fetchQuery(
              daoRewardsDistributorExtraQueries.listAllPendingRewards(
                queryClient,
                {
                  chainId,
                  address,
                  recipient,
                }
              )
            ),
          ])

          return distributions.map((distribution) => ({
            distribution,
            rewards: HugeDecimal.from(
              pending_rewards.find((pending) => pending.id === distribution.id)
                ?.pending_rewards || 0
            ),
          }))
        }
      )
    )
  ).flat()

  const uniqueTokenSources = uniq(
    distributions.map(({ distribution }) =>
      serializeTokenSource(distribution.token)
    )
  )

  const rewards = await Promise.all(
    uniqueTokenSources.map(
      async (source): Promise<GenericTokenBalanceAndValue> => {
        // These should already be cached from the distributions query.
        const {
          token,
          usdPrice = 0,
          timestamp = new Date(),
        } = await queryClient
          .fetchQuery(
            tokenQueries.usdPrice(queryClient, deserializeTokenSource(source))
          )
          // If failed to load price, just load token info with no price.
          .catch(
            async (): Promise<GenericTokenWithUsdPrice> => ({
              token: await queryClient.fetchQuery(
                tokenQueries.info(queryClient, deserializeTokenSource(source))
              ),
            })
          )

        // Sum all pending rewards for this token.
        const allPendingRewards = distributions.reduce(
          (acc, { distribution, rewards }) =>
            acc.plus(
              tokenSourcesEqual(token, distribution.token) ? rewards : 0
            ),
          HugeDecimal.zero
        )

        const balance = allPendingRewards.toHumanReadableNumber(token.decimals)
        const usdValue = allPendingRewards.toUsdValue(token.decimals, usdPrice)

        return {
          token,
          balance,
          usdValue,
          timestamp,
        }
      }
    )
  )

  return {
    distributions,
    rewards,
  }
}

/**
 * Fetch v2.5.0 distributions recovery information.
 */
export const fetchV250DistributionRecoveryInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    daoAddress,
  }: {
    chainId: string
    daoAddress: string
  }
): Promise<V250RewardDistributorRecoveryInfo> => {
  const daoItems = Object.fromEntries(
    await queryClient.fetchQuery(
      daoDaoCoreQueries.listAllItems(queryClient, {
        chainId,
        contractAddress: daoAddress,
      })
    )
  )

  const distributors = (
    await Promise.all(
      getDaoRewardDistributors(daoItems).map(async ({ id, address }) => {
        const { info } = await queryClient.fetchQuery(
          contractQueries.info(queryClient, {
            chainId,
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

  const [
    /**
     * All current DAO members.
     */
    daoMembers,
    /**
     * All addresses that have claimed rewards or changed voting power since the
     * reward distribution was created.
     */
    userRewardStateMapAddresses,
  ] = await Promise.all([
    queryClient
      .fetchQuery(
        daoQueries.listMembers(queryClient, {
          chainId,
          address: daoAddress,
        })
      )
      .then((members) => members.map(({ address }) => address)),
    Promise.all(
      distributors.map(({ address }) =>
        queryClient.fetchQuery(
          indexerQueries.queryContract<
            Record<
              string,
              {
                pending_rewards: Record<string, string>
                accounted_for_rewards_puvp: Record<string, string>
              }
            >
          >(queryClient, {
            chainId,
            contractAddress: address,
            formula: 'map',
            args: {
              key: 'ur',
            },
            noFallback: true,
          })
        )
      )
    ).then((maps) =>
      maps.reduce((acc, map) => [...acc, ...Object.keys(map)], [] as string[])
    ),
  ])

  /**
   * The set of all current DAO members and all addresses that have claimed
   * rewards or changed voting power since the reward distribution was created
   * contains every address that may have pending rewards. This is because all
   * current DAO members may have pending rewards, and all past DAO members that
   * are no longer DAO members but were eligible for rewards at some point in
   * the past must have triggered a voting power change event and thus will show
   * up in the userRewardStateMap of the distributor.
   */
  const allAddresses = uniq([...daoMembers, ...userRewardStateMapAddresses])

  const data = await Promise.all(
    distributors.map(async (distributor) => {
      /**
       * Pending rewards for each address.
       */
      const allPendingRewards: {
        address: string
        pending: DistributionPendingRewards[]
      }[] = []
      const batch = 10
      for (let i = 0; i < allAddresses.length; i += batch) {
        const page = await Promise.all(
          allAddresses.slice(i, i + batch).map(async (recipient) => ({
            address: recipient,
            pending: (
              await queryClient.fetchQuery(
                daoRewardsDistributorExtraQueries.listAllPendingRewards(
                  queryClient,
                  {
                    chainId,
                    address: distributor.address,
                    recipient,
                  }
                )
              )
            ).pending_rewards,
          }))
        )

        allPendingRewards.push(...page)
      }

      const distributions = await queryClient
        .fetchQuery(
          daoRewardsDistributorExtraQueries.distributions(queryClient, {
            chainId,
            address: distributor.address,
          })
        )
        .then((distributions) =>
          Promise.all(
            distributions.map(
              async (
                distribution
              ): Promise<DistributionWithV250RecoveryInfo> => {
                const undistributed = await queryClient
                  .fetchQuery(
                    daoRewardsDistributorQueries.undistributedRewards({
                      chainId,
                      contractAddress: distributor.address,
                      args: {
                        id: distribution.id,
                      },
                    })
                  )
                  .then(HugeDecimal.from)

                // Sum all pending rewards for this distribution.
                const claimable = allPendingRewards.reduce(
                  (acc, { pending }) =>
                    acc.plus(
                      pending.find((p) => p.id === distribution.id)
                        ?.pending_rewards || HugeDecimal.zero
                    ),
                  HugeDecimal.zero
                )

                return {
                  distributor,
                  distribution,
                  claimable,
                  undistributed,
                }
              }
            )
          )
        )

      const tokens = await Promise.all(
        distributions
          // Combine all values from each distribution by token.
          .reduce(
            (acc, { distribution: { token }, claimable, undistributed }) => {
              const existing = acc.find((t) => tokensEqual(t.token, token))
              if (existing) {
                existing.claimable = existing.claimable.plus(claimable)
                existing.undistributed =
                  existing.undistributed.plus(undistributed)
              } else {
                acc.push({ distributor, token, claimable, undistributed })
              }
              return acc
            },
            [] as Omit<TokenWithV250RecoveryInfo, 'balance' | 'missed'>[]
          )
          // Calculate the missed rewards for each token.
          .map(async (info): Promise<TokenWithV250RecoveryInfo> => {
            const balance = await queryClient
              .fetchQuery(
                tokenQueries.balance(queryClient, {
                  chainId,
                  type: info.token.type,
                  denomOrAddress: info.token.denomOrAddress,
                  address: distributor.address,
                })
              )
              .then(({ balance }) => HugeDecimal.from(balance))

            // Missed rewards are the difference between what should be
            // distributed and what was actually distributed. In other words,
            // it's whatever is left in the distributor after accounting for all
            // undistributed and pending rewards.
            const missed = balance
              .minus(info.undistributed)
              .minus(info.claimable)

            return {
              ...info,
              balance,
              missed,
            }
          })
      )

      return {
        distributor,
        distributions,
        tokens,
      }
    })
  )

  const step = data.some(({ distributions }) =>
    distributions.some(
      ({ distribution, undistributed }) =>
        'linear' in distribution.active_epoch.emission_rate ||
        undistributed.isPositive()
    )
  )
    ? {
        step: 1 as const,
        needsPause: data.flatMap(({ distributions }) =>
          distributions.flatMap((d) =>
            'linear' in d.distribution.active_epoch.emission_rate ? d : []
          )
        ),
        needsWithdraw: data.flatMap(({ distributions }) =>
          distributions.flatMap((d) => (d.undistributed.isPositive() ? d : []))
        ),
      }
    : data.length > 0
      ? {
          step: 2 as const,
          needsUpgrade: distributors,
          needsForceWithdraw: data.flatMap(({ tokens }) =>
            tokens.flatMap((t) => (t.missed.isPositive() ? t : []))
          ),
          canBeResumed: data.flatMap(({ distributions }) =>
            distributions.flatMap((d) => {
              const savedEmissionRate = JSON.parse(
                daoItems[
                  getRewardDistributorSavedEmissionRateStorageItemKey(
                    d.distributor.address,
                    d.distribution.id
                  )
                ] || '{}'
              )

              return 'paused' in d.distribution.active_epoch.emission_rate &&
                objectMatchesStructure(savedEmissionRate, {
                  linear: {
                    amount: {},
                    continuous: {},
                    duration: {},
                  },
                })
                ? {
                    ...d,
                    savedEmissionRate,
                  }
                : []
            })
          ),
        }
      : {
          step: 'done' as const,
        }

  return {
    data,
    step,
  }
}

export const daoRewardsDistributorExtraQueries = {
  /**
   * Fetch a reward distribution.
   */
  distribution: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchDaoRewardDistribution>[1]
  ) =>
    queryOptions({
      queryKey: ['daoRewardsDistributorExtra', 'distribution', options],
      queryFn: () => fetchDaoRewardDistribution(queryClient, options),
    }),
  /**
   * Fetch all DAO reward distributions.
   */
  distributions: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchDaoRewardDistributions>[1]
  ) =>
    queryOptions({
      queryKey: ['daoRewardsDistributorExtra', 'distributions', options],
      queryFn: () => fetchDaoRewardDistributions(queryClient, options),
    }),
  /**
   * List all pending rewards.
   */
  listAllPendingRewards: (
    queryClient: QueryClient,
    options: Parameters<typeof listAllDaoRewardDistributorPendingRewards>[1]
  ) =>
    queryOptions({
      queryKey: [
        'daoRewardsDistributorExtra',
        'listAllPendingRewards',
        options,
      ],
      queryFn: () =>
        listAllDaoRewardDistributorPendingRewards(queryClient, options),
    }),
  /**
   * Fetch all DAO reward distributions.
   */
  allDistributions: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchAllDaoRewardDistributions>[1]
  ) =>
    queryOptions({
      queryKey: ['daoRewardsDistributorExtra', 'allDistributions', options],
      queryFn: () => fetchAllDaoRewardDistributions(queryClient, options),
    }),
  /**
   * Fetch all DAO reward distributions and pending rewards for an account.
   */
  pendingDaoRewards: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchPendingDaoRewards>[1]
  ) =>
    queryOptions({
      queryKey: ['daoRewardsDistributorExtra', 'pendingDaoRewards', options],
      queryFn: () => fetchPendingDaoRewards(queryClient, options),
    }),
  /**
   * Fetch v2.5.0 distributions recovery information.
   */
  v250DistributionRecoveryInfo: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchV250DistributionRecoveryInfo>[1]
  ) =>
    queryOptions({
      queryKey: [
        'daoRewardsDistributorExtra',
        'v250DistributionRecoveryInfo',
        options,
      ],
      queryFn: () => fetchV250DistributionRecoveryInfo(queryClient, options),
    }),
}
