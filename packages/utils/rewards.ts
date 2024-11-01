import { DaoRewardDistribution, DaoRewardDistributor } from '@dao-dao/types'

import {
  DAO_REWARD_DISTRIBUTOR_ITEM_NAMESPACE,
  DAO_REWARD_DISTRIBUTOR_SAVED_EMISSION_RATE_ITEM_NAMESPACE,
} from './constants'
import { getFilteredDaoItemsByPrefix } from './dao'

/**
 * Get a unique key that identifies a distribution.
 *
 * @param address Reward distributor contract address.
 * @param id Reward distribution ID.
 * @returns A unique key that identifies the distribution.
 */
export const getRewardDistributionKey = (address: string, id: number): string =>
  [address, id].join(':')

/**
 * Get the key in the DAO storage items map for a reward distributor contract.
 *
 * @param id A unique identifier for the reward distributor contract.
 * @returns The key in the DAO storage items map for the reward distributor
 * contract with the given ID.
 */
export const getRewardDistributorStorageItemKey = (id: string): string =>
  [DAO_REWARD_DISTRIBUTOR_ITEM_NAMESPACE, id].join(':')

/**
 * Get the key in the DAO storage items map for a saved reward distribution
 * emission rate.
 *
 * @param address Reward distributor contract address.
 * @param id Reward distribution ID.
 * @returns The key in the DAO storage items map.
 */
export const getRewardDistributorSavedEmissionRateStorageItemKey = (
  address: string,
  id: number
): string =>
  [
    DAO_REWARD_DISTRIBUTOR_SAVED_EMISSION_RATE_ITEM_NAMESPACE,
    getRewardDistributionKey(address, id),
  ].join(':')

/**
 * Get the DAO reward distributors from the DAO storage items.
 *
 * @param items The DAO storage items.
 * @returns DAO reward distributors.
 */
export const getDaoRewardDistributors = (
  items: Record<string, string>
): DaoRewardDistributor[] =>
  getFilteredDaoItemsByPrefix(
    items,
    getRewardDistributorStorageItemKey('')
  ).map(
    ([id, address]): DaoRewardDistributor => ({
      id,
      address,
    })
  )

/**
 * Get unique key to identify a distribution.
 */
export const getUniqueRewardDistributionKey = (
  distribution: DaoRewardDistribution
): string => [distribution.address, distribution.id].join(':')
