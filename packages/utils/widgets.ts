import { DaoWidget, IDaoBase, WidgetId } from '@dao-dao/types'

import { DAO_WIDGET_ITEM_NAMESPACE } from './constants'
import { getFilteredDaoItemsByPrefix } from './dao'

/**
 * Get the key in the DAO storage items map for a widget item.
 *
 * @param id `WidgetId` of the widget item.
 * @returns The key in the DAO storage items map for the widget item.
 */
export const getWidgetStorageItemKey = (id: WidgetId | string): string =>
  DAO_WIDGET_ITEM_NAMESPACE + id

/**
 * Get the DAO widgets from the DAO storage items.
 *
 * @param dao The DAO client.
 * @returns Parsed DAO widgets.
 */
export const getDaoWidgets = (dao: IDaoBase): DaoWidget[] =>
  getFilteredDaoItemsByPrefix(dao.info.items, getWidgetStorageItemKey(''))
    .map(([id, widgetJson]): DaoWidget | undefined => {
      try {
        return {
          id,
          values: (widgetJson && JSON.parse(widgetJson)) || {},
        }
      } catch (err) {
        // Ignore widget format error but log to console for debugging.
        console.error(`Invalid widget JSON: ${widgetJson}`, err)
        return
      }
    })
    // Validate widget structure.
    .filter((widget): widget is DaoWidget => !!widget)
