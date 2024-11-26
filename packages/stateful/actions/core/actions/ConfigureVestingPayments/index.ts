import cloneDeep from 'lodash.clonedeep'

import { ActionBase, SuitAndTieEmoji } from '@dao-dao/stateless'
import {
  UnifiedCosmosMsg,
  VestingPaymentsWidgetData,
  WidgetId,
} from '@dao-dao/types'
import {
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { getWidgetStorageItemKey } from '@dao-dao/utils'

import { ManageWidgetsAction } from '../ManageWidgets'
import { ConfigureVestingPaymentsComponent } from './Component'

export class ConfigureVestingPaymentsAction extends ActionBase<VestingPaymentsWidgetData> {
  public readonly key = ActionKey.ConfigureVestingPayments
  public readonly Component = ConfigureVestingPaymentsComponent

  private manageWidgetsAction: ManageWidgetsAction

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    const enabled =
      !!options.context.dao.info.items[
        getWidgetStorageItemKey(WidgetId.VestingPayments)
      ]

    super(options, {
      Icon: SuitAndTieEmoji,
      label: enabled
        ? options.t('title.configureVestingPayments')
        : options.t('title.enableVestingPayments'),
      description: enabled
        ? options.t('info.configureVestingPaymentsDescription')
        : options.t('widgetDescription.vesting'),
      keywords: ['payroll'],
      notReusable: true,
    })

    this.manageWidgetsAction = new ManageWidgetsAction(options)
  }

  async setup() {
    await this.manageWidgetsAction.setup()

    // Attempt to load existing widget data.
    const widget = this.manageWidgetsAction.availableWidgets.find(
      ({ id }) => id === WidgetId.VestingPayments
    )

    this._defaults = widget
      ? cloneDeep(widget.values)
      : {
          factories: {},
        }
  }

  encode(data: VestingPaymentsWidgetData): Promise<UnifiedCosmosMsg[]> {
    return this.manageWidgetsAction.encode({
      mode: 'set',
      id: WidgetId.VestingPayments,
      values: data,
    })
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    const manageWidgetsMatch = this.manageWidgetsAction.match(messages)
    if (!manageWidgetsMatch) {
      return manageWidgetsMatch
    }

    // Ensure this is setting the vesting payments widget item.
    const { mode, id } = this.manageWidgetsAction.decode(messages)
    return mode === 'set' && id === WidgetId.VestingPayments
  }

  decode(messages: ProcessedMessage[]): VestingPaymentsWidgetData {
    return this.manageWidgetsAction.decode(messages).values
  }
}
