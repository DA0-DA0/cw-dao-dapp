import { ActionBase, BeeEmoji } from '@dao-dao/stateless'
import { UnifiedCosmosMsg, WidgetId } from '@dao-dao/types'
import {
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { getWidgetStorageItemKey } from '@dao-dao/utils'

import { ManageWidgetsAction } from '../ManageWidgets'
import { EnableRetroactiveCompensationComponent } from './Component'

export class EnableRetroactiveCompensationAction extends ActionBase<{}> {
  public readonly key = ActionKey.EnableRetroactiveCompensation
  public readonly Component = EnableRetroactiveCompensationComponent

  protected _defaults = {}

  private manageWidgetsAction: ManageWidgetsAction

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    const enabled =
      !!options.context.dao.info.items[
        getWidgetStorageItemKey(WidgetId.RetroactiveCompensation)
      ]

    super(options, {
      Icon: BeeEmoji,
      label: options.t('title.enableRetroactiveCompensation'),
      description: options.t('widgetDescription.retroactive'),
      keywords: ['payroll'],
      notReusable: true,
      // Do not allow using this action if the DAO already has retroactive
      // compensation enabled.
      hideFromPicker: enabled,
    })

    this.manageWidgetsAction = new ManageWidgetsAction(options)
  }

  setup() {
    return this.manageWidgetsAction.setup()
  }

  encode(): Promise<UnifiedCosmosMsg[]> {
    return this.manageWidgetsAction.encode({
      mode: 'set',
      id: WidgetId.RetroactiveCompensation,
      values: {},
    })
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    const manageWidgetsMatch = this.manageWidgetsAction.match(messages)
    if (!manageWidgetsMatch) {
      return manageWidgetsMatch
    }

    // Ensure this is setting the retroactive compensation widget item.
    const { mode, id } = this.manageWidgetsAction.decode(messages)
    return mode === 'set' && id === WidgetId.RetroactiveCompensation
  }

  decode() {
    return {}
  }
}
