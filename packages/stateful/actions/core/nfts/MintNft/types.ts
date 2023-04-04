import { ComponentType } from 'react'

import { AddressInputProps, NftCardInfo } from '@dao-dao/types'
import {
  InstantiateMsg as Cw721InstantiateMsg,
  MintMsgForNullable_Empty,
} from '@dao-dao/types/contracts/Cw721Base'

export interface MintNftData {
  // Whether or not the contract has been chosen. When this is `false`, shows
  // form allowing user to create a new collection or enter an existing address.
  // When `true`, it shows the minting UI. `collectionAddress` should be defined
  // and valid when this is `true`.
  contractChosen: boolean
  // Set once collection created or chosen.
  collectionAddress?: string

  // Set when creating a new collection by InstantiateNftCollection component.
  instantiateMsg?: Cw721InstantiateMsg
  // Set when entering metadata for IPFS by UploadNftMetadata component.
  metadata?: {
    name: string
    description: string
    properties?: {
      audio?: string
      video?: string
    }
  }
  // Set in final step by MintNft component.
  mintMsg: MintMsgForNullable_Empty
}

export interface InstantiateNftCollectionOptions {
  instantiating: boolean
  onInstantiate: () => Promise<void>

  AddressInput: ComponentType<AddressInputProps>
}

export interface ChooseExistingNftCollectionOptions {
  chooseLoading: boolean
  onChooseExistingContract: () => Promise<void>
  existingCollections: {
    address: string
    name: string
  }[]
}

export interface MintNftOptions {
  nftInfo: NftCardInfo
  addCollectionToDao?: () => void
  AddressInput: ComponentType<AddressInputProps>
}
