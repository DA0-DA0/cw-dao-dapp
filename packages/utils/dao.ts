import { TFunction } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  AccountType,
  BreadcrumbCrumb,
  DaoDropdownInfo,
  DaoInfo,
  DaoParentInfo,
  DaoRewardDistribution,
  DaoSource,
  DaoWebSocketChannelInfo,
  PolytoneProxies,
} from '@dao-dao/types'
import { InstantiateMsg as DaoDaoCoreInstantiateMsg } from '@dao-dao/types/contracts/DaoDaoCore'
import { EmissionRate } from '@dao-dao/types/contracts/DaoRewardsDistributor'

import { getAccountAddress } from './account'
import { getDisplayNameForChainId, getSupportedChainConfig } from './chain'
import { convertDurationToHumanReadableString } from './conversion'

export const getParentDaoBreadcrumbs = (
  getDaoPath: (coreAddress: string) => string,
  parentDao: DaoParentInfo | null | undefined
): BreadcrumbCrumb[] =>
  parentDao
    ? [
        ...getParentDaoBreadcrumbs(getDaoPath, parentDao.parentDao),
        {
          href: getDaoPath(parentDao.coreAddress),
          label: parentDao.name,
        },
      ]
    : []

export const webSocketChannelNameForDao = ({
  chainId,
  coreAddress,
}: DaoWebSocketChannelInfo) => `${chainId}_${coreAddress}`

export const polytoneNoteProxyMapToChainIdMap = (
  // Source chain
  chainId: string,
  // Map of polytone note on source chain to remote polytone proxies.
  polytoneNoteProxyMap: Record<string, string>
): PolytoneProxies => {
  // Convert to chain ID to proxy map based on polytone connections.
  return Object.entries(
    getSupportedChainConfig(chainId)?.polytone || {}
  ).reduce((acc, [chainId, { note }]) => {
    const proxy = polytoneNoteProxyMap[note]

    return {
      ...acc,
      ...(proxy
        ? {
            [chainId]: proxy,
          }
        : {}),
    }
  }, {} as PolytoneProxies)
}

export const getFundsFromDaoInstantiateMsg = ({
  voting_module_instantiate_info,
  proposal_modules_instantiate_info,
}: Pick<
  DaoDaoCoreInstantiateMsg,
  'voting_module_instantiate_info' | 'proposal_modules_instantiate_info'
>) => [
  ...(voting_module_instantiate_info.funds || []),
  ...proposal_modules_instantiate_info.flatMap(({ funds }) => funds || []),
]

/**
 * Filter DAO items by prefix and remove the prefix from the key.
 *
 * @param items A DAO items object.
 * @param prefix The prefix to filter by.
 * @returns An array of filtered items in the form of [key, value].
 */
export const getFilteredDaoItemsByPrefix = (
  items: Record<string, string>,
  prefix: string
): [string, string][] =>
  Object.entries(items).flatMap(([key, value]) =>
    key.startsWith(prefix) ? [[key.substring(prefix.length), value]] : []
  )

/**
 * Keep SubDAOs in the dropdown that are in the list to keep. This helper
 * function is used in `followingDaoDropdownInfosSelector`.
 */
export const keepSubDaosInDropdown = (
  daos: DaoDropdownInfo[],
  keepDaos: DaoSource[]
): DaoDropdownInfo[] =>
  daos.map((dao) => ({
    ...dao,
    subDaos: dao.subDaos
      ? // Recurse into SubDAOs of SubDAOs.
        keepSubDaosInDropdown(
          // Only keep followed SubDAOs.
          dao.subDaos.filter((subDao) =>
            keepDaos.some((keep) => daoSourcesEqual(subDao, keep))
          ),
          keepDaos
        )
      : undefined,
  }))

/**
 * Check if a DAO exists as a SubDAO in the list of DAO dropdowns. This helper
 * function is used in `followingDaoDropdownInfosSelector`.
 */
export const subDaoExistsInDropdown = (
  daos: DaoDropdownInfo[],
  subDaoAddress: string
): boolean =>
  daos.some((dao) =>
    dao.subDaos?.some(
      ({ coreAddress, subDaos }) =>
        coreAddress === subDaoAddress ||
        (subDaos && subDaoExistsInDropdown(subDaos, subDaoAddress))
    )
  )

/**
 * Serialize DaoSource into a string. Since DaoSource is a subset of many other
 * DAO object types, this will work for all of them and extract the unique
 * variables that identify a DAO.
 */
export const serializeDaoSource = ({
  chainId,
  coreAddress,
}: DaoSource): string => `${chainId}:${coreAddress}`

/**
 * Deserialize DaoSource from a string.
 */
export const deserializeDaoSource = (serialized: string): DaoSource => {
  const [chainId, coreAddress] = serialized.split(':')
  if (!chainId || !coreAddress) {
    throw new Error('Invalid FollowedDao')
  }

  return {
    chainId,
    coreAddress,
  }
}

/**
 * Returns whether or not two DaoSources are equal.
 */
export const daoSourcesEqual = (a: DaoSource, b: DaoSource): boolean =>
  a.chainId === b.chainId && a.coreAddress === b.coreAddress

/**
 * Get the label for a reward distribution.
 */
export const getHumanReadableRewardDistributionLabel = (
  t: TFunction,
  distribution: DaoRewardDistribution,
  /**
   * Override emission rate display.
   */
  emissionRate: EmissionRate = distribution.active_epoch.emission_rate
): string =>
  `${distribution.token.symbol} / ${
    'immediate' in emissionRate
      ? t('title.immediate')
      : 'paused' in emissionRate
        ? t('title.paused')
        : t('info.amountEveryDuration', {
            amount: HugeDecimal.from(
              emissionRate.linear.amount
            ).toInternationalizedHumanReadableString({
              decimals: distribution.token.decimals,
            }),
            duration: convertDurationToHumanReadableString(
              t,
              emissionRate.linear.duration
            ),
          })
  }`

/**
 * Get the DAO address for a chain ID, prioritizing native accounts.
 */
export const getDaoAddressForChainId = (dao: DaoInfo, chainId: string) => {
  // If chain ID is empty (user or client error I believe when using the Apps
  // interface), just return core DAO address since the not found error won't be
  // helpful.
  if (!chainId) {
    console.error(
      '`chainId` should not be empty in `addressForChainId`, but it is. Returning core DAO address.'
    )
    return dao.coreAddress
  }

  const address =
    getAccountAddress({
      accounts: dao.accounts,
      chainId,
      types: [AccountType.Base, AccountType.Polytone],
    }) ||
    // Fallback to ICA if exists, but don't use if a native or polytone
    // account exists.
    getAccountAddress({
      accounts: dao.accounts,
      chainId,
      types: [AccountType.Ica],
    })

  if (!address) {
    throw new Error(
      `DAO is missing an account on ${getDisplayNameForChainId(
        chainId
      )} (${chainId}).`
    )
  }

  return address
}
