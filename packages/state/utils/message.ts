import { AccountType, MessageProcessor } from '@dao-dao/types'
import {
  decodeCw1WhitelistExecuteMsg,
  decodeIcaExecuteMsg,
  decodeMessage,
  decodePolytoneExecuteMsg,
} from '@dao-dao/utils'

import { accountQueries, polytoneNoteQueries } from '../query'

/**
 * Process a single Cosmos message, detecting the account that sent the message,
 * and parsing wrapped executions (such as cross-chain messages, cw1-whitelist
 * executions, etc.).
 */
export const processMessage: MessageProcessor = async ({
  chainId,
  sender,
  message,
  queryClient,
  errorIfNoRemoteAccount = false,
}) => {
  const accounts = sender
    ? await queryClient.fetchQuery(
        accountQueries.list(queryClient, {
          chainId,
          address: sender,
        })
      )
    : []

  const decodedMessage = decodeMessage(message)

  // Check if Polytone wrapped execute.
  const decodedPolytone = decodePolytoneExecuteMsg(
    chainId,
    decodedMessage,
    'any'
  )
  if (decodedPolytone.match) {
    let account = accounts.find(
      (a) =>
        a.type === AccountType.Polytone && a.chainId === decodedPolytone.chainId
    )
    // If not found for some reason, query for it.
    if (!account) {
      // Get proxy on destination chain.
      const proxy = sender
        ? await queryClient.fetchQuery(
            polytoneNoteQueries.remoteAddress(queryClient, {
              chainId,
              contractAddress: decodedPolytone.polytoneConnection.note,
              args: {
                localAddress: sender,
              },
            })
          )
        : undefined

      if (errorIfNoRemoteAccount && !proxy) {
        throw new Error(
          `No polytone proxy found on ${decodedPolytone.chainId} controlled by ${sender} on ${chainId}.`
        )
      }

      account = {
        type: AccountType.Polytone,
        chainId: decodedPolytone.chainId,
        address: proxy || '',
      }
    }

    return {
      message,
      account,
      isCrossChain: true,
      isWrapped: true,
      wrappedMessages: await Promise.all(
        decodedPolytone.cosmosMsgs.map(async (message) =>
          processMessage({
            chainId: account!.chainId,
            sender: account!.address,
            message,
            queryClient,
          })
        )
      ),
      decodedMessage:
        decodedPolytone.msgs.length === 0 ? null : decodedPolytone.msgs[0],
      decodedMessages: decodedPolytone.msgs,
      polytone: decodedPolytone,
    }
  }

  // Check if ICA wrapped execute.
  const decodedIca = decodeIcaExecuteMsg(chainId, decodedMessage, 'any')
  if (decodedIca.match) {
    let account = accounts.find(
      (a) => a.type === AccountType.Ica && a.chainId === decodedIca.chainId
    )
    // If not found, query for it.
    if (!account) {
      // Get remote ICA on destination chain.
      const remoteIcaAddress = sender
        ? await queryClient.fetchQuery(
            accountQueries.remoteIcaAddress({
              srcChainId: chainId,
              address: sender,
              destChainId: decodedIca.chainId,
            })
          )
        : undefined

      if (errorIfNoRemoteAccount && !remoteIcaAddress) {
        throw new Error(
          `No ICA address found on ${decodedIca.chainId} controlled by ${sender} on ${chainId}.`
        )
      }

      account = {
        type: AccountType.Ica,
        chainId: decodedIca.chainId,
        address: remoteIcaAddress || '',
      }
    }

    return {
      message,
      account,
      isCrossChain: true,
      isWrapped: true,
      wrappedMessages: await Promise.all(
        decodedIca.cosmosMsgsWithSenders.map(async ({ msg }) =>
          processMessage({
            chainId: account!.chainId,
            sender: account!.address,
            message: msg,
            queryClient,
          })
        )
      ),
      decodedMessage:
        decodedIca.msgsWithSenders.length === 0
          ? null
          : decodedIca.msgsWithSenders[0].msg,
      decodedMessages: decodedIca.msgsWithSenders.map(({ msg }) => msg),
      ica: decodedIca,
    }
  }

  // Check if cw1-whitelist wrapped execute.
  const decodedCw1Whitelist = decodeCw1WhitelistExecuteMsg(
    decodedMessage,
    'any'
  )
  if (decodedCw1Whitelist) {
    const account =
      accounts.find(
        (a) =>
          a.type === AccountType.Cw1Whitelist &&
          a.address === decodedCw1Whitelist.address
      ) ||
      // If not found, fetch the account.
      (await queryClient.fetchQuery(
        accountQueries.cw1Whitelist(queryClient, {
          chainId,
          address: decodedCw1Whitelist.address,
        })
      ))

    return {
      message,
      account,
      isCrossChain: false,
      isWrapped: true,
      wrappedMessages: await Promise.all(
        decodedCw1Whitelist.cosmosMsgs.map(async (message) =>
          processMessage({
            chainId: account!.chainId,
            sender: account!.address,
            message,
            queryClient,
          })
        )
      ),
      decodedMessage:
        decodedCw1Whitelist.msgs.length === 0
          ? null
          : decodedCw1Whitelist.msgs[0].msg,
      decodedMessages: decodedCw1Whitelist.msgs,
    }
  }

  return {
    message,
    account: {
      type: AccountType.Base,
      chainId,
      address: sender,
    },
    isCrossChain: false,
    isWrapped: false,
    wrappedMessages: [],
    decodedMessage,
    decodedMessages: [decodedMessage],
  }
}
