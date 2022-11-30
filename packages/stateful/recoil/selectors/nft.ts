import {
  constSelector,
  selectorFamily,
  waitForAll,
  waitForAllSettled,
} from 'recoil'

import {
  Cw721BaseSelectors,
  CwdCoreV2Selectors,
  nativeAndStargazeCollectionInfoSelector,
  nftTokenUriDataSelector,
  refreshWalletStargazeNftsAtom,
} from '@dao-dao/state'
import { NftCardInfo, WithChainId } from '@dao-dao/types'
import { NftInfoResponse } from '@dao-dao/types/contracts/Cw721Base'
import { NativeStargazeCollectionInfo, StargazeNft } from '@dao-dao/types/nft'
import {
  STARGAZE_PROFILE_API_TEMPLATE,
  STARGAZE_URL_BASE,
  getNftName,
  transformIpfsUrlToHttpsIfNecessary,
} from '@dao-dao/utils'

export const walletStargazeNftCardInfosSelector = selectorFamily<
  NftCardInfo[],
  string
>({
  key: 'walletStargazeNftCardInfos',
  get:
    (walletAddress: string) =>
    async ({ get }) => {
      get(refreshWalletStargazeNftsAtom(walletAddress))

      const stargazeNfts: StargazeNft[] = await (
        await fetch(
          STARGAZE_PROFILE_API_TEMPLATE.replace('ADDRESS', walletAddress)
        )
      ).json()

      if (!Array.isArray(stargazeNfts)) {
        return []
      }

      const nftCardInfos = stargazeNfts.map(
        ({ collection, tokenId, image, name }): NftCardInfo => ({
          collection: {
            address: collection.contractAddress,
            name: collection.name,
          },
          tokenId,
          externalLink: {
            href: `${STARGAZE_URL_BASE}/media/${collection.contractAddress}/${tokenId}`,
            name: 'Stargaze',
          },
          imageUrl: image,
          // floorPrice: {
          //   amount: 0,
          //   denom: '',
          // }
          name: getNftName(collection.name, name || tokenId),
        })
      )

      return nftCardInfos
    },
})

export const nftCardInfosSelector = selectorFamily<
  NftCardInfo[],
  WithChainId<{ coreAddress: string }>
>({
  key: 'nftCardInfos',
  get:
    ({ coreAddress, chainId }) =>
    async ({ get }) => {
      const nftCollectionAddresses = get(
        CwdCoreV2Selectors.allCw721TokenListSelector({
          contractAddress: coreAddress,
          chainId,
        })
      )

      // Ignore errors by waiting for all to settle, and then ignoring any that
      // do not have a value.
      const nftCollectionInfos = get(
        waitForAllSettled(
          nftCollectionAddresses.map((collectionAddress) =>
            nativeAndStargazeCollectionInfoSelector({
              nativeCollectionAddress: collectionAddress,
              chainId,
            })
          )
        )
      )

      const nftCollectionTokenIds = get(
        waitForAll(
          nftCollectionAddresses.map((collectionAddress) =>
            Cw721BaseSelectors.cw721BaseAllTokensForOwnerSelector({
              contractAddress: collectionAddress,
              chainId,
              owner: coreAddress,
            })
          )
        )
      )

      const collectionsWithTokens = nftCollectionInfos
        .map((collectionInfoLoadable, index) => {
          // Don't filter undefined infos out until inside this map so we can
          // use the index to zip with token IDs.

          if (collectionInfoLoadable.state !== 'hasValue') {
            return
          }

          const tokenIds = nftCollectionTokenIds[index]

          const infos = get(
            waitForAll(
              tokenIds.map((tokenId) =>
                Cw721BaseSelectors.nftInfoSelector({
                  contractAddress:
                    collectionInfoLoadable.contents.native.address,
                  chainId,
                  params: [{ tokenId }],
                })
              )
            )
          )

          const uriDataResponses = get(
            waitForAll(
              infos.map(({ token_uri } = { token_uri: undefined }) =>
                token_uri
                  ? nftTokenUriDataSelector(token_uri)
                  : constSelector(undefined)
              )
            )
          )

          return {
            collectionInfo: collectionInfoLoadable.contents,
            tokens: tokenIds
              .map((tokenId, index) => ({
                tokenId,
                info: infos[index],
                uriDataResponse: uriDataResponses[index],
              }))
              .filter(
                ({ info, uriDataResponse }) => !!info && !!uriDataResponse
              ) as {
              tokenId: string
              info: NftInfoResponse
              uriDataResponse: string
            }[],
          }
        })
        .filter(Boolean) as {
        collectionInfo: NativeStargazeCollectionInfo
        tokens: {
          tokenId: string
          info: NftInfoResponse
          uriDataResponse: string
        }[]
      }[]

      const infos: NftCardInfo[] = collectionsWithTokens
        .flatMap(
          ({
            collectionInfo: { native: nativeInfo, stargaze: stargazeInfo },
            tokens,
          }) =>
            tokens.map(
              ({
                tokenId,
                info: nftInfo,
                uriDataResponse,
              }): NftCardInfo | undefined => {
                const info: NftCardInfo = {
                  collection: {
                    address: stargazeInfo?.address ?? nativeInfo.address,
                    name: stargazeInfo?.info.name ?? nativeInfo.info.name,
                  },
                  tokenId,
                  externalLink: stargazeInfo?.address.startsWith('stars')
                    ? {
                        href: `${STARGAZE_URL_BASE}/media/${stargazeInfo.address}/${tokenId}`,
                        name: 'Stargaze',
                      }
                    : undefined,
                  imageUrl: nftInfo.token_uri ?? '',
                  // floorPrice?: {
                  //   amount: number
                  //   denom: string
                  // }
                  name: '',
                }

                // Only try to parse if there's a good chance this is JSON, the
                // heuristic being the first non-whitespace character is a "{".
                if (uriDataResponse.trimStart().startsWith('{')) {
                  try {
                    const json = JSON.parse(uriDataResponse)

                    if (typeof json.name === 'string' && !!json.name.trim()) {
                      info.name = getNftName(info.collection.name, json.name)
                    }

                    if (typeof json.image === 'string' && !!json.image) {
                      info.imageUrl = transformIpfsUrlToHttpsIfNecessary(
                        json.image
                      )
                    }

                    if (
                      typeof json.external_url === 'string' &&
                      !!json.external_url.trim()
                    ) {
                      const externalUrl = transformIpfsUrlToHttpsIfNecessary(
                        json.external_url
                      )
                      const externalUrlDomain = new URL(externalUrl).hostname
                      info.externalLink = {
                        href: externalUrl,
                        name:
                          HostnameMap[externalUrlDomain] ?? externalUrlDomain,
                      }
                    }
                  } catch (err) {
                    console.error(err)
                  }
                }

                return info
              }
            )
        )
        .filter(Boolean) as NftCardInfo[]

      return infos
    },
})

const HostnameMap: Record<string, string | undefined> = {
  'stargaze.zone': 'Stargaze',
}
