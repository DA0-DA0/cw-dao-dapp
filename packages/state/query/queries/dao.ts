import {
  FetchQueryOptions,
  QueryClient,
  queryOptions,
  skipToken,
} from '@tanstack/react-query'

import {
  AmountWithTimestamp,
  ContractVersionInfo,
  DaoSource,
} from '@dao-dao/types'
import {
  SubDao,
  SubDaoWithChainId,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoDaoCore'
import {
  COMMUNITY_POOL_ADDRESS_PLACEHOLDER,
  DAO_CORE_CONTRACT_NAMES,
  getSupportedChainConfig,
  isConfiguredChainName,
} from '@dao-dao/utils'

import { SearchDaoProposalsOptions, searchDaoProposals } from '../../indexer'
import { accountQueries } from './account'
import { chainQueries } from './chain'
import { contractQueries } from './contract'
import { daoDaoCoreQueries } from './contracts/DaoDaoCore'
import { indexerQueries } from './indexer'
import { polytoneQueries } from './polytone'

/**
 * Fetch a DAO's TVL.
 */
export const fetchDaoTvl = async (
  queryClient: QueryClient,
  { chainId, coreAddress }: DaoSource
): Promise<AmountWithTimestamp> => {
  // Native chain x/gov module.
  if (isConfiguredChainName(chainId, coreAddress)) {
    coreAddress =
      // Use real gov DAO's address if exists.
      getSupportedChainConfig(chainId)?.govContractAddress ||
      COMMUNITY_POOL_ADDRESS_PLACEHOLDER
  }

  const { total: amount } = (await queryClient.fetchQuery(
    indexerQueries.snapper<{ total: number }>({
      query: 'daodao-tvl',
      parameters: {
        chainId,
        address: coreAddress,
      },
    })
  )) || {
    total: NaN,
  }

  return {
    amount,
    timestamp: Date.now(),
  }
}

/**
 * Fetch chain DAO voting power-shaped response.
 */
export const fetchChainVotingPower = async (
  queryClient: QueryClient,
  options: Parameters<typeof chainQueries.nativeStakedBalance>[0]
): Promise<VotingPowerAtHeightResponse> => ({
  power: (
    await queryClient.fetchQuery(chainQueries.nativeStakedBalance(options))
  ).amount,
  height: -1,
})

/**
 * Fetch chain DAO total power-shaped response.
 */
export const fetchChainTotalPower = async (
  queryClient: QueryClient,
  options: Parameters<typeof chainQueries.totalNativeStakedBalance>[0]
): Promise<TotalPowerAtHeightResponse> => ({
  power: await queryClient.fetchQuery(
    chainQueries.totalNativeStakedBalance(options)
  ),
  height: -1,
})

/**
 * List all SubDAOs for a DAO.
 */
export const listAllSubDaos = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    onlyAdmin,
  }: {
    chainId: string
    address: string
    /**
     * Only include SubDAOs that this DAO is the admin of, meaning this DAO can
     * execute on behalf of the SubDAO. Defaults to false.
     */
    onlyAdmin?: boolean
  }
): Promise<SubDaoWithChainId[]> => {
  const accounts = onlyAdmin
    ? await queryClient.fetchQuery(
        accountQueries.list(queryClient, {
          chainId,
          address,
        })
      )
    : []

  let subDaos: SubDao[] | undefined

  try {
    const indexerSubDaos = await queryClient.fetchQuery(
      indexerQueries.queryContract<SubDao[]>(queryClient, {
        chainId,
        contractAddress: address,
        formula: 'daoCore/listSubDaos',
      })
    )
    if (indexerSubDaos) {
      subDaos = indexerSubDaos
    }
  } catch (error) {
    console.error(error)
  }

  // If indexer query fails, fallback to contract query.
  if (!subDaos) {
    subDaos = []
    const limit = 30
    while (true) {
      const page = await queryClient.fetchQuery(
        daoDaoCoreQueries.listSubDaos({
          chainId,
          contractAddress: address,
          args: {
            limit,
            startAfter: subDaos.length
              ? subDaos[subDaos.length - 1]?.addr
              : undefined,
          },
        })
      )
      if (!page.length) {
        break
      }

      subDaos.push(...page)

      // If we have less than the limit of subDaos, we've exhausted them.
      if (page.length < limit) {
        break
      }
    }
  }

  const subDaosWithChainId = (
    await Promise.all(
      subDaos.map(async (subDao): Promise<SubDaoWithChainId | []> => {
        let subDaoChainId = chainId
        let subDaoAddress = subDao.addr

        let [isDao, isPolytoneProxy] = await Promise.all([
          queryClient.fetchQuery(
            contractQueries.isDao(queryClient, {
              chainId: subDaoChainId,
              address: subDaoAddress,
            })
          ),
          queryClient.fetchQuery(
            contractQueries.isPolytoneProxy(queryClient, {
              chainId: subDaoChainId,
              address: subDaoAddress,
            })
          ),
        ])

        // Reverse lookup polytone proxy and verify it's a DAO.
        if (isPolytoneProxy) {
          try {
            const { chainId: remoteChainId, remoteAddress } =
              await queryClient.fetchQuery(
                polytoneQueries.reverseLookupProxy(queryClient, {
                  chainId: subDaoChainId,
                  address: subDaoAddress,
                })
              )

            const remoteIsDao = await queryClient.fetchQuery(
              contractQueries.isDao(queryClient, {
                chainId: remoteChainId,
                address: remoteAddress,
              })
            )

            if (remoteIsDao) {
              isDao = true
              subDaoChainId = remoteChainId
              subDaoAddress = remoteAddress
            }
          } catch (error) {
            console.error(error)
          }
        }

        if (isDao) {
          // Filter SubDAO by admin if specified.
          if (onlyAdmin) {
            const admin = await queryClient.fetchQuery(
              daoDaoCoreQueries.admin(queryClient, {
                chainId: subDaoChainId,
                contractAddress: subDaoAddress,
              })
            )

            // Check if any of DAO's accounts are the admin. This ensures we
            // support cross-chain SubDAO/parent DAO relationships where
            // polytone proxies are used.
            const daoHasAdminAccount = accounts.some(
              (a) => a.chainId === subDaoChainId && a.address === admin
            )

            if (!daoHasAdminAccount) {
              return []
            }
          }

          return {
            chainId: subDaoChainId,
            addr: subDaoAddress,
            ...(subDao.charter !== undefined && {
              charter: subDao.charter,
            }),
          }
        }

        return []
      })
    )
  ).flat()

  return subDaosWithChainId
}

