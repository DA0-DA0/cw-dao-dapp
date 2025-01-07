import {
  QueryClient,
  UseQueryOptions,
  queryOptions,
  skipToken,
} from '@tanstack/react-query'

import {
  ChainId,
  PfpkProfile,
  ResolvedProfile,
  UnifiedProfile,
} from '@dao-dao/types'
import {
  MAINNET,
  PFPK_API_BASE,
  STARGAZE_NAMES_CONTRACT,
  getChainForChainId,
  getCosmWasmClientForChainId,
  imageUrlFromStargazeIndexerNft,
  makeEmptyPfpkProfile,
  makeEmptyUnifiedProfile,
  processError,
  toBech32Hash,
  transformBech32Address,
} from '@dao-dao/utils'

import { stargazeIndexerClient, stargazeTokenQuery } from '../../graphql'

/**
 * Fetch unified profile information for any wallet.
 */
export const fetchProfileInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<UnifiedProfile> => {
  const profile = makeEmptyUnifiedProfile(chainId, address)
  if (!address) {
    return profile
  }

  const pfpkProfile = await queryClient.fetchQuery(
    profileQueries.pfpk({
      address,
    })
  )
  // Copy PFPK profile info into unified profile.
  profile.uuid = pfpkProfile.uuid
  profile.nonce = pfpkProfile.nonce
  profile.name = pfpkProfile.name
  profile.nft = pfpkProfile.nft
  profile.chains = pfpkProfile.chains

  // Use profile address for Stargaze if set, falling back to transforming the
  // address (which is unreliable due to different chains using different HD
  // paths).
  const stargazeAddress =
    profile.chains[ChainId.StargazeMainnet]?.address ||
    transformBech32Address(address, ChainId.StargazeMainnet)

  // Load Stargaze name as backup if no PFPK name set.
  if (!profile.name) {
    const stargazeName = await queryClient
      .fetchQuery(
        profileQueries.stargazeName({
          address: stargazeAddress,
        })
      )
      .catch(() => null)
    if (stargazeName) {
      profile.name =
        stargazeName + '.' + getChainForChainId(chainId).bech32Prefix
      profile.nameSource = 'stargaze'
    }
  }

  // Set `imageUrl` to PFPK image, defaulting to fallback image.
  profile.imageUrl = pfpkProfile?.nft?.imageUrl || profile.backupImageUrl

  // Load Stargaze name image if no PFPK image.
  if (!pfpkProfile?.nft?.imageUrl) {
    const stargazeNameImage = await queryClient
      .fetchQuery(
        profileQueries.stargazeNameImage(queryClient, {
          address: stargazeAddress,
        })
      )
      .catch(() => null)
    if (stargazeNameImage) {
      profile.imageUrl = stargazeNameImage
    }
  }

  return profile
}

/**
 * Fetch PFPK profile information for any wallet.
 */
export const fetchPfpkProfileInfo = async ({
  bech32Hash,
}: {
  bech32Hash: string
}): Promise<PfpkProfile> => {
  if (!bech32Hash) {
    return makeEmptyPfpkProfile()
  }

  try {
    const response = await fetch(PFPK_API_BASE + `/bech32/${bech32Hash}`)
    if (response.ok) {
      return await response.json()
    } else {
      console.error(await response.json().catch(() => response.statusText))
    }
  } catch (err) {
    console.error(err)
  }

  return makeEmptyPfpkProfile()
}

/**
 * Fetch Stargaze name for a wallet adderss.
 */
export const fetchStargazeName = async ({
  address,
}: {
  address: string
}): Promise<string | null> => {
  if (!address) {
    return null
  }

  const client = await getCosmWasmClientForChainId(
    MAINNET ? ChainId.StargazeMainnet : ChainId.StargazeTestnet
  )

  try {
    return await client.queryContractSmart(STARGAZE_NAMES_CONTRACT, {
      name: { address },
    })
  } catch {}

  return null
}

/**
 * Fetch Stargaze name's image associated an address.
 */
