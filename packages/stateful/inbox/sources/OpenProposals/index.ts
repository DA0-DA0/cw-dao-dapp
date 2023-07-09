import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'

import { refreshOpenProposalsAtom } from '@dao-dao/state/recoil'
import { useCachedLoadable, useChain } from '@dao-dao/stateless'
import { InboxSource } from '@dao-dao/types'
import { webSocketChannelNameForDao } from '@dao-dao/utils'

import {
  ProposalLine,
  ProposalLineProps,
} from '../../../components/ProposalLine'
import { useOnWebSocketMessage, useWallet } from '../../../hooks'
import { inboxOpenProposalsSelector } from './state'

export const OpenProposals: InboxSource<ProposalLineProps> = {
  id: 'open_proposals',
  Renderer: ProposalLine,
  useData: () => {
    const { chain_id: chainId } = useChain()
    const { address, hexPublicKey } = useWallet()

    const setRefresh = useSetRecoilState(refreshOpenProposalsAtom)
    const refresh = useCallback(() => setRefresh((id) => id + 1), [setRefresh])

    const daosWithItemsLoadable = useCachedLoadable(
      // Don't load without a wallet until we're no longer initializing. This
      // prevents duplicate queries when the page is first loading.
      // TODO(cosmos-kit): Check if there is an initializing state when cosmos-kit is autoconnecting
      inboxOpenProposalsSelector({
        chainId,
        wallet:
          address && !hexPublicKey.loading
            ? {
                address,
                hexPublicKey: hexPublicKey.data,
              }
            : undefined,
      })
    )

    // Refresh when any proposal or vote is updated for any of the DAOs. Once
    // the wallet votes, the item is no longer pending, so the inbox pending
    // count needs to be updated.
    useOnWebSocketMessage(
      daosWithItemsLoadable.state === 'hasValue'
        ? daosWithItemsLoadable.contents.map(({ coreAddress }) =>
            webSocketChannelNameForDao({
              coreAddress,
              chainId,
            })
          )
        : [],
      ['proposal', 'vote'],
      refresh
    )

    return {
      loading: daosWithItemsLoadable.state === 'loading',
      refreshing:
        daosWithItemsLoadable.state === 'hasValue' &&
        daosWithItemsLoadable.updating,
      daosWithItems:
        daosWithItemsLoadable.state === 'hasValue'
          ? daosWithItemsLoadable.contents
          : [],
      refresh,
    }
  },
}
