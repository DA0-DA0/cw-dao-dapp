import {
  ActionAndData,
  ActionContextType,
  ActionEncodeContext,
  ActionKeyAndData,
  ActionMap,
  ActionOptions,
  UnifiedCosmosMsg,
} from '@dao-dao/types'

import { getAccountAddress } from './account'

/**
 * Encode actions.
 */
export const encodeActions = async ({
  actionMap,
  encodeContext,
  data,
  options: { throwErrors = true } = {},
}: {
  actionMap: ActionMap
  encodeContext: ActionEncodeContext
  data: ActionKeyAndData[]
  options?: {
    /**
     * Whether or not to throw the error if a transform fails. If false, the
     * error will be logged to the console, and the message will be skipped.
     *
     * Defaults to true.
     */
    throwErrors?: boolean
  }
}): Promise<UnifiedCosmosMsg[]> =>
  (
    await Promise.all(
      data.map(async ({ actionKey, data }) => {
        // If no action, skip it.
        if (!actionKey) {
          return []
        }

        // If no data, maybe throw error because this is invalidly selected.
        if (!data) {
          if (throwErrors) {
            throw new Error('No action selected.')
          }

          return []
        }

        try {
          const action = actionMap[actionKey]
          if (!action) {
            return []
          }

          await action.init()

          return await action.encode(data, encodeContext)
        } catch (err) {
          if (throwErrors) {
            throw err
          }

          console.error(err)
        }

        return []
      })
    )
  ).flat()

/**
 * Resolve action keys with data to their actions.
 */
export const convertActionKeysAndDataToActions = (
  actionMap: ActionMap,
  actionKeysAndData: ActionKeyAndData[]
): ActionAndData[] =>
  actionKeysAndData.flatMap(({ actionKey, data }) => {
    const action = actionMap[actionKey]
    return action
      ? {
          action,
          data,
        }
      : []
  })

/**
 * Get the address for the given action options for the given chain. If a DAO,
 * this is the address of the native address on the same chain or the polytone
 * proxy on that chain. For a wallet, this is the address registered in the
 * wallet's profile, if any.
 */
export const getChainAddressForActionOptions = (
  { context, chain, address }: ActionOptions,
  chainId: string
): string | undefined =>
  // If on same chain, return address.
  chain.chainId === chainId
    ? address
    : // If on different chain, return DAO's polytone proxy address.
      context.type === ActionContextType.Dao
      ? getAccountAddress({
          accounts: context.dao.accounts,
          chainId,
        })
      : // If on different chain, return wallet's chain profile address if set.
        context.type === ActionContextType.Wallet
        ? context.profile?.chains[chainId]?.address
        : undefined
