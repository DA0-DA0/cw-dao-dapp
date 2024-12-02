import { useRecoilValue } from 'recoil'

import { DaoDaoCoreSelectors } from '@dao-dao/state'
import { ActionBase, FamilyEmoji, useActionOptions } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  Feature,
  ProcessedMessage,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { AddressInput, EntityDisplay } from '../../../../components'
import {
  ManageSubDaosData,
  ManageSubDaosComponent as StatelessManageSubDaosComponent,
} from './Component'

const Component: ActionComponent = (props) => {
  const {
    address,
    chain: { chainId },
  } = useActionOptions()

  const currentSubDaos = useRecoilValue(
    DaoDaoCoreSelectors.allSubDaoConfigsSelector({
      chainId,
      contractAddress: address,
    })
  )

  return (
    <StatelessManageSubDaosComponent
      {...props}
      options={{
        currentSubDaos,
        AddressInput,
        EntityDisplay,
      }}
    />
  )
}

export class ManageSubDaosAction extends ActionBase<ManageSubDaosData> {
  public readonly key = ActionKey.ManageSubDaos
  public readonly Component = Component

  protected _defaults: ManageSubDaosData = {
    toAdd: [
      {
        addr: '',
      },
    ],
    toRemove: [],
  }

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can manage their subDAOs.')
    }

    if (!options.context.dao.supports(Feature.SubDaos)) {
      throw new Error("This DAO's version doesn't support subDAOs.")
    }

    super(options, {
      Icon: FamilyEmoji,
      label: options.t('title.manageSubDaos'),
      description: options.t('info.manageSubDaosActionDescription'),
    })
  }

  encode({ toAdd, toRemove }: ManageSubDaosData): UnifiedCosmosMsg {
    return makeExecuteSmartContractMessage({
      chainId: this.options.chain.chainId,
      sender: this.options.address,
      contractAddress: this.options.address,
      msg: {
        update_sub_daos: {
          to_add: toAdd,
          to_remove: toRemove.map(({ address }) => address),
        },
      },
    })
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              update_sub_daos: {
                to_add: {},
                to_remove: {},
              },
            },
          },
        },
      }) && decodedMessage.wasm.execute.contract_addr === this.options.address
    )
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): ManageSubDaosData {
    return {
      toAdd: decodedMessage.wasm.execute.msg.update_sub_daos.to_add,
      toRemove: decodedMessage.wasm.execute.msg.update_sub_daos.to_remove.map(
        (address: string) => ({
          address,
        })
      ),
    }
  }
}
