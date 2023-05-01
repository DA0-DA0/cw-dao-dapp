import { fromBech32, toBech32 } from '@cosmjs/encoding'
import { ChainInfoID } from '@noahsaso/cosmodal'
import { selectorFamily, waitForAll, waitForAllSettled } from 'recoil'

import {
  Cw721BaseSelectors,
  DaoCoreV2Selectors,
  nftUriDataSelector,
  queryWalletIndexerSelector,
  refreshWalletBalancesIdAtom,
  refreshWalletStargazeNftsAtom,
} from '@dao-dao/state'
import { NftCardInfo, WithChainId } from '@dao-dao/types'
import { StargazeNft } from '@dao-dao/types/nft'
import {
  CHAIN_ID,
  MAINNET,
  STARGAZE_PROFILE_API_TEMPLATE,
  STARGAZE_TESTNET_CHAIN_ID,
  STARGAZE_URL_BASE,
} from '@dao-dao/utils'

import { daoCorePolytoneProxiesSelector } from './dao'

export const walletStargazeNftCardInfosSelector = selectorFamily<
  NftCardInfo[],
  string
>({
  key: 'walletStargazeNftCardInfos',
  get:
    (walletAddress: string) =>
    async ({ get }) => {
      const stargazeWalletAddress = toBech32(
        'stars',
        fromBech32(walletAddress).data
      )

      get(refreshWalletStargazeNftsAtom(stargazeWalletAddress))

      let stargazeNfts: StargazeNft[] = []
      try {
        stargazeNfts = await (
          await fetch(
            STARGAZE_PROFILE_API_TEMPLATE.replace(
              'ADDRESS',
              stargazeWalletAddress
            )
          )
        ).json()
      } catch (err) {
        console.error(err)
      }

      if (!Array.isArray(stargazeNfts)) {
        return []
      }

      const nftCardInfos = get(
        waitForAll(
          stargazeNfts.map(({ collection, tokenId, tokenUri }) =>
            nftCardInfoWithUriSelector({
              collection: collection.contractAddress,
              tokenId,
              tokenUri,
              chainId: MAINNET
                ? ChainInfoID.Stargaze1
                : STARGAZE_TESTNET_CHAIN_ID,
            })
          )
        )
      )

      return nftCardInfos
    },
})

export const nftCardInfoWithUriSelector = selectorFamily<
  NftCardInfo,
  WithChainId<{
    collection: string
    tokenId: string
    tokenUri?: string | null | undefined
  }>
>({
  key: 'nftCardInfo',
  get:
    ({ tokenId, collection, tokenUri, chainId }) =>
    async ({ get }) => {
      const collectionInfo = get(
        Cw721BaseSelectors.contractInfoSelector({
          contractAddress: collection,
          chainId,
          params: [],
        })
      )

      const metadata =
        (tokenUri && get(nftUriDataSelector(tokenUri))) || undefined
      const { name = '', description, imageUrl, externalLink } = metadata || {}

      const info: NftCardInfo = {
        collection: {
          address: collection,
          name: collectionInfo.name,
        },
        tokenId,
        externalLink:
          externalLink ||
          (chainId === ChainInfoID.Stargaze1
            ? {
                href: `${STARGAZE_URL_BASE}/media/${collection}/${tokenId}`,
                name: 'Stargaze',
              }
            : undefined),
        // Default to tokenUri; this gets overwritten if tokenUri contains valid
        // metadata and has an image.
        imageUrl: imageUrl || tokenUri || undefined,
        metadata,
        name,
        description,
        chainId,
      }

      return info
    },
})

export const nftCardInfoSelector = selectorFamily<
  NftCardInfo,
  WithChainId<{ tokenId: string; collection: string }>
>({
  key: 'nftCardInfo',
  get:
    ({ tokenId, collection, chainId }) =>
    async ({ get }) => {
      const tokenInfo = get(
        Cw721BaseSelectors.nftInfoSelector({
          contractAddress: collection,
          chainId,
          params: [{ tokenId }],
        })
      )

      return get(
        nftCardInfoWithUriSelector({
          tokenId,
          collection,
          tokenUri: tokenInfo.token_uri,
          chainId,
        })
      )
    },
})

