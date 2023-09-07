import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { constSelector } from 'recoil'

import { TrashEmoji, useCachedLoading } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMaker,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import { makeWasmMessage, objectMatchesStructure } from '@dao-dao/utils'

import { useActionOptions } from '../../../../../actions'
import { postSelector, postsSelector } from '../../state'
import { PressData } from '../../types'
import { DeletePostComponent, DeletePostData } from './Component'

const useDefaults: UseDefaults<DeletePostData> = () => ({
  id: '',
})

export const makeDeletePostActionMaker = ({
  contract,
}: PressData): ActionMaker<DeletePostData> => {
  // Make outside of the maker function returned below so it doesn't get
  // redefined and thus remounted on every render.
  const Component: ActionComponent = (props) => {
    const {
      chain: { chain_id: chainId },
    } = useActionOptions()

    const { watch } = useFormContext()
    const id = watch((props.fieldNamePrefix + 'id') as 'id')

    const postsLoading = useCachedLoading(
      postsSelector({
        contractAddress: contract,
        chainId,
      }),
      []
    )

    // Once created, manually load metadata; it won't be retrievable from
    // the contract if it was successfully removed since the token was
    // burned.
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

  return ({ t, context }) => {
    // Only available in DAO context.
    if (context.type !== ActionContextType.Dao) {
      return null
    }

    const useDecodedCosmosMsg: UseDecodedCosmosMsg<DeletePostData> = (
      msg: Record<string, any>
    ) =>
      objectMatchesStructure(msg, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              burn: {
                token_id: {},
              },
            },
          },
        },
      }) && msg.wasm.execute.contract_addr === contract
        ? {
            match: true,
            data: {
              id: msg.wasm.execute.msg.burn.token_id,
            },
          }
        : {
            match: false,
          }

    const useTransformToCosmos: UseTransformToCosmos<DeletePostData> = () =>
      useCallback(
        ({ id }) =>
          makeWasmMessage({
            wasm: {
              execute: {
                contract_addr: contract,
                funds: [],
                msg: {
                  burn: {
                    token_id: id,
                  },
                },
              },
            },
          }),
        []
      )

    return {
      key: ActionKey.DeletePost,
      Icon: TrashEmoji,
      label: t('title.deletePost'),
      description: t('info.deletePostDescription'),
      Component,
      useDefaults,
      useTransformToCosmos,
      useDecodedCosmosMsg,
    }
  }
}
