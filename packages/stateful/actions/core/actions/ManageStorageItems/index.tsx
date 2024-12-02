import { DaoDaoCoreSelectors } from '@dao-dao/state'
import {
  ActionBase,
  WrenchEmoji,
  useActionOptions,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import { Feature, UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  ManageStorageItemsData,
  ManageStorageItemsComponent as StatelessManageStorageItemsComponent,
} from './Component'

const Component: ActionComponent<undefined, ManageStorageItemsData> = (
  props
) => {
  const {
    address,
    chain: { chainId },
  } = useActionOptions()

  const existingItems = useCachedLoadingWithError(
    DaoDaoCoreSelectors.listAllItemsSelector({
      contractAddress: address,
      chainId,
    })
  )

  return (
    <StatelessManageStorageItemsComponent
      {...props}
      options={{
        existingItems:
          existingItems.loading || existingItems.errored
            ? []
            : existingItems.data,
      }}
    />
  )
}

export class ManageStorageItemsAction extends ActionBase<ManageStorageItemsData> {
  public readonly key = ActionKey.ManageStorageItems
  public readonly Component = Component

  protected _defaults: ManageStorageItemsData = {
    setting: true,
    key: '',
    value: '',
  }

  private valueKey: string

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    super(options, {
      Icon: WrenchEmoji,
      label: options.t('title.manageStorageItems'),
      description: options.t('info.manageStorageItemsDescription'),
      // other actions, like manage widgets, should be matched before this
      matchPriority: -90,
    })

    this.valueKey = options.context.dao.supports(Feature.StorageItemValueKey)
      ? 'value'
      : 'addr'
  }

  encode({ setting, key, value }: ManageStorageItemsData): UnifiedCosmosMsg {
    return makeExecuteSmartContractMessage({
      chainId: this.options.chain.chainId,
      sender: this.options.address,
      contractAddress: this.options.address,
      msg: setting
        ? {
            set_item: {
              key,
              [this.valueKey]: value,
            },
          }
        : {
            remove_item: {
              key,
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
            msg: {},
          },
        },
      }) &&
      decodedMessage.wasm.execute.contract_addr === this.options.address &&
      ('set_item' in decodedMessage.wasm.execute.msg ||
        'remove_item' in decodedMessage.wasm.execute.msg)
    )
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): ManageStorageItemsData {
    const setting = 'set_item' in decodedMessage.wasm.execute.msg

    return {
      setting,
      key:
        (setting
          ? decodedMessage.wasm.execute.msg.set_item.key
          : decodedMessage.wasm.execute.msg.remove_item.key) ?? '',
      value: setting
        ? decodedMessage.wasm.execute.msg.set_item[this.valueKey]
        : decodedMessage.wasm.execute.msg.remove_item[this.valueKey],
    }
  }
}
