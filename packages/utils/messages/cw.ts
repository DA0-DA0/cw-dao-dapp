import { fromBase64, toBase64, toUtf8 } from '@cosmjs/encoding'
import { Coin } from '@cosmjs/proto-signing'
import cloneDeep from 'lodash.clonedeep'
import { nanoid } from 'nanoid'

import {
  CrossChainPacketInfo,
  CrossChainPacketInfoType,
  DecodedIcaMsg,
  DecodedPolytoneMsg,
  cwMsgToProtobuf,
  decodeStargateMessage,
  makeStargateMessage,
  protobufToCwMsg,
} from '@dao-dao/types'
import {
  BankMsg,
  StargateMsg,
  UnifiedCosmosMsg,
  WasmMsg,
} from '@dao-dao/types/contracts/common'
import {
  MsgRegisterInterchainAccount,
  MsgSendTx,
} from '@dao-dao/types/protobuf/codegen/ibc/applications/interchain_accounts/controller/v1/tx'
import {
  CosmosTx,
  InterchainAccountPacketData,
  Type,
} from '@dao-dao/types/protobuf/codegen/ibc/applications/interchain_accounts/v1/packet'
import { MsgTransfer } from '@dao-dao/types/protobuf/codegen/ibc/applications/transfer/v1/tx'
import { MsgExecuteContract as SecretMsgExecuteContract } from '@dao-dao/types/protobuf/codegen/secret/compute/v1beta1/msg'

import {
  getChainForChainName,
  getIbcTransferInfoBetweenChains,
  getIbcTransferInfoFromConnection,
  getSupportedChainConfig,
  isSecretNetwork,
} from '../chain'
import { IBC_TIMEOUT_SECONDS } from '../constants'
import { bech32AddressToBase64 } from '../contracts'
import { processError } from '../error'
import { Structure, objectMatchesStructure } from '../objectMatchesStructure'
import { decodeJsonFromBase64, encodeJsonToBase64 } from './encoding'
import { isDecodedStargateMsg } from './protobuf'

type WasmMsgType =
  | 'execute'
  | 'instantiate'
  | 'instantiate2'
  | 'migrate'
  | 'update_admin'
  | 'clear_admin'

const WASM_TYPES: WasmMsgType[] = [
  'execute',
  'instantiate',
  'instantiate2',
  'migrate',
  'update_admin',
  'clear_admin',
]

const BINARY_WASM_TYPES: { [key: string]: boolean } = {
  execute: true,
  instantiate: true,
  instantiate2: true,
  migrate: true,
}

export function isWasmMsg(msg?: any): msg is { wasm: WasmMsg } {
  if (msg) {
    return (msg as any).wasm !== undefined
  }
  return false
}

function getWasmMsgType(wasm: WasmMsg): WasmMsgType | undefined {
  for (const wasmType of WASM_TYPES) {
    if (!!(wasm as any)[wasmType]) {
      return wasmType
    }
  }
  return undefined
}

export const isCosmWasmStargateMsg = (msg: any): msg is StargateMsg =>
  objectMatchesStructure(msg, {
    stargate: {
      type_url: {},
      value: {},
    },
  }) && typeof msg.stargate.value === 'string'

function isBinaryType(msgType?: WasmMsgType): boolean {
  if (msgType) {
    return !!BINARY_WASM_TYPES[msgType]
  }
  return false
}

/**
 * Decode a Cosmos message so that we can access its contents. For wasm
 * messages, this decodes the `msg` base64 string field, and for stargate
 * messages, this decodes the `value` base64 string field with available
 * protobufs. All other Cosmos messages are returned as-is.
 */