export const nftCardInfosForDaoSelector = selectorFamily<
  NftCardInfo[],
  {
    coreAddress: string
    // If DAO is using the cw721-staking voting module adapter, it will have an
    // NFT governance collection. If this is the case, passing it here makes
    // sure we include the collection if it is not in the DAO's cw721 token
    // list.
    governanceCollectionAddress?: string
  }
>({
  key: 'nftCardInfosForDao',
  get:
    ({ coreAddress, governanceCollectionAddress }) =>
    async ({ get }) => {
      const polytoneProxies = Object.entries(
        get(
          daoCorePolytoneProxiesSelector({
            chainId: CHAIN_ID,
            coreAddress,
          })
        )
      )

      return [[CHAIN_ID, coreAddress], ...polytoneProxies].flatMap(
        ([chainId, coreAddress]) => {
          // Get all NFT collection addresses for the DAO.
          const nftCollectionAddresses = get(
            DaoCoreV2Selectors.allCw721TokenListSelector({
              contractAddress: coreAddress,
              chainId,
              governanceCollectionAddress,
            })
          )

          // Get all token IDs owned by the DAO for each collection.
          const nftCollectionTokenIds = get(
            waitForAll(
              nftCollectionAddresses.map((collectionAddress) =>
                Cw721BaseSelectors.allTokensForOwnerSelector({
                  contractAddress: collectionAddress,
                  chainId,
                  owner: coreAddress,
                })
              )
            )
          )

          // Get all cards for each collection.
          const nftCardInfos = get(
            waitForAll(
              nftCollectionAddresses.flatMap((collectionAddress, index) =>
                nftCollectionTokenIds[index].map((tokenId) =>
                  nftCardInfoSelector({
                    tokenId,
                    collection: collectionAddress,
                    chainId,
                  })
                )
              )
            )
          )

          return nftCardInfos
        }
      )
    },
})

type CollectionWithTokens = {
  collectionAddress: string
  tokens: string[]
}

// Retrieve all NFTs for a given wallet address using the indexer.
export const walletNftCardInfos = selectorFamily<
  NftCardInfo[],
  WithChainId<{
    walletAddress: string
  }>
>({
  key: 'walletNftCardInfos',
  get:
    ({ walletAddress, chainId }) =>
    async ({ get }) => {
      const id = get(refreshWalletBalancesIdAtom(walletAddress))

      const collections: CollectionWithTokens[] = get(
        queryWalletIndexerSelector({
          chainId,
          walletAddress,
          formula: 'nft/collections',
          id,
        })
      )
      if (!collections || !Array.isArray(collections)) {
        return []
      }

      const nftCardInfos = get(
        waitForAllSettled(
          collections.flatMap(({ collectionAddress, tokens }) =>
            tokens.map((tokenId) =>
              nftCardInfoSelector({
                collection: collectionAddress,
                tokenId,
                chainId,
              })
            )
          )
        )
      )

      return nftCardInfos
        .map((loadable) =>
          loadable.state === 'hasValue' ? loadable.contents : undefined
        )
        .filter((info): info is NftCardInfo => info !== undefined)
    },
})

// Retrieve all NFTs a given wallet address has staked with a DAO (via
// dao-voting-cw721-staked) using the indexer.
export const walletStakedNftCardInfosSelector = selectorFamily<
  NftCardInfo[],
  WithChainId<{
    walletAddress: string
  }>
>({
  key: 'walletStakedNftCardInfos',
  get:
    ({ walletAddress, chainId }) =>
    async ({ get }) => {
      const id = get(refreshWalletBalancesIdAtom(walletAddress))

      const collections: CollectionWithTokens[] = get(
        queryWalletIndexerSelector({
          chainId,
          walletAddress,
          formula: 'nft/stakedWithDaos',
          id,
        })
      )
      if (!collections || !Array.isArray(collections)) {
        return []
      }

      const nftCardInfos = get(
        waitForAllSettled(
          collections.flatMap(({ collectionAddress, tokens }) =>
            tokens.map((tokenId) =>
              nftCardInfoSelector({
                collection: collectionAddress,
                tokenId,
                chainId,
              })
            )
          )
        )
      )

      return nftCardInfos
        .map((loadable) =>
          loadable.state === 'hasValue' ? loadable.contents : undefined
        )
        .filter((info): info is NftCardInfo => info !== undefined)
        .map((info) => ({
          ...info,
          staked: true,
        }))
    },
})
