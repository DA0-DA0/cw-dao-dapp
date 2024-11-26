import { QueryClient, queryOptions } from '@tanstack/react-query'

import { daoVoteDelegationQueries, indexerQueries } from '@dao-dao/state'
import { DelegateWithEntity, DelegationWithEntity } from '@dao-dao/types'
import {
  DelegateResponse,
  DelegatesResponse,
  DelegationResponse,
  DelegationsResponse,
} from '@dao-dao/types/contracts/DaoVoteDelegation'

import { entityQueries } from './entity'

/**
 * List all delegates.
 */
export const listAllDelegates = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<DelegateWithEntity[]> => {
  let delegates: DelegateResponse[] | undefined
  try {
    delegates = (
      await queryClient.fetchQuery(
        indexerQueries.queryContract<DelegatesResponse>(queryClient, {
          chainId,
          contractAddress: address,
          formula: 'daoVoteDelegation/delegates',
        })
      )
    ).delegates
  } catch (err) {
    console.error(err)
  }

  // If indexer query fails, fallback to contract query.
  if (!delegates) {
    delegates = []
    const limit = 30
    while (true) {
      const page = (
        await queryClient.fetchQuery(
          daoVoteDelegationQueries.delegates(queryClient, {
            chainId,
            contractAddress: address,
            args: {
              limit,
              startAfter: delegates[delegates.length - 1]?.delegate,
            },
          })
        )
      )?.delegates

      if (!page?.length) {
        break
      }

      delegates.push(...page)

      // If we have less than the limit of items, we've exhausted them.
      if (page.length < limit) {
        break
      }
    }
  }

  const delegatesWithEntities = await Promise.all(
    delegates.map(async (delegate): Promise<DelegateWithEntity> => {
      const entity = await queryClient.fetchQuery(
        entityQueries.info(queryClient, {
          chainId,
          address: delegate.delegate,
        })
      )

      return {
        ...delegate,
        entity,
      }
    })
  )

  return delegatesWithEntities
}

/**
 * List all delegations.
 */
export const listAllDelegations = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    delegator,
  }: {
    chainId: string
    address: string
    delegator: string
  }
): Promise<DelegationWithEntity[]> => {
  let delegations: DelegationResponse[] | undefined
  try {
    delegations = (
      await queryClient.fetchQuery(
        indexerQueries.queryContract<DelegationsResponse>(queryClient, {
          chainId,
          contractAddress: address,
          formula: 'daoVoteDelegation/delegations',
          args: {
            delegator,
          },
        })
      )
    ).delegations
  } catch (err) {
    console.error(err)
  }

  // If indexer query fails, fallback to contract query.
  if (!delegations) {
    delegations = []
    const limit = 30
    while (true) {
      const page = (
        await queryClient.fetchQuery(
          daoVoteDelegationQueries.delegations(queryClient, {
            chainId,
            contractAddress: address,
            args: {
              delegator,
              limit,
              offset: delegations.length,
            },
          })
        )
      )?.delegations

      if (!page?.length) {
        break
      }

      delegations.push(...page)

      // If we have less than the limit of items, we've exhausted them.
      if (page.length < limit) {
        break
      }
    }
  }

  const delegationsWithEntities = await Promise.all(
    delegations.map(async (delegation): Promise<DelegationWithEntity> => {
      const entity = await queryClient.fetchQuery(
        entityQueries.info(queryClient, {
          chainId,
          address: delegation.delegate,
        })
      )

      return {
        ...delegation,
        entity,
      }
    })
  )

  return delegationsWithEntities
}

export const delegationsQueries = {
  /**
   * List all delegates.
   */
  listAllDelegates: (
    queryClient: QueryClient,
    options: Parameters<typeof listAllDelegates>[1]
  ) =>
    queryOptions({
      queryKey: ['delegations', 'listAllDelegates', options],
      queryFn: () => listAllDelegates(queryClient, options),
    }),
  /**
   * List all delegations.
   */
  listAllDelegations: (
    queryClient: QueryClient,
    options: Parameters<typeof listAllDelegations>[1]
  ) =>
    queryOptions({
      queryKey: ['delegations', 'listAllDelegations', options],
      queryFn: () => listAllDelegations(queryClient, options),
    }),
}
