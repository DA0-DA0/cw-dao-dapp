import { useFormContext } from 'react-hook-form'

import { ActionBase, PencilEmoji, useCachedLoading } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'

import { postSelector, postsSelector } from '../../state'
import { PressData } from '../../types'
import { CreatePostAction } from '../CreatePost'
import { DeletePostAction } from '../DeletePost'
import { UpdatePostComponent, UpdatePostData } from './Component'

export class UpdatePostAction extends ActionBase<UpdatePostData> {
  public readonly key = ActionKey.UpdatePost
  public readonly Component: ActionComponent<undefined, UpdatePostData>

  protected _defaults: UpdatePostData = {
    tokenId: '',
    tokenUri: '',
    uploaded: false,
    data: {
      title: '',
      description: '',
      content: '',
    },
  }

  private createPostAction: CreatePostAction
  private deletePostAction: DeletePostAction

  constructor(
    options: ActionOptions,
    private pressData: PressData
  ) {
    super(options, {
      Icon: PencilEmoji,
      label: options.t('title.updatePost'),
      description: options.t('info.updatePostDescription'),
    })

    this.createPostAction = new CreatePostAction(options, pressData)
    this.deletePostAction = new DeletePostAction(options, pressData)

    this.Component = function UpdatePostActionComponent(props) {
      const { watch } = useFormContext<UpdatePostData>()
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

      const postsLoading = useCachedLoading(
        postsSelector({
          contractAddress: pressData.contract,
          // The chain that Press is set up on. If chain ID is undefined,
          // default to native DAO chain for backwards compatibility.
          chainId: pressData.chainId || options.chain.chainId,
        }),
        []
      )

      return (
        <UpdatePostComponent
          {...props}
          options={{
            postLoading,
            postsLoading,
          }}
        />
      )
    }
  }

  encode({ updateId, tokenId, tokenUri }: UpdatePostData): UnifiedCosmosMsg[] {
    if (!updateId) {
      throw new Error('No post chosen.')
    }

    return [
      ...this.createPostAction.encode({
        tokenId,
        tokenUri,
        // Unused.
        uploaded: true,
      }),
      ...this.deletePostAction.encode({
        id: updateId,
      }),
    ]
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    const orderCorrect =
      messages.length >= 2 &&
      this.createPostAction.match([messages[0]]) &&
      this.deletePostAction.match([messages[1]])

    if (!orderCorrect) {
      return false
    }

    const createPost = this.createPostAction.decode([messages[0]])
    const deletePost = this.deletePostAction.decode([messages[1]])
    return createPost.tokenId === deletePost.id
  }

  decode(messages: ProcessedMessage[]): UpdatePostData {
    const createPost = this.createPostAction.decode([messages[0]])
    const deletePost = this.deletePostAction.decode([messages[1]])
    return {
      updateId: deletePost.id,
      tokenId: createPost.tokenId,
      tokenUri: createPost.tokenUri,
      uploaded: true,
    }
  }
}
