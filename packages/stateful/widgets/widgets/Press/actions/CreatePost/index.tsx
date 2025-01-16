import { useFormContext } from 'react-hook-form'

import { ActionBase, MemoEmoji, useCachedLoading } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { getChainAddressForActionOptions } from '@dao-dao/utils'

import { MintNftAction } from '../../../../../actions/core/actions'
import { postSelector } from '../../state'
import { PressData } from '../../types'
import { CreatePostComponent, CreatePostData } from './Component'

const Component: ActionComponent = (props) => {
  const { watch } = useFormContext<CreatePostData>()
  const tokenId = watch((props.fieldNamePrefix + 'tokenId') as 'tokenId')
  const tokenUri = watch((props.fieldNamePrefix + 'tokenUri') as 'tokenUri')
  const uploaded = watch((props.fieldNamePrefix + 'uploaded') as 'uploaded')

  const postLoading = useCachedLoading(
    uploaded && tokenId && tokenUri
      ? postSelector({
          id: tokenId,
          metadataUri: tokenUri,
        })
      : undefined,
    undefined
  )

  return (
    <CreatePostComponent
      {...props}
      options={{
        postLoading,
      }}
    />
  )
}

export class CreatePostAction extends ActionBase<CreatePostData> {
  public readonly key = ActionKey.CreatePost
  public readonly Component = Component

  protected _defaults: CreatePostData = {
    tokenId: '',
    tokenUri: '',
    uploaded: false,
    data: {
      title: '',
      description: '',
      content: '',
    },
  }

  private mintNftAction: MintNftAction

  constructor(
    options: ActionOptions,
    private pressData: PressData
  ) {
    super(options, {
      Icon: MemoEmoji,
      label: options.t('title.createPost'),
      description: options.t('info.createPostDescription'),
    })

    this.mintNftAction = new MintNftAction(options)
  }

  encode({ tokenId, tokenUri }: CreatePostData): UnifiedCosmosMsg[] {
    // If chain ID is undefined, default to native DAO chain for backwards
    // compatibility.
    const pressChainId = this.pressData.chainId || this.options.chain.chainId

    const owner = getChainAddressForActionOptions(this.options, pressChainId)
    if (!owner) {
      throw new Error('No minter found for chain.')
    }

    return this.mintNftAction.encode({
      chainId: pressChainId,
      collectionAddress: this.pressData.contract,
      mintMsg: {
        owner,
        token_id: tokenId,
        token_uri: tokenUri,
      },
      // Unused.
      contractChosen: true,
    })
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    return (
      this.mintNftAction.match(messages) &&
      messages[0].decodedMessage.wasm.execute.contract_addr ===
        this.pressData.contract
    )
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): CreatePostData {
    return {
      tokenId: decodedMessage.wasm.execute.msg.mint.token_id,
      tokenUri: decodedMessage.wasm.execute.msg.mint.token_uri,
      uploaded: true,
    }
  }
}
