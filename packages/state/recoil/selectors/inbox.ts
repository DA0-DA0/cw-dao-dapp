import { atomFamily, selectorFamily } from 'recoil'

import {
  InboxItemType,
  InboxLoadedItem,
  InboxLoadedItemWithData,
} from '@dao-dao/types'
import {
  INBOX_API_BASE,
  MAINNET,
  maybeGetChainForChainId,
} from '@dao-dao/utils'

import { refreshInboxItemsAtom } from '../atoms'

// Inbox API doesn't update right away due to Cloudflare KV Store latency, so
// this serves to keep track of all successful updates for the current session.
// This will be reset on page refresh. Set this right away so the UI can update
// immediately even if the API takes up to a minute or two. Though likely it
// only takes 10 seconds or so.
export const temporaryClearedInboxItemsAtom = atomFamily<string[], string>({
  key: 'temporaryClearedInboxItems',
  default: [],
})

export const inboxItemsSelector = selectorFamily<
  InboxLoadedItemWithData[],
  {
    walletBech32Hash: string
    /**
     * Any chain that the bech32 hash is used with in case an item doesn't have
     * chain ID set. This is needed to clear the inbox item later.
     */
    fallbackChainId: string
    /**
     * Optional type filter.
     */
    type?: InboxItemType
  }
>({
  key: 'inboxItems',
  get:
    ({ walletBech32Hash, fallbackChainId, type }) =>
    async ({ get }) => {
      const temporaryClearedInboxLoadedItemWithDatas = get(
        temporaryClearedInboxItemsAtom(walletBech32Hash)
      )

      get(refreshInboxItemsAtom)

      // Optional filters.
      const query = new URLSearchParams({
        ...(type ? { type } : {}),
      })
      const response = await fetch(
        INBOX_API_BASE + `/load/bech32/${walletBech32Hash}?${query.toString()}`
      )

      if (response.ok) {
        const { items: loadedItems } = (await response.json()) as {
          items: InboxLoadedItem[]
        }

        const items = loadedItems
          // Extract type from ID.
          .map(
            (item) =>
              ({
                type: item.id.split('/')[0] as InboxItemType,
                ...item,
                chainId: item.chainId || fallbackChainId,
              }) as InboxLoadedItemWithData
          )
          .flatMap((item) => {
            const { network_type } =
              maybeGetChainForChainId(item.chainId)?.chainRegistry ?? {}

            return item &&
              // Filter out items that were cleared.
              !temporaryClearedInboxLoadedItemWithDatas.includes(item.id) &&
              network_type &&
              // Only get followed DAOs that match the current network type.
              (network_type === 'mainnet') === MAINNET
              ? item
              : []
          })

        return items
      } else {
        throw new Error(
          `Failed to fetch inbox API items: ${response.status}/${
            response.statusText
          } ${await response.text().catch(() => '')}`.trim()
        )
      }
    },
})
