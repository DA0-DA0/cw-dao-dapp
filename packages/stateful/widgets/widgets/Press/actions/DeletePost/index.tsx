import { useFormContext } from 'react-hook-form'
import { constSelector } from 'recoil'

import { ActionBase, TrashEmoji, useCachedLoading } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'

import { BurnNftAction } from '../../../../../actions/core/actions'
import { postSelector, postsSelector } from '../../state'
import { PressData } from '../../types'
import { DeletePostComponent, DeletePostData } from './Component'

export class DeletePostAction extends ActionBase<DeletePostData> {
  public readonly key = ActionKey.DeletePost
  public readonly Component: ActionComponent<undefined, DeletePostData>

  protected _defaults: DeletePostData = {
    id: '',
  }

  private burnNftAction: BurnNftAction
  private pressChainId: string

  constructor(
    options: ActionOptions,
    private pressData: PressData
  ) {
    super(options, {
      Icon: TrashEmoji,
      label: options.t('title.deletePost'),
      description: options.t('info.deletePostDescription'),
    })

    this.burnNftAction = new BurnNftAction(options)

    // The chain that Press is set up on. If chain ID is undefined, default to
    // native DAO chain for backwards compatibility.
    const pressChainId = pressData.chainId || options.chain.chainId
    this.pressChainId = pressChainId

    this.Component = function DeletePostActionComponent(props) {
      const { watch } = useFormContext()
      const id = watch((props.fieldNamePrefix + 'id') as 'id')

      const postsLoading = useCachedLoading(
        postsSelector({
          contractAddress: pressData.contract,
          chainId: pressChainId,
        }),
        []
      )

      // Once created, manually load metadata; it won't be retrievable from the
      // contract if it was successfully removed since the token was burned.
      const postLoading = useCachedLoading(
        !props.isCreating
          ? postSelector({
              id,
              metadataUri: `ipfs://${id}/metadata.json`,
            })
          : constSelector(undefined),
        undefined
      )

      return (
        <DeletePostComponent
          {...props}
          options={{
            postsLoading,
            postLoading,
          }}
        />
      )
    }
  }

  encode({ id }: DeletePostData): UnifiedCosmosMsg[] {
    return this.burnNftAction.encode({
      nfts: [
        {
          chainId: this.pressChainId,
          collection: this.pressData.contract,
          tokenId: id,
        },
      ],
    })
  }

  match([message]: ProcessedMessage[]): ActionMatch {
    return (
      this.burnNftAction.match([message]) &&
      message.decodedMessage.wasm.execute.contract_addr ===
        this.pressData.contract
    )
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): DeletePostData {
    return {
      id: decodedMessage.wasm.execute.msg.burn.token_id,
    }
  }
}