export const decodeMessage = (msg: any): any => {
  // Decode base64 wasm binary into object.
  if (isWasmMsg(msg)) {
    const msgType = getWasmMsgType(msg.wasm)
    if (msgType && isBinaryType(msgType)) {
      const base64MsgContainer = (msg.wasm as any)[msgType]
      if (base64MsgContainer && 'msg' in base64MsgContainer) {
        const parsedMsg = decodeJsonFromBase64(base64MsgContainer.msg, true)
        if (parsedMsg) {
          return {
            ...msg,
            wasm: {
              ...msg.wasm,
              [msgType]: {
                ...base64MsgContainer,
                msg: parsedMsg,
              },
            },
          }
        }
      }
    }
  } else if (isCosmWasmStargateMsg(msg)) {
    // Decode Stargate protobuf message. If fail to decode, ignore.
    try {
      return decodeStargateMessage(msg)
    } catch (err) {
      console.error(processError(err, { forceCapture: true }))
    }
  }

  return msg
}

export const decodeMessages = (msgs: any[]): any[] => msgs.map(decodeMessage)

export function decodedMessagesString(msgs: any[]): string {
  const decodedMessageArray = decodeMessages(msgs)
  return JSON.stringify(decodedMessageArray, undefined, 2)
}

/**
 * Decode wasm message binary if a wasm message, returning null if not.
 */
export const decodeWasmMessage = (message: any): Record<string, any> | null => {
  if (!isWasmMsg(message)) {
    return null
  }

  const type = getWasmMsgType(message.wasm)
  if (type && isBinaryType(type)) {
    const base64MsgContainer = (message.wasm as any)[type]
    if (base64MsgContainer && 'msg' in base64MsgContainer) {
      const parsedMsg = decodeJsonFromBase64(base64MsgContainer.msg, true)
      if (parsedMsg) {
        return {
          ...message,
          wasm: {
            ...message.wasm,
            [type]: {
              ...base64MsgContainer,
              msg: parsedMsg,
            },
          },
        }
      }
    }
  }

  return null
}

/**
 * Make a Cosmos message that executes a smart contract, intelligently encoded
 * to support Secret Network if necessary.
 */
export const makeExecuteSmartContractMessage = ({
  chainId,
  sender,
  contractAddress,
  msg,
  funds,
}: {
  chainId: string
  sender: string
  contractAddress: string
  msg: Record<string, any>
  funds?: Coin[]
}): UnifiedCosmosMsg =>
  isSecretNetwork(chainId)
    ? makeStargateMessage({
        stargate: {
          typeUrl: SecretMsgExecuteContract.typeUrl,
          value: SecretMsgExecuteContract.fromAmino({
            sender: bech32AddressToBase64(sender),
            contract: bech32AddressToBase64(contractAddress),
            sent_funds: funds || [],
            msg: encodeJsonToBase64(msg),
          }),
        },
      })
    : makeWasmMessage({
        wasm: {
          execute: {
            contract_addr: contractAddress,
            funds: funds || [],
            msg,
          },
        },
      })

/**
 * Encode relevant components of wasm messages into base64 strings as the chain
 * expects.
 */
export const makeWasmMessage = (msg: {
  wasm: any
}): {
  wasm: WasmMsg
} => {
  msg = cloneDeep(msg)

  // We need to encode Wasm Execute, Instantiate, and Migrate messages. Messages
  // such as update or clear admin pass through without modification.
  if (
    objectMatchesStructure(msg, {
      wasm: {
        execute: {
          msg: {},
        },
      },
    }) &&
    typeof msg.wasm.execute.msg !== 'string'
  ) {
    msg.wasm.execute.msg = encodeJsonToBase64(msg.wasm.execute.msg)
  } else if (
    objectMatchesStructure(msg, {
      wasm: {
        instantiate: {
          msg: {},
        },
      },
    }) &&
    typeof msg.wasm.instantiate.msg !== 'string'
  ) {
    msg.wasm.instantiate.msg = encodeJsonToBase64(msg.wasm.instantiate.msg)
  } else if (
    objectMatchesStructure(msg, {
      wasm: {
        instantiate2: {
          msg: {},
          salt: {},
        },
      },
    })
  ) {
    if (typeof msg.wasm.instantiate2.msg !== 'string') {
      msg.wasm.instantiate2.msg = encodeJsonToBase64(msg.wasm.instantiate2.msg)
    }
    msg.wasm.instantiate2.salt = toBase64(toUtf8(msg.wasm.instantiate2.salt))
  } else if (
    objectMatchesStructure(msg, {
      wasm: {
        migrate: {
          msg: {},
        },
      },
    }) &&
    typeof msg.wasm.migrate.msg !== 'string'
  ) {
    msg.wasm.migrate.msg = encodeJsonToBase64(msg.wasm.migrate.msg)
  }

  return msg
}

