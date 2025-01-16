import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { processMessage } from '@dao-dao/state'
import {
  ActionsContext,
  useChainContext,
  useUpdatingRef,
} from '@dao-dao/stateless'
import {
  ActionChainContext,
  ActionChainContextType,
  ActionContext,
  ActionMap,
  ActionOptions,
  ActionsProviderProps,
  IActionsContext,
} from '@dao-dao/types'

import {
  getCoreActionCategoryMakers,
  getCoreActions,
  makeActionCategories,
} from '../core'

export const BaseActionsProvider = ({
  address,
  actionContext,
  children,
}: ActionsProviderProps & {
  address: string
  /**
   * The action context to include. This may not be memoized.
   */
  actionContext: ActionContext
}) => {
  const { t } = useTranslation()
  const chainContext = useChainContext()
  const queryClient = useQueryClient()

  // Memoize action context since its reference is unstable.
  const actionContextRef = useUpdatingRef(actionContext)

  const context: IActionsContext = useMemo(() => {
    const actionChainContext: ActionChainContext = chainContext.config
      ? {
          type: ActionChainContextType.Supported,
          ...chainContext,
          // Type-check.
          config: chainContext.config,
        }
      : chainContext.base
        ? {
            type: ActionChainContextType.Configured,
            ...chainContext,
            config: chainContext.base,
          }
        : {
            type: ActionChainContextType.Any,
            ...chainContext,
          }

    const options: ActionOptions = {
      t,
      chain: chainContext.chain,
      chainContext: actionChainContext,
      address,
      context: actionContextRef.current,
      queryClient,
    }

    const coreActions = getCoreActions()
    const coreActionCategoryMakers = getCoreActionCategoryMakers()

    const actions = coreActions.flatMap((Action) => {
      // Action constructor throws error for invalid contexts.
      try {
        return new Action(options)
      } catch {
        return []
      }
    })
    const categories = makeActionCategories(coreActionCategoryMakers, options)

    return {
      options,
      actions,
      actionMap: actions.reduce((map, action) => {
        map[action.key] = action
        return map
      }, {} as ActionMap),
      categories,
      messageProcessor: processMessage,
    }
  }, [chainContext, t, address, actionContextRef, queryClient])

  return (
    <ActionsContext.Provider value={context}>
      {children}
    </ActionsContext.Provider>
  )
}