export const fetchStargazeNameImage = async (
  queryClient: QueryClient,
  {
    address,
  }: {
    address: string
  }
): Promise<string | null> => {
  const name = await queryClient.fetchQuery(
    profileQueries.stargazeName({ address })
  )
  if (!name) {
    return null
  }

  const chainId = MAINNET ? ChainId.StargazeMainnet : ChainId.StargazeTestnet
  const client = await getCosmWasmClientForChainId(chainId)

  // Get NFT associated with name.
  let response
  try {
    response = await client.queryContractSmart(STARGAZE_NAMES_CONTRACT, {
      image_n_f_t: { name },
    })
  } catch {
    return null
  }

  if (!response) {
    return null
  }

  // If NFT exists, get image associated with NFT.
  try {
    const { data } = await stargazeIndexerClient.query({
      query: stargazeTokenQuery,
      variables: {
        collectionAddr: response.collection,
        tokenId: response.token_id,
      },
    })
    if (data?.token) {
      return imageUrlFromStargazeIndexerNft(data.token) || null
    }
  } catch (err) {
    console.error(err)
  }

  return null
}

/**
 * Search for profiles by name prefix.
 */
export const searchProfilesByNamePrefix = async ({
  chainId,
  namePrefix,
}: {
  chainId: string
  namePrefix: string
}): Promise<ResolvedProfile[]> => {
  if (namePrefix.length < 3) {
    return []
  }

  // Load profiles from PFPK API.
  let profiles: ResolvedProfile[] = []
  try {
    const response = await fetch(
      PFPK_API_BASE + `/search/${chainId}/${namePrefix}`
    )
    if (response.ok) {
      const { profiles: _profiles } = (await response.json()) as {
        profiles: ResolvedProfile[]
      }
      profiles = _profiles
    } else {
      console.error(await response.json())
    }
  } catch (err) {
    console.error(processError(err))
  }

  return profiles
}

export const profileQueries = {
  /**
   * Fetch unified profile.
   */
  unified: (
    queryClient: QueryClient,
    // If undefined, query will be disabled.
    options?: Parameters<typeof fetchProfileInfo>[1]
  ) =>
    queryOptions({
      queryKey: [
        {
          category: 'profile',
          name: 'unified',
          options: options && {
            ...options,
            // Add this to match pfpk query key so we can invalidate and thus
            // refetch both at once.
            bech32Hash: toBech32Hash(options.address),
          },
        },
      ],
      queryFn: options
        ? () => fetchProfileInfo(queryClient, options)
        : skipToken,
    }),
  /**
   * Fetch PFPK profile.
   */
  pfpk: (
    /**
     * Redirects address queries to bech32 hash queries.
     *
     * If undefined, query will be disabled.
     */
    options?: { address: string } | { bech32Hash: string }
  ): UseQueryOptions<
    PfpkProfile,
    Error,
    PfpkProfile,
    [
      {
        category: 'profile'
        name: 'pfpk'
        options: { bech32Hash: string } | undefined
      },
    ]
  > =>
    // Redirect address queries to bech32 hash queries.
    options && 'address' in options
      ? profileQueries.pfpk({
          bech32Hash: toBech32Hash(options.address),
        })
      : queryOptions({
          queryKey: [
            {
              category: 'profile',
              name: 'pfpk',
              options,
            },
          ],
          queryFn: options ? () => fetchPfpkProfileInfo(options) : skipToken,
        }),
  /**
   * Fetch Stargaze name for a wallet adderss.
   */
  stargazeName: (options: Parameters<typeof fetchStargazeName>[0]) =>
    queryOptions({
      queryKey: ['profile', 'stargazeName', options],
      queryFn: () => fetchStargazeName(options),
    }),
  /**
   * Fetch Stargaze name's image associated an address.
   */
  stargazeNameImage: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchStargazeNameImage>[1]
  ) =>
    queryOptions({
      queryKey: ['profile', 'stargazeNameImage', options],
      queryFn: () => fetchStargazeNameImage(queryClient, options),
    }),
  /**
   * Search for profiles by name prefix.
   */
  searchByNamePrefix: (
    /**
     * If undefined, query will be disabled.
     */
    options?: Parameters<typeof searchProfilesByNamePrefix>[0]
  ) =>
    queryOptions({
      queryKey: ['profile', 'searchByNamePrefix', options],
      queryFn: options ? () => searchProfilesByNamePrefix(options) : skipToken,
    }),
}