export const makeBankMessage = (
  amount: string,
  to: string,
  denom: string
): BankMsg => ({
  send: {
    amount: [
      {
        amount,
        denom,
      },
    ],
    to_address: to,
  },
})

/**
 * Convert object into CosmWasm-formatted Cosmos message. Used by the Custom
 * action component to encode a generic JSON string.
 */
export const makeCosmosMsg = (msg: any): UnifiedCosmosMsg => {
  // Convert the wasm message component to base64 if necessary.
  if (
    objectMatchesStructure(msg, {
      wasm: {},
    })
  ) {
    msg = makeWasmMessage(msg)
  }

  // Encode JSON stargate message if needed.
  if (
    objectMatchesStructure(msg, {
      stargate: {
        typeUrl: {},
        value: {},
      },
    })
  ) {
    msg = makeStargateMessage(msg)
  }

  // If msg is in the encoded stargate format, validate it.
  if (
    objectMatchesStructure(msg, {
      stargate: {
        type_url: {},
        value: {},
      },
    })
  ) {
    if (typeof msg.stargate.value !== 'string') {
      throw new Error('stargate `value` must be a base64-encoded string')
    }

    // Ensure value is valid base64 by attempting to decode it and throwing
    // error on failure.
    fromBase64(msg.stargate.value)
  }

  return msg
}

export enum StakingActionType {
  Delegate = 'delegate',
  Undelegate = 'undelegate',
  Redelegate = 'redelegate',
  WithdrawDelegatorReward = 'withdraw_delegator_reward',
  SetWithdrawAddress = 'set_withdraw_address',
}

// If the source and destination chains are different, this wraps the message(s)
// in a polytone execution message. Otherwise, it just returns the message(s).
// If the chains are different but the message is undefined, this will return a
// message that just creates a Polytone account.
export const maybeMakePolytoneExecuteMessages = (
  srcChainId: string,
  destChainId: string,
  // Allow passing no message, which just creates an account.
  msg: UnifiedCosmosMsg | UnifiedCosmosMsg[] = []
): UnifiedCosmosMsg[] => {
  // If on same chain, just return the message(s).
  if (srcChainId === destChainId) {
    return [msg].flat()
  }

  const polytoneConnection =
    getSupportedChainConfig(srcChainId)?.polytone?.[destChainId]

  return [
    makeWasmMessage({
      wasm: {
        execute: {
          contract_addr: polytoneConnection?.note,
          funds: [],
          msg: {
            execute: {
              msgs: [msg].flat(),
              timeout_seconds: BigInt(IBC_TIMEOUT_SECONDS).toString(),
              callback: {
                msg: toBase64(toUtf8(nanoid())),
                receiver: polytoneConnection?.listener,
              },
            },
          },
        },
      },
    }),
  ]
}

/**
 * Checks if the message is a Polytone execute message and extracts the chain ID
 * and msg(s).
 */
export const decodePolytoneExecuteMsg = (
  srcChainId: string,
  decodedMsg: Record<string, any>,
  // How many messages are expected.
  type: 'one' | 'zero' | 'oneOrZero' | 'any' = 'one'
): DecodedPolytoneMsg => {
  if (
    !objectMatchesStructure(decodedMsg, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            execute: {
              msgs: {},
              timeout_seconds: {},
              callback: {
                msg: {},
                receiver: {},
              },
            },
          },
        },
      },
    }) ||
    (type === 'zero' &&
      decodedMsg.wasm.execute.msg.execute.msgs.length !== 0) ||
    (type === 'one' && decodedMsg.wasm.execute.msg.execute.msgs.length !== 1) ||
    (type === 'oneOrZero' &&
      decodedMsg.wasm.execute.msg.execute.msgs.length > 1)
  ) {
    return {
      match: false,
    }
  }

  const polytoneConnection = Object.entries(
    getSupportedChainConfig(srcChainId)?.polytone || {}
  ).find(([, { note }]) => note === decodedMsg.wasm.execute.contract_addr)
  // Unrecognized polytone connection.
  if (!polytoneConnection) {
    return {
      match: false,
    }
  }

  const cosmosMsgs = decodedMsg.wasm.execute.msg.execute.msgs
  const msgs = decodeMessages(cosmosMsgs)

  return {
    match: true,
    chainId: polytoneConnection[0],
    polytoneConnection: polytoneConnection[1],
    msg: msgs[0] || {},
    cosmosMsg: cosmosMsgs[0],
    msgs,
    cosmosMsgs,
    initiatorMsg: decodedMsg.wasm.execute.msg.execute.callback.msg,
  }
}

