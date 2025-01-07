import { toBase64 } from '@cosmjs/encoding'
import Long from 'long'

import {
  DecodedStargateMsg,
  GovProposal,
  GovProposalV1,
  GovProposalV1DecodedMessages,
  GovProposalVersion,
  GovProposalWithDecodedContent,
  decodeRawProtobufMsg,
  decodeStargateMessage,
  protobufToCwMsg,
} from '@dao-dao/types'
import { MsgExecLegacyContent } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1/tx'
import { TextProposal } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { Any } from '@dao-dao/types/protobuf/codegen/google/protobuf/any'

import { getChainForChainId } from '../chain'
import { transformIpfsUrlToHttpsIfNecessary } from '../conversion'
import { isValidUrl } from '../isValidUrl'
import { Structure, objectMatchesStructure } from '../objectMatchesStructure'
import { isCosmWasmStargateMsg } from './cw'

// Decode governance proposal v1 messages using a protobuf.
export const decodeGovProposalV1Messages = (
  chainId: string,
  messages: GovProposalV1['proposal']['messages']
): GovProposalV1DecodedMessages =>
  messages.map((msg) => {
    try {
      return protobufToCwMsg(getChainForChainId(chainId), msg).msg
    } catch (err) {
      // If protobuf not found, return raw stargate message.

      // Don't error on server.
      if (typeof window !== 'undefined') {
        console.error(err)
      }

      return {
        stargate: {
          type_url: msg.typeUrl,
          value: toBase64(msg.value),
        },
      }
    }
  })

// Decode governance proposal content using a protobuf.
export const decodeGovProposal = async (
  chainId: string,
  govProposal: GovProposal
): Promise<GovProposalWithDecodedContent> => {
  if (govProposal.version === GovProposalVersion.V1_BETA_1) {
    let title = govProposal.proposal.content?.title || ''
    let description = govProposal.proposal.content?.description || ''

    // If content not decoded and stuck as Any, decode as TextProposal to get
    // the title and description.
    if (
      govProposal.proposal.content?.$typeUrl === Any.typeUrl &&
      govProposal.proposal.content.value instanceof Uint8Array
    ) {
      try {
        const content = TextProposal.decode(govProposal.proposal.content.value)
        title = content.title
        description = content.description
      } catch (err) {
        console.error(err)
      }
    }

    return {
      ...govProposal,
      chainId,
      title,
      description,
      decodedContent: govProposal.proposal.content,
    }
  }

  const decodedMessages = decodeGovProposalV1Messages(
    chainId,
    govProposal.proposal.messages.filter(
      ({ typeUrl }) => typeUrl !== MsgExecLegacyContent.typeUrl
    )
  )
  const legacyContent = govProposal.proposal.messages
    .filter(({ typeUrl }) => typeUrl === MsgExecLegacyContent.typeUrl)
    .map(
      (msg) => MsgExecLegacyContent.decode(msg.value, undefined, true).content
    )

  let title =
    govProposal.proposal.title ||
    legacyContent.find((content) => content?.title)?.title ||
    legacyContent[0]?.typeUrl ||
    (decodedMessages[0] &&
      'stargate' in decodedMessages[0] &&
      decodedMessages[0].stargate.type_url.split('.').pop()) ||
    '<no title>'
  let description =
    govProposal.proposal.summary ||
    legacyContent.find((content) => content?.description)?.description ||
    ''
  if (govProposal.proposal.metadata) {
    let metadata
    // If metadata is a URL, try to fetch metadata.
    if (isValidUrl(govProposal.proposal.metadata, true)) {
      try {
        const res = await fetch(
          transformIpfsUrlToHttpsIfNecessary(govProposal.proposal.metadata)
        )
        metadata = await res.json()
      } catch {}

      // If metadata is a JSON object, use it.
    } else {
      try {
        metadata = JSON.parse(govProposal.proposal.metadata)
      } catch {}
    }

    if (objectMatchesStructure(metadata, { title: {} })) {
      title = metadata.title
    }
    if (objectMatchesStructure(metadata, { details: {} })) {
      description = metadata.details
    } else if (objectMatchesStructure(metadata, { description: {} })) {
      description = metadata.description
    }
  }

  return {
    ...govProposal,
    chainId,
    title,
    description,
    decodedMessages,
    legacyContent,
  }
}

/**
 * Check if a message is a decoded stargate message, whose value is an object
 * (decoded from binary). Optionally check if it matches a specific type URL.
 */
export const isDecodedStargateMsg = (
  msg: any,
  /**
   * If provided, check if the message's type URL matches this type or any of
   * the types if it's an array.
   */
  typeOrUrl?: string | { typeUrl: string } | (string | { typeUrl: string })[],
  /**
   * If provided, check if the message's value matches this structure.
   */
  value: Structure = {}
): msg is DecodedStargateMsg =>
  objectMatchesStructure(msg, {
    stargate: {
      typeUrl: {},
      value,
    },
  }) &&
  typeof msg.stargate.value === 'object' &&
  (!typeOrUrl ||
    [typeOrUrl]
      .flat()
      .some(
        (t) => msg.stargate.typeUrl === (typeof t === 'string' ? t : t.typeUrl)
      ))

/**
 * Decode raw JSON data for displaying. Decode any nested protobufs into JSON.
 * Also decodes longs since those show up often.
 */
export const decodeRawDataForDisplay = (msg: any): any =>
  // Truncate long strings.
  typeof msg === 'string' && msg.length > 5000
    ? msg.slice(0, 100) + `...<${msg.length - 200} more>...` + msg.slice(-100)
    : typeof msg !== 'object' || msg === null
      ? msg
      : msg instanceof Uint8Array
        ? toBase64(msg)
        : Array.isArray(msg)
          ? msg.map(decodeRawDataForDisplay)
          : Long.isLong(msg)
            ? msg.toString()
            : msg instanceof Date
              ? msg.toISOString()
              : // `Any` protobuf
                objectMatchesStructure(msg, {
                    typeUrl: {},
                    value: {},
                  }) &&
                  typeof (msg as Any).typeUrl === 'string' &&
                  (msg as Any).value instanceof Uint8Array
                ? (() => {
                    try {
                      return decodeRawDataForDisplay(
                        decodeRawProtobufMsg(msg as Any)
                      )
                    } catch {
                      return msg
                    }
                  })()
                : // Stargate message
                  isCosmWasmStargateMsg(msg)
                  ? (() => {
                      try {
                        return decodeRawDataForDisplay(
                          decodeStargateMessage(msg)
                        )
                      } catch {
                        return msg
                      }
                    })()
                  : Object.entries(msg).reduce(
                      (acc, [key, value]) => ({
                        ...acc,
                        [key]:
                          key === 'wasmByteCode'
                            ? '[TOO LARGE TO SHOW]'
                            : decodeRawDataForDisplay(value),
                      }),
                      {} as Record<string, any>
                    )
