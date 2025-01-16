import { useCallback, useEffect } from 'react'
import { useSetRecoilState, waitForAll } from 'recoil'

import {
  inboxItemsSelector,
  refreshInboxItemsAtom,
} from '@dao-dao/state/recoil'
import { useCachedLoadingWithError } from '@dao-dao/stateless'
import { InboxState } from '@dao-dao/types'

import { useProfile } from './useProfile'
import { useOnWebSocketMessage } from './useWebSocket'

export const useInbox = (): InboxState => {
  const { uniquePublicKeys } = useProfile()

  const setRefresh = useSetRecoilState(refreshInboxItemsAtom)
  const refresh = useCallback(() => setRefresh((id) => id + 1), [setRefresh])

  // Refresh when any inbox items are added.
  useOnWebSocketMessage(
    uniquePublicKeys.loading
      ? []
      : uniquePublicKeys.data.map(({ bech32Hash }) => `inbox_${bech32Hash}`),
    'add',
    refresh
  )

  // Refresh every minute.
  useEffect(() => {
    const interval = setInterval(() => refresh(), 60 * 1000)
    return () => clearInterval(interval)
  }, [refresh])

  const itemsLoading = useCachedLoadingWithError(
    !uniquePublicKeys.loading
      ? waitForAll(
          uniquePublicKeys.data.map(({ bech32Hash, chains }) =>
            inboxItemsSelector({
              walletBech32Hash: bech32Hash,
              fallbackChainId: chains[0].chainId,
            })
          )
        )
      : undefined,
    (data) =>
      data
        .flat()
        .sort((a, b) =>
          a.timestamp && b.timestamp
            ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            : a.timestamp
              ? -1
              : b.timestamp
                ? 1
                : 0
        )
  )

  return {
    loading: itemsLoading.loading,
    refreshing: itemsLoading.loading || !!itemsLoading.updating,
    items:
      itemsLoading.loading || itemsLoading.errored ? [] : itemsLoading.data,
    refresh,
  }
}
