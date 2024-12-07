import { useQueryClient } from '@tanstack/react-query'

import { daoQueries } from '@dao-dao/state/query'
import { ActionBase, DaoEmoji, useChain } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types'
import { decodeJsonFromBase64, objectMatchesStructure } from '@dao-dao/utils'

import { LinkWrapper } from '../../../../components'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import { CreateDaoComponent, CreateDaoData } from './Component'

const Component: ActionComponent<undefined, CreateDaoData> = (props) => {
  const { chainId } = useChain()

  // If admin is set, attempt to load parent DAO info.
  const parentDao = useQueryLoadingDataWithError(
    daoQueries.parentInfo(
      useQueryClient(),
      props.data.admin
        ? {
            chainId,
            parentAddress: props.data.admin,
          }
        : undefined
    )
  )

  return (
    <CreateDaoComponent
      {...props}
      options={{
        parentDao:
          parentDao.loading || parentDao.errored ? undefined : parentDao.data,
        LinkWrapper,
      }}
    />
  )
}

export class CreateDaoAction extends ActionBase<CreateDaoData> {
  public readonly key = ActionKey.CreateDao
  public readonly Component = Component

  protected _defaults: CreateDaoData = {
    name: '',
    description: '',
    imageUrl: '',
  }

  constructor(options: ActionOptions) {
    super(options, {
      Icon: DaoEmoji,
      label: options.t('title.createDao'),
      description: options.t('info.createDaoActionDescription'),
      // Only use for rendering.
      hideFromPicker: true,
    })
  }

  // Only used for rendering.
  encode() {
    return []
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    // Normal DAO creation via self-admin factory.
    if (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              instantiate_contract_with_self_admin: {
                code_id: {},
                instantiate_msg: {},
                label: {},
              },
            },
          },
        },
      })
    ) {
      const decoded = decodeJsonFromBase64(
        decodedMessage.wasm.execute.msg.instantiate_contract_with_self_admin
          .instantiate_msg
      )

      return objectMatchesStructure(decoded, {
        admin: {},
        automatically_add_cw20s: {},
        automatically_add_cw721s: {},
        name: {},
        description: {},
        image_url: {},
        proposal_modules_instantiate_info: {},
        voting_module_instantiate_info: {},
      })
    }

    // SubDAO creation with parent DAO as admin.
    return objectMatchesStructure(decodedMessage, {
      wasm: {
        instantiate: {
          code_id: {},
          funds: {},
          label: {},
          msg: {
            admin: {},
            automatically_add_cw20s: {},
            automatically_add_cw721s: {},
            name: {},
            description: {},
            image_url: {},
            proposal_modules_instantiate_info: {},
            voting_module_instantiate_info: {},
          },
        },
      },
    })
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): CreateDaoData {
    // Normal DAO creation via self-admin factory.
    if (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            msg: {
              instantiate_contract_with_self_admin: {},
            },
          },
        },
      })
    ) {
      const decoded = decodeJsonFromBase64(
        decodedMessage.wasm.execute.msg.instantiate_contract_with_self_admin
          .instantiate_msg
      )

      return {
        admin: decoded.admin,
        name: decoded.name,
        description: decoded.description,
        imageUrl: decoded.image_url,
      }
    }

    // SubDAO creation with parent DAO as admin.
    return {
      admin: decodedMessage.wasm.instantiate.msg.admin,
      name: decodedMessage.wasm.instantiate.msg.name,
      description: decodedMessage.wasm.instantiate.msg.description,
      imageUrl: decodedMessage.wasm.instantiate.msg.image_url,
    }
  }
}
