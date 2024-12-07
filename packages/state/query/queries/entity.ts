import { QueryClient, queryOptions, skipToken } from '@tanstack/react-query'

import { Entity, EntityType } from '@dao-dao/types'
import {
  getChainForChainId,
  getFallbackImage,
  getImageUrlForChainId,
  isValidWalletAddress,
} from '@dao-dao/utils'

import { chainQueries } from './chain'
import { contractQueries } from './contract'
import { cw1WhitelistExtraQueries } from './contracts/Cw1Whitelist.extra'
import { daoQueries } from './dao'
import { polytoneQueries } from './polytone'
import { profileQueries } from './profile'

/**
 * Fetch entity information for any address on any chain.
 */
export const fetchEntityInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    ignoreEntities,
  }: {
    chainId: string
    address: string
    /**
     * Prevent infinite loop if cw1-whitelist nests itself.
     */
    ignoreEntities?: string[]
  }
): Promise<Entity> => {
  const { bech32Prefix } = getChainForChainId(chainId)

  // Check if address is module account.
  const moduleName = await queryClient
    .fetchQuery(
      chainQueries.moduleName({
        chainId,
        address,
      })
    )
    .catch(() => null)
  if (moduleName) {
    const entity: Entity = {
      type: EntityType.Module,
      chainId,
      address,
      name: moduleName,
      imageUrl: getImageUrlForChainId(chainId),
    }
    return entity
  }

  const [
    daoInfo,
    entityFromPolytoneProxy,
    walletProfile,
    cw1WhitelistAdminEntities,
  ] = await Promise.all([
    // Attempt to load DAO.
    queryClient
      .fetchQuery(
        contractQueries.isDao(queryClient, {
          chainId,
          address,
        })
      )
      .then((isDao) =>
        isDao
          ? queryClient.fetchQuery(
              daoQueries.info(queryClient, {
                chainId,
                coreAddress: address,
              })
            )
          : undefined
      )
      .catch(() => undefined),
    // Attempt to load polytone proxy.
    queryClient
      .fetchQuery(
        contractQueries.isPolytoneProxy(queryClient, {
          chainId,
          address,
        })
      )
      .then(async (isPolytoneProxy): Promise<Entity | undefined> => {
        if (!isPolytoneProxy) {
          return
        }

        const controller = await queryClient.fetchQuery(
          polytoneQueries.reverseLookupProxy(queryClient, {
            chainId,
            address,
          })
        )

        return {
          ...(await queryClient.fetchQuery(
            entityQueries.info(queryClient, {
              chainId: controller.chainId,
              address: controller.remoteAddress,
            })
          )),
          polytoneProxy: {
            chainId,
            address,
          },
        }
      })
      .catch(() => undefined),
    // Attempt to load wallet profile.
    isValidWalletAddress(address, bech32Prefix)
      ? queryClient.fetchQuery(
          profileQueries.unified(queryClient, {
            chainId,
            address,
          })
        )
      : undefined,
    // Attempt to load cw1-whitelist admins.
    queryClient
      .fetchQuery(
        cw1WhitelistExtraQueries.adminsIfCw1Whitelist(queryClient, {
          chainId,
          address,
        })
      )
      .then((admins): Promise<Entity[]> | undefined => {
        if (!admins) {
          return
        }

        return Promise.all(
          admins.map((admin) =>
            ignoreEntities?.includes(admin)
              ? // Placeholder entity to prevent infinite loop.
                {
                  chainId,
                  type: EntityType.Wallet,
                  address: admin,
                  name: null,
                  imageUrl: getFallbackImage(admin),
                }
              : queryClient.fetchQuery(
                  entityQueries.info(queryClient, {
                    chainId,
                    address: admin,
                    // Add address to ignore list to prevent infinite loops.
                    ignoreEntities: [...(ignoreEntities || []), address],
                  })
                )
          )
        )
      })
      .catch(() => undefined),
  ])

  if (daoInfo) {
    return {
      type: EntityType.Dao,
      daoInfo,
      chainId,
      address,
      name: daoInfo.name,
      imageUrl: daoInfo.imageUrl || getFallbackImage(address),
    }
  } else if (entityFromPolytoneProxy) {
    return entityFromPolytoneProxy
  } else if (cw1WhitelistAdminEntities) {
    return {
      type: EntityType.Cw1Whitelist,
      chainId,
      address,
      name: null,
      imageUrl: getFallbackImage(address),
      entities: cw1WhitelistAdminEntities,
    }
  } else {
    // Default to wallet.
    return {
      type: EntityType.Wallet,
      chainId,
      address,
      name: walletProfile?.name || null,
      imageUrl: walletProfile?.imageUrl || getFallbackImage(address),
      profile: walletProfile,
    }
  }
}

export const entityQueries = {
  /**
   * Fetch entity.
   */
  info: (
    queryClient: QueryClient,
    // If undefined, query will be disabled.
    options?: Parameters<typeof fetchEntityInfo>[1]
  ) =>
    queryOptions({
      queryKey: ['entity', 'info', options],
      queryFn: options
        ? () => fetchEntityInfo(queryClient, options)
        : skipToken,
    }),
}