/**
 * If the source and destination chains are different, this wraps the message(s)
 * in an ICA execution message. Otherwise, it just returns the message(s).
 */
export const maybeMakeIcaExecuteMessages = (
  srcChainId: string,
  destChainId: string,
  /**
   * The ICA host address (owner) on the source chain (i.e. the src sender).
   */
  icaHostAddress: string,
  /**
   * The ICA remote address on the destination chain (i.e. the dest sender).
   */
  icaRemoteAddress: string,
  msg: UnifiedCosmosMsg | UnifiedCosmosMsg[]
): UnifiedCosmosMsg[] => {
  // If on same chain, just return the message.
  if (srcChainId === destChainId && msg) {
    return [msg].flat()
  }

  const {
    sourceChain: { connection_id: connectionId },
  } = getIbcTransferInfoBetweenChains(srcChainId, destChainId)

  return [
    makeStargateMessage({
      stargate: {
        typeUrl: MsgSendTx.typeUrl,
        value: MsgSendTx.fromPartial({
          owner: icaHostAddress,
          connectionId,
          packetData: InterchainAccountPacketData.fromPartial({
            type: Type.TYPE_EXECUTE_TX,
            data: CosmosTx.toProto({
              messages: [msg]
                .flat()
                .map((msg) =>
                  cwMsgToProtobuf(destChainId, msg, icaRemoteAddress)
                ),
            }),
            memo: '',
          }),
          // Nanoseconds timeout from TX execution.
          relativeTimeout: BigInt(IBC_TIMEOUT_SECONDS * 1e9),
        }),
      },
    }),
  ]
}

/**
 * Checks if the message is an ICA execute message and extracts the chain ID and
 * msg(s).
 */
export const decodeIcaExecuteMsg = (
  srcChainId: string,
  decodedMsg: Record<string, any>,
  // How many messages are expected.
  type: 'one' | 'zero' | 'oneOrZero' | 'any' = 'one'
): DecodedIcaMsg => {
  if (!isDecodedStargateMsg(decodedMsg, MsgSendTx)) {
    return {
      match: false,
    }
  }

  try {
    const { connectionId } = decodedMsg.stargate.value as MsgSendTx
    const { destinationChain } = getIbcTransferInfoFromConnection(
      srcChainId,
      connectionId
    )
    const chain = getChainForChainName(destinationChain.chain_name)

    const { packetData: { data } = {} } = decodedMsg.stargate.value as MsgSendTx
    const protobufMessages = data && CosmosTx.decode(data).messages
    const cosmosMsgsWithSenders =
      protobufMessages?.map((protobuf) =>
        protobufToCwMsg(chain, protobuf, false)
      ) || []

    if (
      (type === 'zero' && cosmosMsgsWithSenders.length !== 0) ||
      (type === 'one' && cosmosMsgsWithSenders.length !== 1) ||
      (type === 'oneOrZero' && cosmosMsgsWithSenders.length > 1)
    ) {
      return {
        match: false,
      }
    }

    const msgsWithSenders = cosmosMsgsWithSenders.map(({ sender, msg }) => ({
      sender,
      msg: decodeMessage(msg),
    }))

    return {
      match: true,
      chainId: chain.chainId,
      type: 'execute',
      msgWithSender: msgsWithSenders[0],
      cosmosMsgWithSender: cosmosMsgsWithSenders[0],
      msgsWithSenders,
      cosmosMsgsWithSenders,
    }
  } catch (err) {
    console.error('ICA execute decode error', err)
    return {
      match: false,
    }
  }
}

