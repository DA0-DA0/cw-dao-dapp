import fs from 'fs'

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { EncodeObject } from '@cosmjs/proto-signing'
import chalk, { ChalkFunction } from 'chalk'

import { cwMsgToEncodeObject } from '@dao-dao/types'
import { MsgExec } from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/tx'
import { MsgStoreCode } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/tx'
import { AccessType } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/types'
import {
  CHAIN_GAS_MULTIPLIER,
  encodeJsonToBase64,
  findEventsAttributeValue,
  getRpcForChainId,
  gzipCompress,
} from '@dao-dao/utils'

export const instantiateContract = async ({
  client,
  sender,
  chainId,
  id,
  codeId,
  msg,
  label,
  logPrefixLength = -1,
  override,
}: {
  client: SigningCosmWasmClient
  sender: string
  chainId: string
  id: string
  codeId: number
  msg: Record<string, unknown>
  label: string
  /**
   * The logging prefix length. If undefined, will not log.
   */
  logPrefixLength?: number
  /**
   * If passed, use this contract instead of instantiating a new one.
   */
  override?: string
}) => {
  const log =
    logPrefixLength === -1
      ? () => {}
      : (chalk: ChalkFunction, text: string) =>
          console.log(
            chalk(
              `[${id}]${' '.repeat(logPrefixLength - id.length - 5)}` + text
            )
          )

  let contractAddress = override

  if (!contractAddress) {
    let transactionHash
    try {
      transactionHash = await client.signAndBroadcastSync(
        sender,
        [
          cwMsgToEncodeObject(
            chainId,
            {
              wasm: {
                instantiate: {
                  code_id: codeId,
                  msg: encodeJsonToBase64(msg),
                  funds: [],
                  label,
                  admin: undefined,
                },
              },
            },
            sender
          ),
        ],
        CHAIN_GAS_MULTIPLIER
      )
    } catch (err) {
      log(chalk.red, 'instantiate failed')
      throw err
    }

    log(chalk.greenBright, transactionHash)

    // Poll for TX.
    let events
    let tries = 15
    while (tries > 0) {
      try {
        events = (await client.getTx(transactionHash))?.events
        if (events) {
          break
        }
      } catch {}

      tries--
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (!events) {
      log(chalk.red, 'TX not found')
      throw new Error('TX not found')
    }

    contractAddress = findEventsAttributeValue(
      events,
      'instantiate',
      '_contract_address'
    )

    if (!contractAddress) {
      log(chalk.red, 'not found')
      throw new Error('Contract address not found')
    }
  }

  log(chalk.green, contractAddress)

  return contractAddress
}

export const uploadContract = async ({
  client,
  sender,
  authz,
  id,
  file,
  logPrefixLength = -1,
  restrictInstantiation,
}: {
  client: SigningCosmWasmClient
  sender: string
  authz?: string
  id: string
  file: string
  /**
   * The logging prefix length. If undefined, will not log.
   */
  logPrefixLength?: number
  restrictInstantiation?: boolean
}) => {
  const log =
    logPrefixLength === -1
      ? () => {}
      : (chalk: ChalkFunction, text: string) =>
          console.log(
            chalk(
              `[${id}]${' '.repeat(logPrefixLength - id.length - 5)}` + text
            )
          )

  const wasmData = new Uint8Array(fs.readFileSync(file).buffer)
  const compressedWasmData = await gzipCompress(wasmData)

  const msgStoreCode = MsgStoreCode.fromPartial({
    sender: authz || sender,
    wasmByteCode: compressedWasmData,
    instantiatePermission: restrictInstantiation
      ? {
          permission: AccessType.AnyOfAddresses,
          addresses: [authz || sender],
        }
      : {
          permission: AccessType.Everybody,
          addresses: [],
        },
  })

  const msg: EncodeObject = authz
    ? {
        typeUrl: MsgExec.typeUrl,
        value: MsgExec.fromPartial({
          grantee: sender,
          msgs: [MsgStoreCode.toProtoMsg(msgStoreCode)],
        }),
      }
    : {
        typeUrl: MsgStoreCode.typeUrl,
        value: msgStoreCode,
      }

  let transactionHash
  try {
    transactionHash = await client.signAndBroadcastSync(
      sender,
      [msg],
      CHAIN_GAS_MULTIPLIER
    )
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('authorization not found')
    ) {
      log(chalk.red, 'no authz permission granted')
      throw new Error('No authz permission granted')
    } else {
      log(chalk.red, 'failed')
      throw err
    }
  }

  log(chalk.greenBright, transactionHash)

  // Poll for TX.
  let events
  let tries = 50
  while (tries > 0) {
    try {
      events = (await client.getTx(transactionHash))?.events
      if (events) {
        break
      }
    } catch {}

    tries--
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  if (!events) {
    log(chalk.red, 'TX not found')
    throw new Error('TX not found')
  }

  const codeId = findEventsAttributeValue(events, 'store_code', 'code_id')

  if (!codeId) {
    log(chalk.red, 'not found')
    throw new Error(`Code ID not found for ${id} in TX ${transactionHash}`)
  }

  log(chalk.green, codeId)

  return Number(codeId)
}

export const getBlockMaxGas = async ({
  chainId,
}: {
  chainId: string
}): Promise<string> => {
  const blockMaxGas = (
    await (await fetch(`${getRpcForChainId(chainId)}/consensus_params`)).json()
  ).result.consensus_params.block.max_gas

  // if no max gas, default to 100000000
  return blockMaxGas === '-1' ? '100000000' : blockMaxGas
}
