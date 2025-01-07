import { useCallback } from 'react'
import { constSelector, useSetRecoilState, waitForAll } from 'recoil'

import {
  followingDaosSelector,
  refreshProposalsIdAtom,
} from '@dao-dao/state/recoil'
import {
  VetoableProposals as Renderer,
  VetoableProposalsProps,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import { FeedSource, StatefulProposalLineProps } from '@dao-dao/types'
import { webSocketChannelNameForDao } from '@dao-dao/utils'

import { useOnWebSocketMessage, useProfile } from '../../../hooks'
import { feedVetoableProposalsSelector } from './state'

export const VetoableProposals: FeedSource<
  VetoableProposalsProps<StatefulProposalLineProps>
> = {
  id: 'vetoable_proposals',
  Renderer,
  useData: () => {
    const setRefresh = useSetRecoilState(refreshProposalsIdAtom)
    const refresh = useCallback(() => setRefresh((id) => id + 1), [setRefresh])

    const { uniquePublicKeys } = useProfile()

    const daosWithItemsLoadable = useCachedLoadingWithError(
      uniquePublicKeys.loading
        ? undefined
        : uniquePublicKeys.data.length > 0
          ? feedVetoableProposalsSelector({
              publicKeys: uniquePublicKeys.data.map(
                ({ publicKey }) => publicKey
              ),
            })
          : constSelector([]),
      (data) =>
        data.map((d) => ({
          ...d,
          items: d.items.map((i) => ({
            ...i,
            props: {
              ...i.props,
              className: 'mt-4 ml-4 first:mt-0',
            },
          })),
        }))
    )

    const followingDaosLoadable = useCachedLoadingWithError(
      !uniquePublicKeys.loading
        ? waitForAll(
            uniquePublicKeys.data.map(({ publicKey }) =>
              followingDaosSelector({
                walletPublicKey: publicKey,
              })
            )
          )
        : undefined,
      (data) => data.flat()
    )

    // Refresh when any proposal or vote is updated for any of the followed
    // DAOs.
    useOnWebSocketMessage(
      !followingDaosLoadable.loading && !followingDaosLoadable.errored
        ? followingDaosLoadable.data.map(({ chainId, coreAddress }) =>
            webSocketChannelNameForDao({
              chainId,
              coreAddress,
            })
          )
        : [],
      ['proposal', 'vote'],
      refresh
    )

    return {
      loading: daosWithItemsLoadable.loading,
      refreshing:
        !daosWithItemsLoadable.loading && !!daosWithItemsLoadable.updating,
      daosWithItems:
        daosWithItemsLoadable.loading || daosWithItemsLoadable.errored
          ? []
          : daosWithItemsLoadable.data,
      refresh,
    }
  },
}