/**
 * Checks if the message is an ICA create message and extracts the chain ID.
 */
export const decodeIcaCreateMsg = (
  srcChainId: string,
  decodedMsg: Record<string, any>
): DecodedIcaMsg => {
  if (!isDecodedStargateMsg(decodedMsg, MsgRegisterInterchainAccount)) {
    return {
      match: false,
    }
  }

  try {
    const { connectionId } = decodedMsg.stargate
      .value as MsgRegisterInterchainAccount
    const { destinationChain } = getIbcTransferInfoFromConnection(
      srcChainId,
      connectionId
    )
    const chain = getChainForChainName(destinationChain.chain_name)

    return {
      match: true,
      chainId: chain.chainId,
      type: 'create',
      msgsWithSenders: [],
      cosmosMsgsWithSenders: [],
    }
  } catch (err) {
    console.error('ICA create decode error', err)
    return {
      match: false,
    }
  }
}

/**
 * Decode cross-chain messages, which is either polytone or ICA.
 */
export const decodeCrossChainMessages = (
  srcChainId: string,
  srcAddress: string,
  msgs: UnifiedCosmosMsg[]
): CrossChainPacketInfo[] =>
  decodeMessages(msgs).flatMap(
    (msg): CrossChainPacketInfo | CrossChainPacketInfo[] => {
      const decodedPolytone = decodePolytoneExecuteMsg(srcChainId, msg, 'any')
      if (decodedPolytone.match) {
        return {
          type: CrossChainPacketInfoType.Polytone,
          data: decodedPolytone,
          sender: srcAddress,
          srcConnection: decodedPolytone.polytoneConnection.localConnection,
          srcChannel: decodedPolytone.polytoneConnection.localChannel,
          srcPort: `wasm.${decodedPolytone.polytoneConnection.note}`,
          dstConnection: decodedPolytone.polytoneConnection.remoteConnection,
          dstChannel: decodedPolytone.polytoneConnection.remoteChannel,
          dstPort: `wasm.${decodedPolytone.polytoneConnection.voice}`,
        }
      }

      let decodedIca = decodeIcaExecuteMsg(srcChainId, msg, 'any')
      // TODO(ICA-create): fix self-relaying ICA create messages
      // if (!decodedIca.match) {
      //   decodedIca = decodeIcaCreateMsg(srcChainId, msg)
      // }
      if (decodedIca.match) {
        const ibcInfo = getIbcTransferInfoBetweenChains(
          srcChainId,
          decodedIca.chainId
        )

        return {
          type: CrossChainPacketInfoType.Ica,
          data: decodedIca,
          sender: srcAddress,
          srcConnection: ibcInfo.sourceChain.connection_id,
          srcPort: `icacontroller-${srcAddress}`,
          dstConnection: ibcInfo.destinationChain.connection_id,
          dstPort: 'icahost',
        }
      }

      // If DAO admin exec, recurse.
      if (
        objectMatchesStructure(msg, {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                execute_admin_msgs: {
                  msgs: {},
                },
              },
            },
          },
        })
      ) {
        return decodeCrossChainMessages(
          srcChainId,
          msg.wasm.execute.contract_addr,
          msg.wasm.execute.msg.execute_admin_msgs.msgs
        )
      }

      return []
    }
  )

/**
 * Wrap the message in a cw1-whitelist execution message.
 */
export const makeCw1WhitelistExecuteMessage = ({
  chainId,
  sender,
  cw1WhitelistContract,
  msg,
}: {
  chainId: string
  sender: string
  cw1WhitelistContract: string
  msg: UnifiedCosmosMsg | UnifiedCosmosMsg[]
}): UnifiedCosmosMsg =>
  makeExecuteSmartContractMessage({
    chainId,
    sender,
    contractAddress: cw1WhitelistContract,
    msg: {
      execute: {
        msgs: [msg].flat(),
      },
    },
  })

