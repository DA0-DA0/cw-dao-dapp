// External API

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useChain, useDao } from '@dao-dao/stateless'
import {
  LoadedWidget,
  LoadingData,
  WidgetLocation,
  WidgetVisibilityContext,
} from '@dao-dao/types'
import { getDaoWidgets } from '@dao-dao/utils'

import { useMembership } from '../../hooks'
import { getWidgetById } from '../core'

type UseWidgetsOptions = {
  // If passed, will only return the widgets in this location.
  location?: WidgetLocation
}

type UseWidgetsResult = LoadingData<LoadedWidget[]>

// Get widgets for the DAO.
export const useWidgets = ({
  location,
}: UseWidgetsOptions = {}): UseWidgetsResult => {
  const { t } = useTranslation()
  const { chainId } = useChain()
  const { items } = useDao().info
  const { isMember = false } = useMembership()

  const loadingWidgets = useMemo((): LoadingData<LoadedWidget[]> => {
    const daoWidgets = getDaoWidgets(items)

    return {
      loading: false,
      data: daoWidgets
        .map((daoWidget): LoadedWidget | undefined => {
          const widget = getWidgetById(chainId, daoWidget.id)
          // Enforce location filter.
          if (!widget || (location && widget.location !== location)) {
            return
          }

          // Enforce visibility context.
          switch (widget.visibilityContext) {
            case WidgetVisibilityContext.OnlyMembers:
              if (!isMember) {
                return
              }
              break
            case WidgetVisibilityContext.OnlyNonMembers:
              if (isMember) {
                return
              }
              break
          }

          // Fill component with loaded values.
          const WidgetComponent = () =>
            widget.Renderer ? (
              <widget.Renderer variables={(daoWidget.values || {}) as any} />
            ) : null

          return {
            title: t('widgetTitle.' + widget.id),
            widget,
            daoWidget,
            WidgetComponent,
          }
        })
        // Filter out any undefined widgets.
        .filter((widget): widget is LoadedWidget => !!widget),
    }
  }, [items, isMember, t, location, chainId])

  return loadingWidgets
}
