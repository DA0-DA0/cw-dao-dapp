import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { SecretCwDao, getDao } from '@dao-dao/state/clients/dao'
import { useDaoIfAvailable, useUpdatingRef } from '@dao-dao/stateless'
import { DaoSource, IDaoBase } from '@dao-dao/types'

import { useWallet } from './useWallet'

export type UseDaoClientOptions = {
  /**
   * DAO to fetch the client for. If undefined, uses the current DAO context.
   * Otherwise, throws an error.
   */
  dao?: DaoSource
  /**
   * Whether or not to initialize the DAO client.
   *
   * Defaults to false.
   */
  initialize?: boolean
}

export type UseDaoClientReturn = {
  /**
   * DAO client.
   */
  dao: IDaoBase
  /**
   * Whether or not the DAO client initialization is loading.
   */
  initializing: boolean
  /**
   * Whether or not the DAO client was initialized.
   */
  initialized: boolean
  /**
   * Error that occurred during DAO client initialization.
   */
  error: Error | undefined
}

/**
 * Hook to get or create a DAO client. It will not be initialized.
 */
export const useDaoClient = ({
  dao: daoSource,
  initialize = false,
}: UseDaoClientOptions): UseDaoClientReturn => {
  const queryClient = useQueryClient()
  const currentDao = useDaoIfAvailable()

  // Extract chainId and coreAddress from DAO source so it memoizes properly.
  const sourceChainId = daoSource?.chainId
  const sourceCoreAddress = daoSource?.coreAddress
  const hasDaoSource = !!sourceChainId && !!sourceCoreAddress

  // Get DAO client. If matches current DAO context, use that one instead.
  const dao = useMemo(
    () =>
      currentDao &&
      (!hasDaoSource ||
        (currentDao.chainId === sourceChainId &&
          currentDao.coreAddress === sourceCoreAddress))
        ? currentDao
        : hasDaoSource
        ? getDao({
            queryClient,
            chainId: sourceChainId,
            coreAddress: sourceCoreAddress,
          })
        : undefined,
    [currentDao, hasDaoSource, queryClient, sourceChainId, sourceCoreAddress]
  )

  if (!dao) {
    throw new Error(
      'Cannot use useDaoClient hook with no DAO provided and when not in a DAO context.'
    )
  }

  // Register wallet offline signer if Secret DAO so it can request permits.
  const { isWalletConnected, signAmino } = useWallet()
  // Stabilize reference so callback doesn't change. This only needs to update
  // on wallet connection state change anyway.
  const signAminoRef = useUpdatingRef(signAmino)

  useEffect(() => {
    if (dao instanceof SecretCwDao && isWalletConnected) {
      dao.registerSignAmino(signAminoRef.current)
    }
  }, [dao, isWalletConnected, signAminoRef])

  // Start in loading state if client not initialized and we are initializing.
  const shouldInitialize = initialize && !dao.initialized
  const [_initializing, setInitializing] = useState(false)
  const initializing = _initializing || shouldInitialize

  const [error, setError] = useState<Error>()

  // Initialize client if not already initialized.
  useEffect(() => {
    if (shouldInitialize) {
      setInitializing(true)
      setError(undefined)
      dao
        .init()
        .catch((err) =>
          setError(err || new Error('Failed to initialize DAO client.'))
        )
        .finally(() => setInitializing(false))
    }
  }, [dao, shouldInitialize])

  return {
    dao,
    initializing,
    initialized: dao.initialized,
    error,
  }
}
