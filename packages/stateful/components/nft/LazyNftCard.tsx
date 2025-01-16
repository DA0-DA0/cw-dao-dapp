import { useQueryClient } from '@tanstack/react-query'
import { forwardRef, useEffect } from 'react'
import { useSetRecoilState } from 'recoil'

import { nftQueries } from '@dao-dao/state/query'
import { nftCardInfosForKeyAtom } from '@dao-dao/state/recoil'
import { LazyNftCardProps } from '@dao-dao/types'
import { processError } from '@dao-dao/utils'

import { useQueryLoadingDataWithError } from '../../hooks'
import { NftCard, NftCardNoCollection, StakedNftCard } from './NftCard'

export const LazyNftCard = forwardRef<HTMLDivElement, LazyNftCardProps>(
  function LazyNftCard(
    {
      type = 'owner',
      collectionAddress,
      tokenId,
      stakingContractAddress,
      chainId,
      ...props
    },
    ref
  ) {
    const queryClient = useQueryClient()
    const info = useQueryLoadingDataWithError(
      nftQueries.cardInfo(queryClient, {
        chainId,
        collection: collectionAddress,
        tokenId,
      })
    )

    // When info is loaded, cache so that we can use it later. This is used so
    // that the parent modal (NftSelectionModal) can filter by names without
    // having to preload all of them, for example.
    const setNftCardInfoForKey = useSetRecoilState(nftCardInfosForKeyAtom)
    useEffect(() => {
      if (!info.loading && !info.errored) {
        setNftCardInfoForKey((prev) => ({
          ...prev,
          [info.data.key]: info.data,
        }))
      }
    }, [info, setNftCardInfoForKey])

    const stakerOrOwner = useQueryLoadingDataWithError(
      // If showing owner instead of showing collection, load staker or owner if
      // not staker. The owner in the `type` and the owner of the NFT are
      // unrelated. Sorry... I just confused myself and then re-learned this.
      type === 'owner'
        ? nftQueries.ownerOrStaker(queryClient, {
            chainId,
            collection: collectionAddress,
            tokenId,
            stakingContractAddress,
          })
        : undefined
    )

    const staked =
      !stakerOrOwner.loading &&
      !stakerOrOwner.errored &&
      stakerOrOwner.data.staked

    const NftCardToUse = staked
      ? StakedNftCard
      : type === 'owner'
        ? NftCardNoCollection
        : NftCard

    return info.loading ? (
      <NftCardToUse
        {...props}
        chainId={chainId}
        className="animate-pulse"
        collectionAddress={collectionAddress}
        collectionName="Loading..."
        description={undefined}
        name="Loading..."
        ref={ref}
        tokenId={tokenId}
      />
    ) : info.errored ? (
      <NftCardToUse
        {...props}
        chainId={chainId}
        className="animate-pulse"
        collectionAddress={collectionAddress}
        collectionName="Errored"
        description={undefined}
        name={processError(info.error, {
          forceCapture: false,
        })}
        ref={ref}
        tokenId={tokenId}
      />
    ) : (
      <NftCardToUse
        {...props}
        {...info.data}
        owner={
          stakerOrOwner.loading || stakerOrOwner.errored
            ? undefined
            : stakerOrOwner.data.address
        }
        ref={ref}
      />
    )
  }
)
