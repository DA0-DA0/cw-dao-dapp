import { useMemo } from 'react'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import { ChainPickerPopupProps } from '@dao-dao/types'
import { getIbcTransferChainIdsForChain } from '@dao-dao/utils'

import { ChainPickerPopup } from './popup'

export type IbcDestinationChainPickerProps = {
  /**
   * The source chain.
   */
  sourceChainId: string
  /**
   * Whether or not to include the source chain in the list.
   */
  includeSourceChain: boolean
  /**
   * Optional chain IDs to exclude.
   */
  excludeChainIds?: string[]
} & Omit<ChainPickerPopupProps, 'chains' | 'labelMode'>

// This component shows a picker for all destination chains that a source chain
// has an established IBC transfer channel with.
//
// Example usecases:
// - Spend action when choosing a destination chain for a transfer.
// - Create interchain account action.
export const IbcDestinationChainPicker = ({
  sourceChainId,
  includeSourceChain,
  excludeChainIds,
  ...pickerProps
}: IbcDestinationChainPickerProps) => {
  const chainIds = useMemo(
    () => {
      const allChainIds = [
        // Source chain.
        ...(includeSourceChain ? [sourceChainId] : []),
        // IBC destination chains.
        ...getIbcTransferChainIdsForChain(sourceChainId),
      ].filter((chainId) => !excludeChainIds?.includes(chainId))

      // Remove duplicates and sort.
      return Array.from(new Set(allChainIds)).sort((a, b) => a.localeCompare(b))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useDeepCompareMemoize([excludeChainIds, includeSourceChain, sourceChainId])
  )

  return (
    <ChainPickerPopup
      chains={{
        type: 'custom',
        chainIds,
      }}
      labelMode="chain"
      {...pickerProps}
    />
  )
}
