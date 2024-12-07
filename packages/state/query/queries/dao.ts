import {
  FetchQueryOptions,
  QueryClient,
  queryOptions,
  skipToken,
} from '@tanstack/react-query'

import {
  AmountWithTimestamp,
  ContractVersion,
  ContractVersionInfo,
  DaoInfo,
  DaoParentInfo,
  DaoSource,
  Feature,
  InfoResponse,
} from '@dao-dao/types'
import {
  ProposalModuleWithInfo,
  SubDao,
  SubDaoWithChainId,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoDaoCore'
import {
  COMMUNITY_POOL_ADDRESS_PLACEHOLDER,
  DAO_CORE_CONTRACT_NAMES,
  getCosmWasmClientForChainId,
  getDaoInfoForChainId,
  getFallbackImage,
  getSupportedChainConfig,
  indexToProposalModulePrefix,
  isConfiguredChainName,
  isFeatureSupportedByVersion,
  parseContractVersion,
  polytoneNoteProxyMapToChainIdMap,
} from '@dao-dao/utils'

import { CwCoreV1QueryClient, DaoDaoCoreQueryClient } from '../../contracts'
import { SearchDaoProposalsOptions, searchDaoProposals } from '../../indexer'
import { accountQueries } from './account'
import { chainQueries } from './chain'
import { contractQueries } from './contract'
import { daoDaoCoreQueries } from './contracts/DaoDaoCore'
import { votingModuleQueries } from './contracts/votingModule'
import { indexerQueries } from './indexer'
import { polytoneQueries } from './polytone'

/**
 * Fetch DAO info.
 */
export const fetchDaoInfo = async (
  queryClient: QueryClient,
  { chainId, coreAddress }: DaoSource
): Promise<DaoInfo> => {
  // Native chain governance.
  if (isConfiguredChainName(chainId, coreAddress)) {
    // Use real gov DAO's address if exists.
    const chainConfigGovAddress =
      getSupportedChainConfig(chainId)?.govContractAddress
    if (chainConfigGovAddress) {
      coreAddress = chainConfigGovAddress
    } else {
      // Use chain x/gov module info.
      const govModuleAddress = await queryClient.fetchQuery(
        chainQueries.moduleAddress({
          chainId,
          name: 'gov',
        })
      )
      const accounts = await queryClient.fetchQuery(
        accountQueries.list(queryClient, {
          chainId,
          address: govModuleAddress,
        })
      )

      return getDaoInfoForChainId(chainId, accounts)
    }
  }

  // Get DAO info from contract.

  const [state, contractAdmin] = await Promise.all([
    queryClient.fetchQuery(
      daoDaoCoreQueries.dumpState(queryClient, {
        chainId,
        contractAddress: coreAddress,
      })
    ),
    queryClient.fetchQuery(
      contractQueries.admin({
        chainId,
        address: coreAddress,
      })
    ),
  ])

  const coreVersion = parseContractVersion(state.version.version)

  const [
    parentDao,
    { info: votingModuleInfo },
    created,
    proposalModules,
    _items,
    polytoneProxies,
    accounts,
    isActive,
    activeThreshold,
  ] = await Promise.all([
    state.admin && state.admin !== coreAddress
      ? queryClient
          .fetchQuery(
            daoQueries.parentInfo(queryClient, {
              chainId,
              parentAddress: state.admin,
              subDaoAddress: coreAddress,
            })
          )
          .catch(() => null)
      : null,
    // Check if indexer returned this already.
    'votingModuleInfo' in state
      ? ({ info: state.votingModuleInfo } as InfoResponse)
      : queryClient.fetchQuery(
          contractQueries.info(queryClient, {
            chainId,
            address: state.voting_module,
          })
        ),
    // Check if indexer returned this already.
    'createdAt' in state && state.createdAt
      ? Date.parse(state.createdAt)
      : queryClient
          .fetchQuery(
            contractQueries.instantiationTime(queryClient, {
              chainId,
              address: coreAddress,
            })
          )
          .catch(() => null),
    queryClient.fetchQuery(
      daoQueries.proposalModules(queryClient, {
        chainId,
        coreAddress,
      })
    ),
    queryClient.fetchQuery(
      daoDaoCoreQueries.listAllItems(queryClient, {
        chainId,
        contractAddress: coreAddress,
      })
    ),
    // Check if indexer returned this already.
    'polytoneProxies' in state && state.polytoneProxies
      ? polytoneNoteProxyMapToChainIdMap(chainId, state.polytoneProxies)
      : queryClient.fetchQuery(
          polytoneQueries.proxies(queryClient, {
            chainId,
            address: coreAddress,
          })
        ),
    queryClient.fetchQuery(
      accountQueries.list(queryClient, {
        chainId,
        address: coreAddress,
      })
    ),

    // Some voting modules don't support the active threshold queries, so if the
    // queries fail, assume active and no threshold.
    queryClient
      .fetchQuery(
        votingModuleQueries.isActive({
          chainId,
          address: state.voting_module,
        })
      )
      // If isActive query fails, just assume it is.
      .catch(() => true),
    queryClient
      .fetchQuery(
        votingModuleQueries.activeThresold(queryClient, {
          chainId,
          address: state.voting_module,
        })
      )
      .then(({ active_threshold }) => active_threshold || null)
      .catch(() => null),
  ])

  // Convert items list into map.
  const items = Object.fromEntries(_items)

  return {
    chainId,
    coreAddress,
    coreVersion,
    votingModuleAddress: state.voting_module,
    votingModuleInfo,
    proposalModules: proposalModules.sort((a, b) =>
      a.prefix.localeCompare(b.prefix)
    ),
    contractAdmin,
    admin: state.admin || '',
    name: state.config.name,
    description: state.config.description,
    imageUrl: state.config.image_url || getFallbackImage(coreAddress),
    created,
    isActive,
    activeThreshold,
    items,
    polytoneProxies,
    accounts,
    parentDao,
  }
}

/**
 * Fetch DAO parent info.
 */
export const fetchDaoParentInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    parentAddress,
    subDaoAddress,
    ignoreParents,
  }: {
    chainId: string
    parentAddress: string
    /**
     * To determine if the parent has registered the subDAO, pass the subDAO.
     * This will set `registeredSubDao` appropriately. Otherwise, if undefined,
     * `registeredSubDao` will be set to false.
     */
    subDaoAddress?: string
    /**
     * Prevent infinite loop if DAO SubDAO loop exists.
     */
    ignoreParents?: string[]
  }
): Promise<DaoParentInfo> => {
  let parentChainId = chainId
  let parentDaoAddress = parentAddress
  let polytoneProxy: string | null = null

  // If address is a DAO contract...
  let [isDao, isPolytoneProxy] = await Promise.all([
    queryClient.fetchQuery(
      contractQueries.isDao(queryClient, {
        chainId: parentChainId,
        address: parentDaoAddress,
      })
    ),
    queryClient.fetchQuery(
      contractQueries.isPolytoneProxy(queryClient, {
        chainId: parentChainId,
        address: parentDaoAddress,
      })
    ),
  ])

  if (isPolytoneProxy) {
    const { chainId: remoteChainId, remoteAddress } =
      await queryClient.fetchQuery(
        polytoneQueries.reverseLookupProxy(queryClient, {
          chainId: parentChainId,
          address: parentDaoAddress,
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
      polytoneProxy = parentAddress
      parentChainId = remoteChainId
      parentDaoAddress = remoteAddress
    }
  }

  if (isDao) {
    const [parentVersion, parentAdmin, { name, image_url }] = await Promise.all(
      [
        queryClient
          .fetchQuery(
            contractQueries.info(queryClient, {
              chainId: parentChainId,
              address: parentDaoAddress,
            })
          )
          .then(({ info }) => parseContractVersion(info.version)),
        queryClient.fetchQuery(
          daoDaoCoreQueries.admin(queryClient, {
            chainId: parentChainId,
            contractAddress: parentDaoAddress,
          })
        ),
        queryClient.fetchQuery(
          daoDaoCoreQueries.config(queryClient, {
            chainId: parentChainId,
            contractAddress: parentDaoAddress,
          })
        ),
      ]
    )

    // Check if parent has registered the SubDAO.
    const registeredSubDao =
      !!subDaoAddress &&
      isFeatureSupportedByVersion(Feature.SubDaos, parentVersion) &&
      (
        await queryClient.fetchQuery(
          daoQueries.listAllSubDaos(queryClient, {
            chainId: parentChainId,
            address: parentDaoAddress,
          })
        )
      ).some(({ addr }) => addr === subDaoAddress)

    // Recursively fetch parent.
    const parentDao =
      parentAdmin && parentAdmin !== parentDaoAddress
        ? await queryClient
            .fetchQuery(
              daoQueries.parentInfo(queryClient, {
                chainId: parentChainId,
                parentAddress: parentAdmin,
                subDaoAddress: parentDaoAddress,
                // Add address to ignore list to prevent infinite loops.
                ignoreParents: [...(ignoreParents || []), parentDaoAddress],
              })
            )
            .catch(() => null)
        : null

    return {
      chainId: parentChainId,
      coreAddress: parentDaoAddress,
      coreVersion: parentVersion,
      name,
      imageUrl: image_url || getFallbackImage(parentDaoAddress),
      admin: parentAdmin ?? '',
      registeredSubDao,
      parentDao,
      polytoneProxy,
    }
  } else {
    // If address is the chain's x/gov module...
    const isGov = await queryClient.fetchQuery(
      chainQueries.isAddressModule(queryClient, {
        chainId,
        address: parentAddress,
        moduleName: 'gov',
      })
    )
    if (isGov) {
      const chainDaoInfo = getDaoInfoForChainId(chainId, [])
      return {
        chainId,
        coreAddress: chainDaoInfo.coreAddress,
        coreVersion: chainDaoInfo.coreVersion,
        name: chainDaoInfo.name,
        imageUrl: chainDaoInfo.imageUrl,
        admin: '',
        registeredSubDao:
          !!subDaoAddress &&
          !!getSupportedChainConfig(chainId)?.subDaos?.includes(subDaoAddress),
        parentDao: null,
        polytoneProxy: null,
      }
    }
  }

  throw new Error('Parent is not a DAO nor the chain governance module')
}

/**
 * Fetch DAO info for all of a DAO's SubDAOs.
 */
export const fetchSubDaoInfos = async (
  queryClient: QueryClient,
  { chainId, coreAddress }: DaoSource
): Promise<DaoInfo[]> => {
  const subDaos = await queryClient.fetchQuery(
    daoQueries.listAllSubDaos(queryClient, {
      chainId,
      address: coreAddress,
    })
  )

  return await Promise.all(
    subDaos.map(({ chainId, addr }) =>
      queryClient.fetchQuery(
        daoQueries.info(queryClient, { chainId, coreAddress: addr })
      )
    )
  )
}

/**
 * Fetch DAO info for all of a chain's SubDAOs.
 */
export const fetchChainSubDaoInfos = (
  queryClient: QueryClient,
  { chainId }: { chainId: string }
): Promise<DaoInfo[]> =>
  Promise.all(
    (getSupportedChainConfig(chainId)?.subDaos || []).map((coreAddress) =>
      queryClient.fetchQuery(
        daoQueries.info(queryClient, { chainId, coreAddress })
      )
    )
  )

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

export const fetchProposalModules = async (
  queryClient: QueryClient,
  {
    chainId,
    coreAddress,
  }: {
    chainId: string
    coreAddress: string
  }
): Promise<ProposalModuleWithInfo[]> => {
  // Try indexer first.
  try {
    return await queryClient.fetchQuery(
      indexerQueries.queryContract(queryClient, {
        chainId,
        contractAddress: coreAddress,
        formula: 'daoCore/activeProposalModules',
      })
    )
  } catch (err) {
    // Ignore error.
    console.error(err)
  }

  // If indexer fails, fallback to querying chain.
  const cwClient = await getCosmWasmClientForChainId(chainId)

  const proposalModules: ProposalModuleWithInfo[] = []
  const limit = 10

  const getV1ProposalModules = async () =>
    Promise.all(
      (
        await new CwCoreV1QueryClient(cwClient, coreAddress).proposalModules({
          startAt:
            proposalModules.length > 0
              ? proposalModules[proposalModules.length - 1].address
              : undefined,
          limit,
        })
      )
        // Ignore first address if startAt was set.
        .slice(proposalModules.length > 0 ? 1 : 0)
        .map(async (address, index) => {
          const { info } = await queryClient.fetchQuery(
            contractQueries.info(queryClient, {
              chainId,
              address,
            })
          )

          return {
            address,
            prefix: indexToProposalModulePrefix(index),
            // V1 are all enabled.
            status: 'Enabled' as const,
            info,
          }
        })
    )

  const getV2ProposalModules = async () =>
    Promise.all(
      (
        await new DaoDaoCoreQueryClient(
          cwClient,
          coreAddress
        ).activeProposalModules({
          startAfter:
            proposalModules.length > 0
              ? proposalModules[proposalModules.length - 1].address
              : undefined,
          limit,
        })
      ).map(async (data) => {
        const { info } = await queryClient.fetchQuery(
          contractQueries.info(queryClient, {
            chainId,
            address: data.address,
          })
        )

        return {
          ...data,
          info,
        }
      })
    )

  const { info } = await queryClient.fetchQuery(
    contractQueries.info(queryClient, {
      chainId,
      address: coreAddress,
    })
  )
  const coreVersion = parseContractVersion(info.version)
  const fetcher =
    coreVersion === ContractVersion.V1
      ? getV1ProposalModules
      : getV2ProposalModules

  while (true) {
    const _proposalModules = await fetcher()
    proposalModules.push(..._proposalModules)
    if (_proposalModules.length < limit) {
      break
    }
  }

  return proposalModules
}

export const daoQueries = {
  /**
   * Fetch DAO info.
   */
  info: (
    queryClient: QueryClient,
    /**
     * If undefined, query will be disabled.
     */
    options?: Parameters<typeof fetchDaoInfo>[1]
  ) =>
    queryOptions({
      queryKey: ['dao', 'info', options],
      queryFn: options ? () => fetchDaoInfo(queryClient, options) : skipToken,
    }),
  /**
   * Fetch DAO parent info.
   */
  parentInfo: (
    queryClient: QueryClient,
    /**
     * If undefined, query will be disabled.
     */
    options?: Parameters<typeof fetchDaoParentInfo>[1]
  ) =>
    queryOptions({
      queryKey: ['dao', 'parentInfo', options],
      queryFn: options
        ? () => fetchDaoParentInfo(queryClient, options)
        : skipToken,
    }),
  /**
   * Fetch DAO info for all of a DAO's SubDAOs.
   */
  subDaoInfos: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchSubDaoInfos>[1]
  ) =>
    queryOptions({
      queryKey: ['dao', 'subDaoInfos', options],
      queryFn: () => fetchSubDaoInfos(queryClient, options),
    }),
  /**
   * Fetch DAO info for all of a chain's SubDAOs.
   */
  chainSubDaoInfos: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchChainSubDaoInfos>[1]
  ) =>
    queryOptions({
      queryKey: ['dao', 'chainSubDaoInfos', options],
      queryFn: () => fetchChainSubDaoInfos(queryClient, options),
    }),
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
  /**
   * Load proposal modules with info.
   */
  proposalModules: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchProposalModules>[1]
  ) => ({
    queryKey: ['dao', 'proposalModules', options],
    queryFn: () => fetchProposalModules(queryClient, options),
  }),
}