/**
 * Checks if the message is a cw1-whitelist execute message and extracts the
 * address and msg(s).
 */
export const decodeCw1WhitelistExecuteMsg = (
  decodedMsg: Record<string, any>,
  // How many messages are expected.
  type: 'one' | 'zero' | 'oneOrZero' | 'any'
):
  | {
      address: string
      msgs: Record<string, any>[]
      cosmosMsgs: UnifiedCosmosMsg[]
    }
  | undefined => {
  if (
    !objectMatchesStructure(decodedMsg, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            execute: {
              msgs: {},
            },
          },
        },
      },
    }) ||
    (type === 'zero' &&
      decodedMsg.wasm.execute.msg.execute.msgs.length !== 0) ||
    (type === 'one' && decodedMsg.wasm.execute.msg.execute.msgs.length !== 1) ||
    (type === 'oneOrZero' &&
      decodedMsg.wasm.execute.msg.execute.msgs.length > 1)
  ) {
    return
  }

  const cosmosMsgs = decodedMsg.wasm.execute.msg.execute.msgs
  const msgs = decodeMessages(cosmosMsgs)

  return {
    address: decodedMsg.wasm.execute.contract_addr,
    msgs,
    cosmosMsgs,
  }
}

export const getFundsUsedInCwMessage = (msg: UnifiedCosmosMsg): Coin[] =>
  'bank' in msg
    ? 'send' in msg.bank
      ? msg.bank.send.amount
      : 'burn' in msg.bank
        ? msg.bank.burn.amount
        : []
    : 'staking' in msg
      ? 'delegate' in msg.staking
        ? [msg.staking.delegate.amount]
        : 'undelegate' in msg.staking
          ? [msg.staking.undelegate.amount]
          : 'redelegate' in msg.staking
            ? [msg.staking.redelegate.amount]
            : []
      : 'ibc' in msg
        ? 'transfer' in msg.ibc
          ? [msg.ibc.transfer.amount]
          : []
        : 'wasm' in msg
          ? 'execute' in msg.wasm
            ? 'funds' in msg.wasm.execute
              ? msg.wasm.execute.funds
              : // Secret Network
                msg.wasm.execute.send
            : 'instantiate' in msg.wasm
              ? 'funds' in msg.wasm.instantiate
                ? msg.wasm.instantiate.funds
                : // Secret Network
                  msg.wasm.instantiate.send
              : []
          : isCosmWasmStargateMsg(msg)
            ? (() => {
                try {
                  const decoded = decodeStargateMessage(msg).stargate
                  switch (decoded.typeUrl) {
                    // Support IBC spends.
                    case MsgTransfer.typeUrl: {
                      const data = decoded.value as MsgTransfer
                      if (data.token) {
                        return [data.token]
                      }
                    }
                  }
                } catch {}

                return []
              })()
            : []

/**
 * Check whether or not the message is a cw20 send contract message, optionally
 * checking the structure of the nested message and the contract address being
 * executed. If it is, returns the cw20 message fields and the decoded message
 * object.
 */
export const parseCw20SendContractMessage = (
  msg: Record<string, any>,
  nestedStructure?: Structure,
  contract?: string
):
  | undefined
  | {
      cw20: string
      amount: string
      contract: string
      msg: Record<string, any>
    } => {
  const isCw20Send = objectMatchesStructure(msg, {
    wasm: {
      execute: {
        contract_addr: {},
        funds: {},
        msg: {
          send: {
            amount: {},
            contract: {},
            msg: {},
          },
        },
      },
    },
  })
  if (!isCw20Send) {
    return
  }

  const decodedMsg = decodeJsonFromBase64(msg.wasm.execute.msg.send.msg, true)
  if (nestedStructure && !objectMatchesStructure(decodedMsg, nestedStructure)) {
    return
  }

  if (contract && msg.wasm.execute.msg.send.contract !== contract) {
    return
  }

  return {
    cw20: msg.wasm.execute.contract_addr,
    amount: msg.wasm.execute.msg.send.amount,
    contract: msg.wasm.execute.msg.send.contract,
    msg: decodedMsg,
  }
}
