import { ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Loader, useChain, useDaoInfoContext } from '@dao-dao/stateless'
import {
  ActionContext,
  ActionContextType,
  ActionOptions,
  IActionsContext,
} from '@dao-dao/types'

import { useWallet } from '../../hooks/useWallet'
import { matchAndLoadCommon } from '../../proposal-module-adapter'
import { useVotingModuleAdapter } from '../../voting-module-adapter'
import { useWidgets } from '../../widgets'
import {
  getCoreActionCategoryMakers,
  makeActionCategoriesWithLabel,
} from '../core'
import { ActionsContext } from './context'

export type ActionsProviderProps = {
  children: ReactNode | ReactNode[]
}

export type WalletActionsProviderProps = ActionsProviderProps & {
  // If passed, will override the connected wallet address.
  address?: string
}

// Make sure this re-renders when the options change. You can do this by setting
// a `key` on this component or one of its ancestors. See DaoPageWrapper.tsx
// where this component is used for a usage example.
export const DaoActionsProvider = ({ children }: ActionsProviderProps) => {
  const { t } = useTranslation()
  const chain = useChain()
  const info = useDaoInfoContext()
  const options: ActionOptions = {
    t,
    chain,
    address: info.coreAddress,
    context: {
      type: ActionContextType.Dao,
      info,
    },
  }

  // Get the action category makers for a DAO from its various sources:
  // - core actions
  // - voting module adapter actions
  // - all proposal module adapters actions
  // - widget adapter actions
  //
  // The core action categories are relevant to all DAOs, and the adapter action
  // categories are relevant to the DAO's specific modules. There will be one
  // voting module and many proposal modules.

  const coreActionCategoryMakers = getCoreActionCategoryMakers()

  // Get voting module adapter actions.
  const votingModuleActionCategoryMakers =
    useVotingModuleAdapter().fields.actionCategoryMakers

  // Get all actions for all proposal module adapters.
  const proposalModuleActionCategoryMakers = useMemo(
    () =>
      info.proposalModules.flatMap(
        (proposalModule) =>
          matchAndLoadCommon(proposalModule, {
            chain,
            coreAddress: info.coreAddress,
          }).fields.actionCategoryMakers
      ),
    [chain, info.coreAddress, info.proposalModules]
  )

  const loadingWidgets = useWidgets({
    suspendWhileLoading: true,
  })
  const widgetActionCategoryMakers = loadingWidgets.loading
    ? []
    : loadingWidgets.data.flatMap(
        ({ widget, daoWidget }) =>
          widget.getActionCategoryMakers?.(daoWidget.values || {}) ?? []
      )

  // Make action categories.
  const categories = makeActionCategoriesWithLabel(
    [
      ...coreActionCategoryMakers,
      ...votingModuleActionCategoryMakers,
      ...proposalModuleActionCategoryMakers,
      ...widgetActionCategoryMakers,
    ],
    options
  )

  const context: IActionsContext = {
    options,
    categories,
  }

  return (
    <ActionsContext.Provider value={context}>
      {children}
    </ActionsContext.Provider>
  )
}

export const BaseActionsProvider = ({
  address,
  context,
  children,
}: ActionsProviderProps & {
  address: string
  context: ActionContext
}) => {
  const { t } = useTranslation()
  const chain = useChain()

  const options: ActionOptions = {
    t,
    chain,
    address,
    context,
  }

  const categories = makeActionCategoriesWithLabel(
    getCoreActionCategoryMakers(),
    options
  )

  return (
    <ActionsContext.Provider
      value={{
        options,
        categories,
      }}
    >
      {children}
    </ActionsContext.Provider>
  )
}

export const WalletActionsProvider = ({
  address: overrideAddress,
  children,
}: WalletActionsProviderProps) => {
  const { address: connectedAddress } = useWallet()
  const address = overrideAddress || connectedAddress

  if (!address) {
    return <Loader />
  }

  return (
    <BaseActionsProvider
      address={address}
      context={{
        type: ActionContextType.Wallet,
      }}
    >
      {children}
    </BaseActionsProvider>
  )
}
