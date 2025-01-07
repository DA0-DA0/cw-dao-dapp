import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import { cw721BaseQueries, nftQueries } from '@dao-dao/state/query'
import { DaoDaoCoreSelectors } from '@dao-dao/state/recoil'
import { Loader, useActionOptions } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  NftCardInfo,
} from '@dao-dao/types'
import { getChainForChainId, isValidBech32Address } from '@dao-dao/utils'

import { AddressInput } from '../../../../components'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import { MintNft as StatelessMintNft } from './stateless/MintNft'
import { MintNftData } from './types'

export const MintNft: ActionComponent = (props) => {
  const {
    context,
    address,
    chain: { chainId: currentChainId },
  } = useActionOptions()
  const { watch } = useFormContext()
  const queryClient = useQueryClient()

  const {
    chainId,
    contractChosen,
    collectionAddress = '',
    mintMsg,
  }: MintNftData = watch(props.fieldNamePrefix)
  const { bech32Prefix } = getChainForChainId(chainId)

  const nftInfoLoading = useQueryLoadingDataWithError(
    // Nothing to load if creating.
    props.isCreating
      ? undefined
      : // If viewing, get info from token URI.
        nftQueries.cardInfoFromUri(queryClient, {
          collection: collectionAddress,
          tokenId: mintMsg.token_id,
          tokenUri: mintMsg.token_uri,
          chainId,
        })
  )

  const creatingNftTokenUriData = useQueryLoadingDataWithError(
    props.isCreating && mintMsg.token_uri
      ? nftQueries.metadataFromUri({ tokenUri: mintMsg.token_uri })
      : undefined
  )

  const creatingCollectionInfo = useQueryLoadingDataWithError(
    props.isCreating &&
      contractChosen &&
      isValidBech32Address(collectionAddress, bech32Prefix)
      ? cw721BaseQueries.contractInfo({
          contractAddress: collectionAddress,
          chainId,
        })
      : undefined
  )

  // If creating, use the data from the form. Otherwise, use the data loading.
  // Undefined when loading.
  const nftInfo: NftCardInfo | undefined = props.isCreating
    ? creatingNftTokenUriData.loading ||
      creatingNftTokenUriData.errored ||
      creatingCollectionInfo.loading
      ? undefined
      : {
          key:
            mintMsg.token_uri || chainId + collectionAddress + mintMsg.token_id,
          collectionAddress,
          collectionName:
            (!creatingCollectionInfo.errored &&
              creatingCollectionInfo.data.name) ||
            '',
          tokenId: mintMsg.token_id,
          imageUrl: creatingNftTokenUriData.data.imageUrl,
          name: creatingNftTokenUriData.data.name ?? '',
          description: creatingNftTokenUriData.data.description ?? '',
          metadata: creatingNftTokenUriData.data,
          chainId,
        }
    : nftInfoLoading.loading || nftInfoLoading.errored
      ? undefined
      : nftInfoLoading.data

  // Get all collections in DAO.
  const daoCollections = useRecoilValueLoadable(
    props.isCreating && context.type === ActionContextType.Dao
      ? DaoDaoCoreSelectors.allCw721CollectionsSelector({
          contractAddress: address,
          chainId: currentChainId,
        })
      : constSelector(undefined)
  )

  // Add action to add collection to DAO treasury if it is not already there.
  const [added, setAdded] = useState(false)
  useEffect(() => {
    // Only add once, in case the user deletes an action.
    if (added) {
      return
    }

    if (
      // Ensure we are creating a proposal in the context of a DAO.
      props.isCreating &&
      context.type === ActionContextType.Dao &&
      // Ensure the collection is not already in the DAO.
      daoCollections.state === 'hasValue' &&
      daoCollections.contents?.[chainId] &&
      !daoCollections.contents[chainId].collectionAddresses.includes(
        collectionAddress
      )
    ) {
      setAdded(true)

      // Ensure no action already exists to add this collection.
      if (
        props.allActionsWithData.some(
          ({ actionKey, data }) =>
            actionKey === ActionKey.ManageCw721 &&
            data.chainId === chainId &&
            data.address === collectionAddress &&
            data.adding
        )
      ) {
        return
      }

      // Only add the action if we are the first mint action for this
      // collection. On a bulk import, this prevents every mint action from
      // adding the collection.
      if (
        props.allActionsWithData.findIndex(
          ({ actionKey, data }) =>
            actionKey === ActionKey.MintNft &&
            data &&
            data.collectionAddress === collectionAddress
        ) !== props.index
      ) {
        return
      }

      props.addAction({
        actionKey: ActionKey.ManageCw721,
        data: {
          chainId,
          adding: true,
          address: collectionAddress,
        },
      })
    }
  }, [
    added,
    chainId,
    collectionAddress,
    context.type,
    daoCollections.contents,
    daoCollections.state,
    props,
  ])

  // `nftInfo` is undefined when loading or if there is no NFT info.
  return !nftInfo ? (
    <Loader />
  ) : (
    <StatelessMintNft
      {...props}
      options={{
        nftInfo,
        AddressInput,
      }}
    />
  )
}
