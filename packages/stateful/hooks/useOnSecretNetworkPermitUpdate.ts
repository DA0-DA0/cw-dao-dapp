import { useEffect, useState } from 'react'

import {
  SECRET_PERMIT_UPDATE_EVENT_PREFIX,
  SecretPermitUpdateEvent,
} from '@dao-dao/state/clients/dao/CwDao.secret'
import { useDaoIfAvailable, useUpdatingRef } from '@dao-dao/stateless'
import { DaoSource, PermitForPermitData } from '@dao-dao/types'
import { serializeDaoSource } from '@dao-dao/utils'

export type OnSecretNetworkPermitUpdateOptions = {
  /**
   * Optionally specify a DAO or DAOs to listen for permit updates for. If
   * undefined, the current DAO context will be used. If no DAO is specified and
   * the hook is not used in a DAO context, nothing will happen.
   */
  dao?: DaoSource | DaoSource[]
  /**
   * Whether or not to re-render the component when the permit is updated.
   * Defaults to true.
   */
  reRender?: boolean
  /**
   * An optional callback to execute when the permit is updated. This is
   * automatically memoized.
   */
  callback?: (permit: PermitForPermitData) => void
}

/**
 * A hook that listens for a Secret Network Permit update for the current DAO
 * and re-renders or executes a callback when detected.
 */
export const useOnSecretNetworkPermitUpdate = ({
  dao,
  reRender = true,
  callback,
}: OnSecretNetworkPermitUpdateOptions = {}) => {
  const currentDaoSource = useDaoIfAvailable()?.source

  // Memoize callback into a ref.
  const callbackRef = useUpdatingRef(callback)

  const [_, setForceRender] = useState(-1)

  const daoSource = dao || currentDaoSource
  useEffect(() => {
    if (typeof window === 'undefined' || !daoSource) {
      return
    }

    const types = [daoSource]
      .flat()
      .map((dao) => SECRET_PERMIT_UPDATE_EVENT_PREFIX + serializeDaoSource(dao))

    const listener = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        console.error('Unexpected event for Secret Network permit update.')
        return
      }

      const { permit } = event.detail as SecretPermitUpdateEvent

      // Re-render the component by changing a state variable.
      if (reRender) {
        setForceRender((prev) => prev * -1)
      }

      // Call the callback if provided.
      callbackRef.current?.(permit)
    }

    types.forEach((type) => window.addEventListener(type, listener))
    return () => {
      types.forEach((type) => window.removeEventListener(type, listener))
    }
  }, [callbackRef, daoSource, reRender])
}
