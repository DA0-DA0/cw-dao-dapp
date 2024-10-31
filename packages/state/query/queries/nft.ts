import { QueryClient, queryOptions } from '@tanstack/react-query'

import { ChainId, NftCardInfo, NftUriData, TokenType } from '@dao-dao/types'
import {
  STARGAZE_URL_BASE,
  getNftKey,
  nftCardInfoFromStargazeIndexerNft,
  transformIpfsUrlToHttpsIfNecessary,
} from '@dao-dao/utils'

import { stargazeIndexerClient, stargazeTokenQuery } from '../../graphql'
import {
  cw721BaseQueries,
  daoVotingCw721StakedExtraQueries,
  daoVotingOnftStakedExtraQueries,
} from './contracts'
import { omniflixQueries } from './omniflix'
import { tokenQueries } from './token'

/**
 * Fetch owner of NFT, or staked if NFT is staked with the given staking
 * contract (probably a DAO voting module.)
 */
export const fetchNftOwnerOrStaker = async (
  queryClient: QueryClient,
  {
    chainId,
    collection,
    tokenId,
    stakingContractAddress,
  }: {
    chainId: string
    collection: string
    tokenId: string
    /**
     * If defined, will resolve the NFT's staker if it is currently staked with
     * this staking contract address.
     */
    stakingContractAddress?: string
  }
): Promise<{
  address: string
  /**
   * If true, the address is staking with the given staking contract. If false,
   * the address is the owner of the NFT.
   */
  staked: boolean
}> => {
  const isOmniFlix =
    chainId === ChainId.OmniflixHubMainnet ||
    chainId === ChainId.OmniflixHubTestnet

  const owner = isOmniFlix
    ? (
        await queryClient.fetchQuery(
          omniflixQueries.onft({
            chainId,
            collectionId: collection,
            tokenId,
          })
        )
      ).owner
    : (
        await queryClient.fetchQuery(
          cw721BaseQueries.ownerOf({
            chainId,
            contractAddress: collection,
            args: {
              tokenId,
            },
          })
        )
      ).owner

  const staker =
    stakingContractAddress && owner === stakingContractAddress
      ? await queryClient.fetchQuery(
          isOmniFlix
            ? daoVotingOnftStakedExtraQueries.staker(queryClient, {
                chainId,
                address: stakingContractAddress,
                tokenId,
              })
            : daoVotingCw721StakedExtraQueries.staker(queryClient, {
                chainId,
                address: stakingContractAddress,
                tokenId,
              })
        )
      : null

  return {
    address: staker || owner,
    staked: !!staker,
  }
}

/**
 * Fetch NFT card info.
 */
export const fetchNftCardInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    collection,
    tokenId,
  }: {
    chainId: string
    collection: string
    tokenId: string
  }
): Promise<NftCardInfo> => {
  // Use Stargaze indexer when possible. Fallback to contract query.
  if (
    chainId === ChainId.StargazeMainnet ||
    chainId === ChainId.StargazeTestnet
  ) {
    let data
    try {
      data = (
        await stargazeIndexerClient.query({
          query: stargazeTokenQuery,
          variables: {
            collectionAddr: collection,
            tokenId,
          },
        })
      ).data
    } catch (err) {
      console.error(err)
    }

    if (data?.token) {
      const genericToken = data.token?.highestOffer?.offerPrice?.denom
        ? await queryClient.fetchQuery(
            tokenQueries.info(queryClient, {
              chainId,
              type: TokenType.Native,
              denomOrAddress: data.token.highestOffer.offerPrice.denom,
            })
          )
        : undefined

      return nftCardInfoFromStargazeIndexerNft(
        chainId,
        data.token,
        genericToken
      )
    }
  }

  if (
    chainId === ChainId.OmniflixHubMainnet ||
    chainId === ChainId.OmniflixHubTestnet
  ) {
    const [collectionInfo, onft] = await Promise.all([
      queryClient.fetchQuery(
        omniflixQueries.onftCollectionInfo({
          chainId,
          id: collection,
        })
      ),
      queryClient.fetchQuery(
        omniflixQueries.onft({
          chainId,
          collectionId: collection,
          tokenId,
        })
      ),
    ])

    return {
      chainId,
      key: getNftKey(chainId, collection, tokenId),
      collectionAddress: collection,
      collectionName: collectionInfo.name,
      tokenId,
      owner: onft.owner,
      externalLink: {
        href: `https://omniflix.market/c/${collection}/${tokenId}`,
        name: 'OmniFlix',
      },
      imageUrl: onft.metadata?.mediaUri,
      name: onft.metadata?.name || tokenId,
      description: onft.metadata?.description,
    }
  }

  const tokenInfo = await queryClient.fetchQuery(
    cw721BaseQueries.nftInfo({
      chainId,
      contractAddress: collection,
      args: {
        tokenId,
      },
    })
  )

  return await queryClient.fetchQuery(
    nftQueries.cardInfoFromUri(queryClient, {
      chainId,
      collection,
      tokenId,
      tokenUri: tokenInfo.token_uri,
    })
  )
}

