import { toHex } from '@cosmjs/encoding'
import { ChainContext, WalletAccount } from '@cosmos-kit/core'
import { useChain, useManager } from '@cosmos-kit/react-lite'
import { SecretUtils } from '@keplr-wallet/types'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'

import { chainQueries } from '@dao-dao/state/query'
import {
  refreshWalletBalancesIdAtom,
  walletChainIdAtom,
} from '@dao-dao/state/recoil'
import { makeGetSignerOptions } from '@dao-dao/state/utils'
import { useChainContextIfAvailable, useUpdatingRef } from '@dao-dao/stateless'
import { AnyChain, LoadingData } from '@dao-dao/types'
import {
  SecretSigningCosmWasmClient,
  SupportedSigningCosmWasmClient,
  getLcdForChainId,
  getRpcForChainId,
  getSupportedChains,
  isSecretNetwork,
  maybeGetChainForChainId,
} from '@dao-dao/utils'

import { useQueryLoadingData } from './query'

export type UseWalletOptions = {
  /**
   * If undefined, defaults to current chain context. If not in a chain context,
   * falls back to first supported chain.
   */
  chainId?: string
  /**
   * If true, will return `account` and `hexPublicKey` in response.
   */
  loadAccount?: boolean
  /**
   * If true, attempt connection if wallet is connected to a different chain but
   * not the current one.
   */
  attemptConnection?: boolean
}

export type UseWalletReturn = Omit<ChainContext, 'chain'> & {
  // Use chain from our version of the chain-registry.
  chain: AnyChain
  account: WalletAccount | undefined
  hexPublicKey: LoadingData<string>
  /**
   * Fetch the Secret Network signing client for the current wallet.
   */
  getSecretSigningCosmWasmClient: () => Promise<SecretSigningCosmWasmClient>
  /**
   * Fetch the relevant signing client for the current wallet.
   */
  getSigningClient: () => Promise<SupportedSigningCosmWasmClient>
  /**
   * Fetch SecretUtils from the wallet if available.
   */
  getSecretUtils: () => SecretUtils
  /**
   * Refresh wallet balances.
   */
  refreshBalances: () => void
}

