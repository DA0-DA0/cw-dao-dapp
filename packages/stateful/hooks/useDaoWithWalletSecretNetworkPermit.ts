import { useCallback, useEffect, useMemo, useState } from 'react'

import { SecretCwDao } from '@dao-dao/state/clients/dao'
import { useUpdatingRef } from '@dao-dao/stateless'
import { DaoSource, IDaoBase, PermitForPermitData } from '@dao-dao/types'
import { isSecretNetwork } from '@dao-dao/utils'

import { useDaoClient } from './useDaoClient'
import { useOnSecretNetworkPermitUpdate } from './useOnSecretNetworkPermitUpdate'
import { UseWalletOptions, UseWalletReturn, useWallet } from './useWallet'

export type UseWalletWithSecretNetworkPermitOptions = Omit<
  UseWalletOptions,
  'chainId'
> & {
  /**
   * DAO to fetch the permit for, or the current DAO context.
   */
  dao?: DaoSource
}

export type UseWalletWithSecretNetworkPermitReturn = UseWalletReturn & {
  /**
   * Whether or not the current chain is Secret Network.
   */
  isSecretNetwork: boolean
  /**
   * Whether or not a permit is needed. This is true when the wallet is
   * connected, the DAO is on Secret Network, and no permit has been found for
   * the current DAO in the browser.
   */
  isSecretNetworkPermitNeeded: boolean
  /**
   * DAO client.
   */
  dao: IDaoBase
  /**
   * Permit saved for the given DAO, if exists.
   */
  permit: PermitForPermitData | undefined
  /**
   * Function to create and return a permit for the given DAO.
   */
  getPermit: () => Promise<PermitForPermitData>
}

/**
 * Hook to help manage a wallet's Secret Network permits for a DAO.
 */
export const useDaoWithWalletSecretNetworkPermit = ({
  dao,
  ...options
}: UseWalletWithSecretNetworkPermitOptions = {}): UseWalletWithSecretNetworkPermitReturn => {
  const { dao: daoClient } = useDaoClient({
    dao,
  })
  const wallet = useWallet({
    chainId: daoClient.chainId,
    ...options,
  })

  // Stabilize reference so callback doesn't change. This only needs to update
  // on wallet connection state change anyway.
  const signAminoRef = useUpdatingRef(wallet.signAmino)
  // Register for offline signer if Secret DAO.
  useEffect(() => {
    if (daoClient instanceof SecretCwDao && wallet.isWalletConnected) {
      daoClient.registerSignAmino(signAminoRef.current)
    }
  }, [daoClient, signAminoRef, wallet.isWalletConnected])

  // Attempt to initialize with existing permit.
  const [permit, setPermit] = useState<PermitForPermitData | undefined>(() =>
    daoClient instanceof SecretCwDao &&
    wallet.isWalletConnected &&
    wallet.address
      ? daoClient.getExistingPermit(wallet.address)
      : undefined
  )

  // On wallet address change, re-fetch existing permit.
  useEffect(() => {
    if (
      daoClient instanceof SecretCwDao &&
      wallet.isWalletConnected &&
      wallet.address
    ) {
      setPermit(daoClient.getExistingPermit(wallet.address))
    }
  }, [daoClient, wallet.address, wallet.isWalletConnected])

  // Attempt to fetch existing permit on change if not already set.
  useOnSecretNetworkPermitUpdate({
    dao,
    callback:
      daoClient instanceof SecretCwDao && wallet.isWalletConnected
        ? () => {
            if (wallet.address) {
              setPermit(daoClient.getExistingPermit(wallet.address))
            }
          }
        : undefined,
    // We already set state and re-render in the callback.
    reRender: false,
  })

  const getPermit = useCallback(async (): Promise<PermitForPermitData> => {
    if (!(daoClient instanceof SecretCwDao)) {
      throw new Error('Not a Secret DAO.')
    }

    if (!wallet.address || !wallet.isWalletConnected) {
      throw new Error('Log in to continue.')
    }

    const permit = await daoClient.getPermit(wallet.address)
    setPermit(permit)

    return permit
  }, [daoClient, wallet.address, wallet.isWalletConnected])

  const response = useMemo((): UseWalletWithSecretNetworkPermitReturn => {
    const isSecret = isSecretNetwork(daoClient.chainId)

    return {
      ...wallet,
      isSecretNetwork: isSecret,
      isSecretNetworkPermitNeeded:
        wallet.isWalletConnected && isSecret && !permit,
      dao: daoClient,
      permit,
      getPermit,
    }
  }, [wallet, daoClient, permit, getPermit])

  return response
}