/**
 * List all DAOs a wallet is the admin of.
 */
export const listWalletAdminOfDaos = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<string[]> => {
  const walletAdminOfDaos = await queryClient.fetchQuery(
    indexerQueries.queryAccount(queryClient, {
      chainId,
      address,
      formula: 'daos/adminOf',
      noFallback: true,
    })
  )

  return walletAdminOfDaos && Array.isArray(walletAdminOfDaos)
    ? walletAdminOfDaos
    : []
}

/**
 * List all potential SubDAOs of the DAO.
 */
export const listPotentialSubDaos = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<string[]> => {
  const potentialSubDaos = await queryClient.fetchQuery(
    indexerQueries.queryContract<
      {
        contractAddress: string
        info: ContractVersionInfo
      }[]
    >(queryClient, {
      chainId,
      contractAddress: address,
      formula: 'daoCore/potentialSubDaos',
      noFallback: true,
    })
  )

  // Filter out those that do not appear to be DAO contracts and also the
  // contract itself since it is probably its own admin.
  return potentialSubDaos
    .filter(
      ({ contractAddress, info }) =>
        contractAddress !== address &&
        DAO_CORE_CONTRACT_NAMES.some((name) => info.contract.includes(name))
    )
    .map(({ contractAddress }) => contractAddress)
}

export const daoQueries = {
  /**
   * Fetch featured DAOs.
   */
  listFeatured: () =>
    indexerQueries.snapper<DaoSource[]>({
      query: 'daodao-featured-daos',
    }),
  /**
   * Fetch a DAO's TVL.
   */
  tvl: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchDaoTvl>[1]
  ): FetchQueryOptions<AmountWithTimestamp> => ({
    queryKey: ['dao', 'tvl', options],
    queryFn: () => fetchDaoTvl(queryClient, options),
  }),
  /**
   * Fetch chain DAO voting power-shaped response.
   */
  chainVotingPower: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchChainVotingPower>[1]
  ): FetchQueryOptions<VotingPowerAtHeightResponse> => ({
    queryKey: ['dao', 'chainVotingPower', options],
    queryFn: options
      ? () => fetchChainVotingPower(queryClient, options)
      : skipToken,
  }),
  /**
   * Fetch chain DAO total power-shaped response.
   */
  chainTotalPower: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchChainTotalPower>[1]
  ): FetchQueryOptions<TotalPowerAtHeightResponse> => ({
    queryKey: ['dao', 'chainTotalPower', options],
    queryFn: () => fetchChainTotalPower(queryClient, options),
  }),
  /**
   * List all SubDAOs for a DAO.
   */
  listAllSubDaos: (
    queryClient: QueryClient,
    options: Parameters<typeof listAllSubDaos>[1]
  ): FetchQueryOptions<SubDaoWithChainId[]> => ({
    queryKey: ['dao', 'listAllSubDaos', options],
    queryFn: () => listAllSubDaos(queryClient, options),
  }),
  /**
   * List all DAOs a wallet is the admin of.
   */
  listWalletAdminOfDaos: (
    queryClient: QueryClient,
    options: Parameters<typeof listWalletAdminOfDaos>[1]
  ): FetchQueryOptions<string[]> => ({
    queryKey: ['dao', 'listWalletAdminOfDaos', options],
    queryFn: () => listWalletAdminOfDaos(queryClient, options),
  }),
  /**
   * List all potential SubDAOs of the DAO.
   */
  listPotentialSubDaos: (
    queryClient: QueryClient,
    options: Parameters<typeof listPotentialSubDaos>[1]
  ): FetchQueryOptions<string[]> => ({
    queryKey: ['dao', 'listPotentialSubDaos', options],
    queryFn: () => listPotentialSubDaos(queryClient, options),
  }),
  /**
   * List all potential approval DAOs.
   */
  listPotentialApprovalDaos: (
    queryClient: QueryClient,
    {
      chainId,
      address,
    }: {
      chainId: string
      address: string
    }
  ) =>
    indexerQueries.queryContract<
      {
        dao: string
        preProposeAddress: string
      }[]
    >(queryClient, {
      chainId,
      contractAddress: address,
      formula: 'daoCore/approvalDaos',
      noFallback: true,
    }),
  /**
   * Search DAO proposals.
   */
  searchProposals: (options: SearchDaoProposalsOptions) =>
    queryOptions({
      queryKey: ['dao', 'searchProposals', options],
      queryFn: () => searchDaoProposals(options),
    }),
  /**
   * List all DAO members.
   */
  listMembers: (
    queryClient: QueryClient,
    {
      chainId,
      address,
    }: {
      chainId: string
      address: string
    }
  ) =>
    indexerQueries.queryContract<
      {
        address: string
        votingPowerPercent: number
      }[]
    >(queryClient, {
      chainId,
      contractAddress: address,
      formula: 'daoCore/listMembers',
      noFallback: true,
    }),
}
