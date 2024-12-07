import { fromBech32 } from '@cosmjs/encoding'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { entityQueries } from '@dao-dao/state/query'
import { useChain } from '@dao-dao/stateless'
import { Entity, EntityType, LoadingData } from '@dao-dao/types'
import {
  getConfiguredChains,
  getFallbackImage,
  makeEmptyUnifiedProfile,
} from '@dao-dao/utils'

import { useQueryLoadingData } from './query/useQueryLoadingData'

export type UseEntityReturn = {
  /**
   * The chain ID detected for the address based on its prefix.
   */
  chainId: string
  /**
   * The entity for the address on the detected chain.
   */
  entity: LoadingData<Entity>
}

/**
 * Fetch entity for the given address. Attempts to autodetect the chain based on
 * the address prefix, which means it should load entities for wallets and DAOs
 * from any chain. It should even correctly load a DAO given a cross-chain
 * (polytone) account address.
 */
export const useEntity = (address: string): UseEntityReturn => {
  const { chainId: currentChainId, bech32Prefix: currentBech32Prefix } =
    useChain()
  const chainId = useMemo(() => {
    try {
      const prefix = fromBech32(address).prefix
      if (prefix === currentBech32Prefix) {
        return currentChainId
      }

      // If prefix mismatch, try to find matching chain for prefix and use that
      // one instead.
      const matchingChainId = getConfiguredChains().find(
        ({ chain }) => chain.bech32Prefix === prefix
      )?.chainId

      if (matchingChainId) {
        return matchingChainId
      }
    } catch {}

    return currentChainId
  }, [address, currentBech32Prefix, currentChainId])

  const entity = useQueryLoadingData(
    entityQueries.info(
      useQueryClient(),
      address
        ? {
            chainId,
            address,
          }
        : undefined
    ),
    // Should never error but just in case...
    {
      type: EntityType.Wallet,
      chainId,
      address,
      name: null,
      imageUrl: getFallbackImage(address),
      profile: makeEmptyUnifiedProfile(chainId, address),
    } as Entity
  )

  return {
    chainId,
    entity,
  }
}