export const useWallet = ({
  chainId,
  loadAccount = false,
  attemptConnection = false,
}: UseWalletOptions = {}): UseWalletReturn => {
  const walletChainId = useRecoilValue(walletChainIdAtom)
  const { chain: currentChain } = useChainContextIfAvailable() ?? {}
  const { getWalletRepo } = useManager()

  // If chainId passed, use that. Otherwise, use current chain context. If not
  // in a chain context, fallback to global wallet chain setting. If chain
  // invalid, fallback to first supported.
  const chain =
    (chainId
      ? maybeGetChainForChainId(chainId)
      : currentChain || maybeGetChainForChainId(walletChainId)) ||
    getSupportedChains()[0].chain

  const _walletChain = useChain(chain.chainName, false)
  // Memoize wallet chain since it changes every render. The hook above forces
  // re-render when address changes, so this is safe.
  const walletChainRef = useUpdatingRef(_walletChain)

  // Chain of main wallet connection.
  const mainWalletChainId = useRecoilValue(walletChainIdAtom)
  // Get main wallet connection.
  const mainWallet = getWalletRepo(
    maybeGetChainForChainId(mainWalletChainId)?.chainName || chain.chainName
  )?.current
  const mainWalletConnected = !!mainWallet?.isWalletConnected
  // Memoize wallet chain since it changes every render. The hook above forces
  // re-render when address changes, so this is safe.
  const mainWalletRef = useUpdatingRef(mainWallet)

  // Only attempt connection once per enable.
  const attemptedConnection = useRef(false)
  // Reset so that we re-attempt connection if this becomes enabled again.
  useEffect(() => {
    if (!attemptConnection) {
      attemptedConnection.current = false
    }
  }, [attemptConnection])

  const connect = useCallback(() => {
    if (mainWalletConnected && mainWalletRef.current) {
      return walletChainRef.current.walletRepo
        .connect(mainWalletRef.current.walletName, false)
        .catch(console.error)
    } else {
      return walletChainRef.current.connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mainWalletConnected,
    chain.chainName,
    walletChainRef.current.wallet?.name,
    walletChainRef.current.status,
  ])

  // Attempt auto-connection if main wallet is connected, we are not, and we
  // haven't attempted it before.
  useEffect(() => {
    if (
      attemptConnection &&
      !attemptedConnection.current &&
      !_walletChain.isWalletConnected &&
      mainWalletConnected &&
      mainWalletRef.current
    ) {
      attemptedConnection.current = true
      connect()
    }
  }, [
    mainWalletConnected,
    attemptConnection,
    connect,
    _walletChain.isWalletConnected,
    mainWalletRef,
  ])

  const [account, setAccount] = useState<WalletAccount>()
  const [hexPublicKeyData, setHexPublicKeyData] = useState<string>()

  const hexPublicKeyFromChain = useQueryLoadingData(
    _walletChain.address && loadAccount
      ? chainQueries.walletHexPublicKey({
          chainId: _walletChain.chain.chain_id,
          address: _walletChain.address,
        })
      : undefined,
    undefined
  )

  // Load account and public key data when wallet is connected or it changes.
  useEffect(() => {
    if (!loadAccount) {
      return
    }

    if (!walletChainRef.current.isWalletConnected) {
      setAccount(undefined)
      setHexPublicKeyData(undefined)
      return
    }

    // If connected and account not loaded, set state.
    if (account?.address !== walletChainRef.current.address) {
      ;(async () => {
        try {
          const account = await walletChainRef.current.getAccount()
          setAccount(account)
          setHexPublicKeyData(account && toHex(account.pubkey))
        } catch (err) {
          console.error('Wallet account loading error', err)
        }
      })()
    }
  }, [
    account?.address,
    loadAccount,
    walletChainRef,
    walletChainRef.current.address,
    walletChainRef.current.chain.chain_id,
    walletChainRef.current.status,
  ])

  // Pre-fetch dynamic gas price for this chain when the wallet is used.
  const queryClient = useQueryClient()
  useEffect(() => {
    queryClient.prefetchQuery({
      ...chainQueries.dynamicGasPrice({ chainId: chain.chainId }),
      // Make stale in less than a minute so it refreshes in the
      // `useAutoRefreshData` hook that runs every minute.
      staleTime: 50 * 1000,
    })
  }, [queryClient, chain.chainId])

  const setRefreshWalletBalancesId = useSetRecoilState(
    refreshWalletBalancesIdAtom(walletChainRef.current.address ?? '')
  )
  const refreshBalances = useCallback(() => {
    const address = walletChainRef.current.address

    // Refresh Recoil balance selectors.
    setRefreshWalletBalancesId((id) => id + 1)

    // Invalidate native and staked balances.
    queryClient.invalidateQueries({
      queryKey: [
        'chain',
        'nativeBalance',
        {
          chainId,
          ...(address && { address }),
        },
      ],
    })
    queryClient.invalidateQueries({
      queryKey: [
        'chain',
        'nativeStakedBalance',
        {
          chainId,
          ...(address && { address }),
        },
      ],
    })
    // Invalidate validators.
    queryClient.invalidateQueries({
      queryKey: ['chain', 'validator', { chainId }],
    })
    // Then native delegation info.
    queryClient.invalidateQueries({
      queryKey: chainQueries.nativeDelegationInfo(queryClient, {
        chainId,
        ...(address && { address }),
      } as any).queryKey,
    })
  }, [chainId, queryClient, setRefreshWalletBalancesId, walletChainRef])

  const response = useMemo(
    (): UseWalletReturn => {
      // TODO(secret): support different enigma utils sources based on connected
      // wallet
      const getSecretUtils = () => {
        const secretUtils = window.keplr?.getEnigmaUtils(chain.chainId)
        if (!secretUtils) {
          throw new Error('No Secret utils found')
        }
        return secretUtils
      }

      // Get Secret Network signing client with Keplr's encryption utils.
      const getSecretSigningCosmWasmClient = async () => {
        if (!isSecretNetwork(chain.chainId)) {
          throw new Error('Not on Secret Network')
        }

        const signer = walletChainRef.current.getOfflineSignerAmino()

        return await SecretSigningCosmWasmClient.secretConnectWithSigner(
          getRpcForChainId(chain.chainId),
          signer,
          makeGetSignerOptions(queryClient)(chain.chainName),
          {
            url: getLcdForChainId(chain.chainId),
            chainId: chain.chainId,
            wallet: signer,
            walletAddress: walletChainRef.current.address,
            encryptionUtils: getSecretUtils(),
          }
        )
      }

      // Get relevant signing client based on chain.
      const getSigningClient = isSecretNetwork(chain.chainId)
        ? getSecretSigningCosmWasmClient
        : walletChainRef.current.getSigningCosmWasmClient

      return {
        ...walletChainRef.current,
        chainWallet:
          walletChainRef.current.chainWallet ||
          // Fallback to getting chain wallet from repo if not set on
          // walletChain. This won't be set if the walletChain is disconnected.
          (mainWalletRef.current
            ? getWalletRepo(chain.chainName).getWallet(
                mainWalletRef.current.walletName
              )
            : undefined),
        connect,
        // Use chain from our version of the chain-registry.
        chain,
        account,
        hexPublicKey: hexPublicKeyData
          ? { loading: false, data: hexPublicKeyData }
          : !hexPublicKeyFromChain.loading && hexPublicKeyFromChain.data
            ? { loading: false, data: hexPublicKeyFromChain.data }
            : { loading: true },
        getSecretSigningCosmWasmClient,
        getSigningClient,
        getSecretUtils,
        refreshBalances,
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      connect,
      account,
      chain,
      hexPublicKeyData,
      walletChainRef.current?.address,
      walletChainRef.current?.chain.chain_id,
      walletChainRef.current?.status,
      hexPublicKeyFromChain,
      queryClient,
      refreshBalances,
    ]
  )

  return response
}