/**
 * Fetch NFT card info given its token URI.
 */
export const fetchNftCardInfoFromUri = async (
  queryClient: QueryClient,
  {
    chainId,
    collection,
    tokenId,
    tokenUri,
  }: {
    chainId: string
    collection: string
    tokenId: string
    tokenUri?: string | null | undefined
  }
): Promise<NftCardInfo> => {
  const collectionInfo = await queryClient.fetchQuery(
    cw721BaseQueries.contractInfo({
      chainId,
      contractAddress: collection,
    })
  )

  const metadata =
    (tokenUri &&
      (await queryClient
        .fetchQuery(nftQueries.metadataFromUri({ tokenUri }))
        .catch(() => undefined))) ||
    undefined
  const { name = '', description, imageUrl, externalLink } = metadata || {}

  const info: NftCardInfo = {
    key: getNftKey(chainId, collection, tokenId),
    collectionAddress: collection,
    collectionName: collectionInfo.name,
    tokenId,
    externalLink:
      externalLink ||
      (chainId === ChainId.StargazeMainnet ||
      chainId === ChainId.StargazeTestnet
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
}

/**
 * Parse NFT metadata from a token URI.
 *
 * Tries to parse [EIP-721] metadata out of an NFT's metadata JSON.
 *
 * [EIP-721]: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
 */
export const fetchNftMetadataFromUri = async ({
  tokenUri,
}: {
  tokenUri: string
}): Promise<NftUriData> => {
  // Transform IPFS url if necessary.
  let response = await fetch(transformIpfsUrlToHttpsIfNecessary(tokenUri))

  if (!response.ok) {
    // Sometimes `tokenUri` is missing a `.json` extension, so try again on
    // failure in that case.
    if (!tokenUri.endsWith('.json')) {
      response = await fetch(
        transformIpfsUrlToHttpsIfNecessary(tokenUri + '.json')
      )
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch NFT metadata: [${response.status} ${
          response.statusText
        }] ${await response.text().catch(() => '')}`.trim()
      )
    }
  }

  const data = await response.json()

  let name
  let description
  let imageUrl
  let externalLink

  if (typeof data.name === 'string' && !!data.name.trim()) {
    name = data.name
  }

  if (typeof data.description === 'string' && !!data.description.trim()) {
    description = data.description
  }

  if (typeof data.image === 'string' && !!data.image) {
    imageUrl = transformIpfsUrlToHttpsIfNecessary(data.image)
  }

  if (typeof data.external_url === 'string' && !!data.external_url.trim()) {
    const externalUrl = transformIpfsUrlToHttpsIfNecessary(data.external_url)
    const externalUrlDomain = new URL(externalUrl).hostname
    externalLink = {
      href: externalUrl,
      name: HostnameMap[externalUrlDomain] ?? externalUrlDomain,
    }
  }

  return {
    // Include all metadata.
    ...data,

    // Override specifics.
    name,
    description,
    imageUrl,
    externalLink,
  }
}

// Maps domain -> human readable name. If a domain is in this set, NFTs
// associated with it will have their external links displayed using the human
// readable name provided here.
const HostnameMap: Record<string, string | undefined> = {
  'stargaze.zone': 'Stargaze',
}

export const nftQueries = {
  /**
   * Fetch owner of NFT, or staked if NFT is staked with the given staking
   * contract (probably a DAO voting module.)
   */
  ownerOrStaker: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchNftOwnerOrStaker>[1]
  ) =>
    queryOptions({
      queryKey: ['nft', 'ownerOrStaker', options],
      queryFn: () => fetchNftOwnerOrStaker(queryClient, options),
    }),
  /**
   * Fetch NFT card info.
   */
  cardInfo: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchNftCardInfo>[1]
  ) =>
    queryOptions({
      queryKey: ['nft', 'cardInfo', options],
      queryFn: () => fetchNftCardInfo(queryClient, options),
    }),
  /**
   * Fetch NFT card info given its token URI.
   */
  cardInfoFromUri: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchNftCardInfoFromUri>[1]
  ) =>
    queryOptions({
      queryKey: ['nft', 'cardInfoFromUri', options],
      queryFn: () => fetchNftCardInfoFromUri(queryClient, options),
    }),
  /**
   * Fetch NFT metadata from a token URI.
   */
  metadataFromUri: (options: Parameters<typeof fetchNftMetadataFromUri>[0]) =>
    queryOptions({
      queryKey: ['nft', 'metadataFromUri', options],
      queryFn: () => fetchNftMetadataFromUri(options),
    }),
}
