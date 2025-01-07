import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useDaoIfAvailable } from '@dao-dao/stateless'
import { DaoSource, IDaoBase } from '@dao-dao/types'

import { getDao } from '../clients/dao'

export type UseDaoClientOptions = {
  /**
   * DAO to fetch the client for. If undefined, uses the current DAO context.
   * Otherwise, throws an error.
   */
  dao?: DaoSource
}

export type UseDaoClientReturn = {
  /**
   * DAO client.
   */
  dao: IDaoBase
}

/**
 * Hook to get or create a DAO client. It will not be initialized.
 */
export const useDaoClient = ({
  dao: daoSource,
}: UseDaoClientOptions): UseDaoClientReturn => {
  const queryClient = useQueryClient()
  const currentDao = useDaoIfAvailable()

  // Get DAO client. If matches current DAO context, use that one instead.
  const dao = useMemo(
    () =>
      currentDao &&
      (!daoSource ||
        (currentDao.chainId === daoSource.chainId &&
          currentDao.coreAddress === daoSource.coreAddress))
        ? currentDao
        : daoSource
          ? getDao({
              queryClient,
              chainId: daoSource.chainId,
              coreAddress: daoSource.coreAddress,
            })
          : undefined,
    [currentDao, daoSource, queryClient]
  )

  if (!dao) {
    throw new Error(
      'Cannot use useDaoClient hook with no DAO provided and when not in a DAO context.'
    )
  }

  return {
    dao,
  }
}
