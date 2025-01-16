// Some generated protobuf types need the `rawProtobufMsgToAmino` and
// `aminoToRawProtobufMsg` functions to properly encode nested protobufs. To
// prevent needing to import from @dao-dao/utils and cause circular package
// dependencies, we need all the utils below to exist in this package
// (@dao-dao/types) where the protobuf types are. Ideally we can move these
// to @dao-dao/utils when telescope internally handles a type registry that can
// encode the nested types like we do below.

import { AminoMsg } from '@cosmjs/amino'
import { fromBase64, fromBech32, toBase64, toBech32 } from '@cosmjs/encoding'
import { EncodeObject, GeneratedType, Registry } from '@cosmjs/proto-signing'
import { AminoTypes } from '@cosmjs/stargate'

import { AnyChain, ChainId, DecodedStargateMsg } from '../chain'
import {
  VoteOption as CwVoteOption,
  StargateMsg,
  UnifiedCosmosMsg,
} from '../contracts'
import {
  allianceAminoConverters,
  allianceProtoRegistry,
  bitsongAminoConverters,
  bitsongProtoRegistry,
  circleAminoConverters,
  circleProtoRegistry,
  cosmosAminoConverters,
  cosmosProtoRegistry,
  cosmwasmAminoConverters,
  cosmwasmProtoRegistry,
  gaiaAminoConverters,
  gaiaProtoRegistry,
  google,
  ibcAminoConverters,
  ibcProtoRegistry,
  interchainSecurityAminoConverters,
  interchainSecurityProtoRegistry,
  junoAminoConverters,
  junoProtoRegistry,
  kujiraAminoConverters,
  kujiraProtoRegistry,
  neutronAminoConverters,
  neutronProtoRegistry,
  omniFlixAminoConverters,
  omniFlixProtoRegistry,
  osmosisAminoConverters,
  osmosisProtoRegistry,
  pstakeAminoConverters,
  pstakeProtoRegistry,
  regenAminoConverters,
  regenProtoRegistry,
  secretAminoConverters,
  secretProtoRegistry,
  publicawesomeAminoConverters as stargazeAminoConverters,
  publicawesomeProtoRegistry as stargazeProtoRegistry,
  switcheoAminoConverters,
  switcheoProtoRegistry,
} from './codegen'
import {
  MsgCreateAllianceProposal,
  MsgDeleteAllianceProposal,
  MsgUpdateAllianceProposal,
} from './codegen/alliance/alliance/gov'
import { MsgSend } from './codegen/cosmos/bank/v1beta1/tx'
import {
  MsgSetWithdrawAddress,
  MsgWithdrawDelegatorReward,
} from './codegen/cosmos/distribution/v1beta1/tx'
import { VoteOption as GovVoteOption } from './codegen/cosmos/gov/v1/gov'
import { MsgVote } from './codegen/cosmos/gov/v1beta1/tx'
import { ParameterChangeProposal } from './codegen/cosmos/params/v1beta1/params'
import {
  MsgBeginRedelegate,
  MsgDelegate,
  MsgUndelegate,
} from './codegen/cosmos/staking/v1beta1/tx'
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgInstantiateContract2,
  MsgMigrateContract,
  MsgUpdateAdmin,
} from './codegen/cosmwasm/wasm/v1/tx'
import { ExtensionData } from './codegen/gaia/metaprotocols/extensions'
import { Any } from './codegen/google/protobuf/any'
import { UploadCosmWasmPoolCodeAndWhiteListProposal } from './codegen/osmosis/cosmwasmpool/v1beta1/gov'
import {
  MsgClearAdmin as SecretMsgClearAdmin,
  MsgExecuteContract as SecretMsgExecuteContract,
  MsgInstantiateContract as SecretMsgInstantiateContract,
  MsgMigrateContract as SecretMsgMigrateContract,
  MsgUpdateAdmin as SecretMsgUpdateAdmin,
} from './codegen/secret/compute/v1beta1/msg'

// Convert CosmWasm message to its encoded protobuf equivalent.
export const cwMsgToProtobuf = (
  ...params: Parameters<typeof cwMsgToEncodeObject>
): Any => {
  const { typeUrl, value } = cwMsgToEncodeObject(...params)
  return {
    typeUrl,
    value: encodeProtobufValue(typeUrl, value),
  }
}

// Convert protobuf to its CosmWasm message equivalent.
export const protobufToCwMsg = (
  chain: AnyChain,
  ...params: Parameters<typeof decodeRawProtobufMsg>
): {
  msg: UnifiedCosmosMsg
  sender: string
} => decodedStargateMsgToCw(chain, decodeRawProtobufMsg(...params))

export const cwMsgToEncodeObject = (
  chainId: string,
  msg: UnifiedCosmosMsg,
  sender: string
): EncodeObject => {
  if ('bank' in msg) {
    const bankMsg = msg.bank

    if ('send' in bankMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgSend.typeUrl,
        value: {
          fromAddress: sender,
          toAddress: bankMsg.send.to_address,
          amount: bankMsg.send.amount,
        },
      }

      return encodeObject
    }

    // burn does not exist?

    throw new Error('Unsupported bank module message.')
  }

  if ('staking' in msg) {
    const stakingMsg = msg.staking

    if ('delegate' in stakingMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgDelegate.typeUrl,
        value: {
          delegatorAddress: sender,
          validatorAddress: stakingMsg.delegate.validator,
          amount: stakingMsg.delegate.amount,
        },
      }
      return encodeObject
    }

    if ('undelegate' in stakingMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgUndelegate.typeUrl,
        value: {
          delegatorAddress: sender,
          validatorAddress: stakingMsg.undelegate.validator,
          amount: stakingMsg.undelegate.amount,
        },
      }
      return encodeObject
    }

    if ('redelegate' in stakingMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgBeginRedelegate.typeUrl,
        value: {
          delegatorAddress: sender,
          validatorSrcAddress: stakingMsg.redelegate.src_validator,
          validatorDstAddress: stakingMsg.redelegate.dst_validator,
          amount: stakingMsg.redelegate.amount,
        },
      }
      return encodeObject
    }

    throw new Error('Unsupported staking module message.')
  }

  if ('distribution' in msg) {
    const distributionMsg = msg.distribution

    if ('withdraw_delegator_reward' in distributionMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgWithdrawDelegatorReward.typeUrl,
        value: {
          delegatorAddress: sender,
          validatorAddress: distributionMsg.withdraw_delegator_reward.validator,
        },
      }
      return encodeObject
    }

    if ('set_withdraw_address' in distributionMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgSetWithdrawAddress.typeUrl,
        value: {
          delegatorAddress: sender,
          withdrawAddress: distributionMsg.set_withdraw_address.address,
        },
      }
      return encodeObject
    }

    throw new Error('Unsupported distribution module message.')
  }

  if ('stargate' in msg) {
    return decodeStargateMessage(msg, false).stargate
  }

  if ('wasm' in msg) {
    const wasmMsg = msg.wasm
    const isSecret =
      chainId === ChainId.SecretMainnet || chainId === ChainId.SecretTestnet

    // MsgStoreCodeEncodeObject missing from UnifiedCosmosMsg.

    if ('execute' in wasmMsg) {
      if (isSecret !== 'send' in wasmMsg.execute) {
        throw new Error('Unsupported Secret wasm module message.')
      }

      const encodeObject: EncodeObject = {
        typeUrl:
          'send' in wasmMsg.execute
            ? SecretMsgExecuteContract.typeUrl
            : MsgExecuteContract.typeUrl,
        value:
          'send' in wasmMsg.execute
            ? ({
                sender: fromBech32(sender).data,
                contract: fromBech32(wasmMsg.execute.contract_addr).data,
                msg: fromBase64(wasmMsg.execute.msg),
                callbackCodeHash: wasmMsg.execute.code_hash,
                sentFunds: wasmMsg.execute.send,
                callbackSig: new Uint8Array(),
              } as SecretMsgExecuteContract)
            : ({
                sender,
                contract: wasmMsg.execute.contract_addr,
                funds: wasmMsg.execute.funds,
                msg: fromBase64(wasmMsg.execute.msg),
              } as MsgExecuteContract),
      }
      return encodeObject
    }

    if ('instantiate' in wasmMsg) {
      if (isSecret !== 'send' in wasmMsg.instantiate) {
        throw new Error('Unsupported Secret wasm module message.')
      }

      const encodeObject: EncodeObject = {
        typeUrl:
          'send' in wasmMsg.instantiate
            ? SecretMsgInstantiateContract.typeUrl
            : MsgInstantiateContract.typeUrl,
        value:
          'send' in wasmMsg.instantiate
            ? ({
                sender: fromBech32(sender).data,
                callbackCodeHash: wasmMsg.instantiate.code_hash,
                codeId: BigInt(wasmMsg.instantiate.code_id),
                label: wasmMsg.instantiate.label,
                initMsg: fromBase64(wasmMsg.instantiate.msg),
                initFunds: wasmMsg.instantiate.send,
                callbackSig: new Uint8Array(),
                admin: wasmMsg.instantiate.admin ?? undefined,
              } as SecretMsgInstantiateContract)
            : ({
                sender,
                admin: wasmMsg.instantiate.admin ?? undefined,
                codeId: BigInt(wasmMsg.instantiate.code_id),
                label: wasmMsg.instantiate.label,
                msg: fromBase64(wasmMsg.instantiate.msg),
                funds: wasmMsg.instantiate.funds,
              } as MsgInstantiateContract),
      }
      return encodeObject
    }

    if ('instantiate2' in wasmMsg) {
      if (isSecret) {
        throw new Error('Unsupported Secret wasm module message.')
      }

      const encodeObject: EncodeObject = {
        typeUrl: MsgInstantiateContract2.typeUrl,
        value: {
          sender,
          admin: wasmMsg.instantiate2.admin ?? undefined,
          codeId: BigInt(wasmMsg.instantiate2.code_id),
          label: wasmMsg.instantiate2.label,
          msg: fromBase64(wasmMsg.instantiate2.msg),
          funds: wasmMsg.instantiate2.funds,
          salt: fromBase64(wasmMsg.instantiate2.salt),
          fixMsg: wasmMsg.instantiate2.fix_msg,
        },
      }
      return encodeObject
    }

    if ('migrate' in wasmMsg) {
      if (isSecret !== 'code_hash' in wasmMsg.migrate) {
        throw new Error('Unsupported Secret wasm module message.')
      }

      const encodeObject: EncodeObject = {
        typeUrl:
          'code_hash' in wasmMsg.migrate
            ? SecretMsgMigrateContract.typeUrl
            : MsgMigrateContract.typeUrl,
        value:
          'code_hash' in wasmMsg.migrate
            ? ({
                sender,
                contract: wasmMsg.migrate.contract_addr,
                codeId: BigInt(wasmMsg.migrate.code_id),
                msg: fromBase64(wasmMsg.migrate.msg),
                callbackSig: new Uint8Array(),
                callbackCodeHash: wasmMsg.migrate.code_hash,
              } as SecretMsgMigrateContract)
            : ({
                sender,
                contract: wasmMsg.migrate.contract_addr,
                codeId: BigInt(wasmMsg.migrate.new_code_id),
                msg: fromBase64(wasmMsg.migrate.msg),
              } as MsgMigrateContract),
      }
      return encodeObject
    }

    if ('update_admin' in wasmMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: isSecret
          ? SecretMsgUpdateAdmin.typeUrl
          : MsgUpdateAdmin.typeUrl,
        value: isSecret
          ? ({
              sender,
              newAdmin: wasmMsg.update_admin.admin,
              contract: wasmMsg.update_admin.contract_addr,
              callbackSig: new Uint8Array(),
            } as SecretMsgUpdateAdmin)
          : ({
              sender,
              newAdmin: wasmMsg.update_admin.admin,
              contract: wasmMsg.update_admin.contract_addr,
            } as MsgUpdateAdmin),
      }
      return encodeObject
    }

    if ('clear_admin' in wasmMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: isSecret ? SecretMsgClearAdmin.typeUrl : MsgClearAdmin.typeUrl,
        value: isSecret
          ? ({
              sender,
              contract: wasmMsg.clear_admin.contract_addr,
              callbackSig: new Uint8Array(),
            } as SecretMsgClearAdmin)
          : ({
              sender,
              contract: wasmMsg.clear_admin.contract_addr,
            } as MsgClearAdmin),
      }
      return encodeObject
    }

    throw new Error('Unsupported wasm module message.')
  }

  if ('gov' in msg) {
    const govMsg = msg.gov

    // MsgDepositEncodeObject and MsgSubmitProposalEncodeObject missing from
    // UnifiedCosmosMsg.

    if ('vote' in govMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: MsgVote.typeUrl,
        value: {
          proposalId: BigInt(govMsg.vote.proposal_id),
          voter: sender,
          option: cwVoteOptionToGovVoteOption(govMsg.vote.vote),
        },
      }
      return encodeObject
    }

    throw new Error('Unsupported gov module message.')
  }

  throw new Error('Unsupported cosmos message.')
}

// This should mirror the encoder function above. Do not use this function to
// convert messages that were decoded with `recursive = true`, like in the
// `useDecodedCosmosMsg` hook in actions. That's because the default case with
// `makeStargateMessage` needs a non-recursively encoded message due to
// technicalities with nested protobufs.
export const decodedStargateMsgToCw = (
  chain: AnyChain,
  { typeUrl, value }: DecodedStargateMsg['stargate']
): {
  msg: UnifiedCosmosMsg
  sender: string
} => {
  let msg: UnifiedCosmosMsg
  let sender = ''
  switch (typeUrl) {
    case MsgSend.typeUrl:
      msg = {
        bank: {
          send: {
            amount: value.amount,
            to_address: value.toAddress,
          },
        },
      }
      sender = value.fromAddress
      break
    case MsgDelegate.typeUrl:
      msg = {
        staking: {
          delegate: {
            amount: value.amount,
            validator: value.validatorAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgUndelegate.typeUrl:
      msg = {
        staking: {
          undelegate: {
            amount: value.amount,
            validator: value.validatorAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgBeginRedelegate.typeUrl:
      msg = {
        staking: {
          redelegate: {
            amount: value.amount,
            src_validator: value.validatorSrcAddress,
            dst_validator: value.validatorDstAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgWithdrawDelegatorReward.typeUrl:
      msg = {
        distribution: {
          withdraw_delegator_reward: {
            validator: value.validatorAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgSetWithdrawAddress.typeUrl:
      msg = {
        distribution: {
          set_withdraw_address: {
            address: value.withdrawAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgExecuteContract.typeUrl:
      msg = {
        wasm: {
          execute: {
            contract_addr: value.contract,
            funds: value.funds,
            msg: toBase64(value.msg),
          },
        },
      }
      sender = value.sender
      break
    case SecretMsgExecuteContract.typeUrl:
      msg = {
        wasm: {
          execute: {
            code_hash: value.callbackCodeHash,
            contract_addr: toBech32(chain.bech32Prefix, value.contract),
            msg: toBase64(value.msg),
            send: value.sentFunds,
          },
        },
      }
      sender = toBech32(chain.bech32Prefix, value.sender)
      break
    case MsgInstantiateContract.typeUrl:
      msg = {
        wasm: {
          instantiate: {
            admin: value.admin,
            code_id: Number(value.codeId),
            label: value.label,
            msg: toBase64(value.msg),
            funds: value.funds,
          },
        },
      }
      sender = value.sender
      break
    case SecretMsgInstantiateContract.typeUrl:
      msg = {
        wasm: {
          instantiate: {
            admin: value.admin,
            code_hash: value.callbackCodeHash,
            code_id: Number(value.codeId),
            label: value.label,
            msg: toBase64(value.initMsg),
            send: value.initFunds,
          },
        },
      }
      sender = toBech32(chain.bech32Prefix, value.sender)
      break
    case MsgInstantiateContract2.typeUrl:
      msg = {
        wasm: {
          instantiate2: {
            admin: value.admin,
            code_id: Number(value.codeId),
            label: value.label,
            msg: toBase64(value.msg),
            funds: value.funds,
            fix_msg: value.fixMsg,
            salt: toBase64(value.salt),
          },
        },
      }
      sender = value.sender
      break
    case MsgMigrateContract.typeUrl:
      msg = {
        wasm: {
          migrate: {
            contract_addr: value.contract,
            new_code_id: Number(value.codeId),
            msg: toBase64(value.msg),
          },
        },
      }
      sender = value.sender
      break
    case SecretMsgMigrateContract.typeUrl:
      msg = {
        wasm: {
          migrate: {
            code_hash: value.callbackCodeHash,
            contract_addr: value.contract,
            code_id: Number(value.codeId),
            msg: toBase64(value.msg),
          },
        },
      }
      sender = value.sender
      break
    case MsgUpdateAdmin.typeUrl:
    case SecretMsgUpdateAdmin.typeUrl:
      msg = {
        wasm: {
          update_admin: {
            admin: value.newAdmin,
            contract_addr: value.contract,
          },
        },
      }
      sender = value.sender
      break
    case MsgClearAdmin.typeUrl:
    case SecretMsgClearAdmin.typeUrl:
      msg = {
        wasm: {
          clear_admin: {
            contract_addr: value.contract,
          },
        },
      }
      sender = value.sender
      break
    case MsgVote.typeUrl:
      msg = {
        gov: {
          vote: {
            proposal_id: Number(value.proposalId),
            vote: govVoteOptionToCwVoteOption(value.option),
          },
        },
      }
      sender = value.voter
      break
    default:
      msg = makeStargateMessage({
        stargate: {
          typeUrl,
          value,
        },
      })
      // Attempt to decode the sender from the message.
      if ('sender' in value && typeof value.sender === 'string') {
        sender = value.sender
      }
      // Cannot decode the sender from any arbitrary message.
      break
  }

  return {
    msg,
    sender,
  }
}

// Convert staking-related stargate msg to CosmWasm format. Returns undefined if
// not a staking-related message.
export const decodedStakingStargateMsgToCw = ({
  typeUrl,
  value,
}: DecodedStargateMsg['stargate']): UnifiedCosmosMsg | undefined => {
  switch (typeUrl) {
    case MsgDelegate.typeUrl:
      return {
        staking: {
          delegate: {
            amount: value.amount,
            validator: value.validatorAddress,
          },
        },
      }
    case MsgUndelegate.typeUrl:
      return {
        staking: {
          undelegate: {
            amount: value.amount,
            validator: value.validatorAddress,
          },
        },
      }
    case MsgBeginRedelegate.typeUrl:
      return {
        staking: {
          redelegate: {
            amount: value.amount,
            src_validator: value.validatorSrcAddress,
            dst_validator: value.validatorDstAddress,
          },
        },
      }
    case MsgWithdrawDelegatorReward.typeUrl:
      return {
        distribution: {
          withdraw_delegator_reward: {
            validator: value.validatorAddress,
          },
        },
      }
    case MsgSetWithdrawAddress.typeUrl:
      return {
        distribution: {
          set_withdraw_address: {
            address: value.withdrawAddress,
          },
        },
      }
  }
}

export const getProtobufTypes = (): ReadonlyArray<[string, GeneratedType]> => [
  ...cosmosProtoRegistry,
  ...cosmwasmProtoRegistry,
  ['/google.protobuf.Timestamp', google.protobuf.Timestamp as GeneratedType],
  ...junoProtoRegistry,
  ...osmosisProtoRegistry,
  ...ibcProtoRegistry,
  ...stargazeProtoRegistry,
  ...gaiaProtoRegistry,
  ...neutronProtoRegistry,
  ...regenProtoRegistry,
  ...allianceProtoRegistry,
  ...circleProtoRegistry,
  ...kujiraProtoRegistry,
  ...pstakeProtoRegistry,
  ...bitsongProtoRegistry,
  ...secretProtoRegistry,
  ...omniFlixProtoRegistry,
  ...interchainSecurityProtoRegistry,
  ...switcheoProtoRegistry,
  // Not a query or TX so it isn't included in any of the registries. But we
  // want to decode this because it appears in gov props. We need to find a
  // better way to collect all generated types in a single registry...
  [ParameterChangeProposal.typeUrl, ParameterChangeProposal as GeneratedType],
  [
    UploadCosmWasmPoolCodeAndWhiteListProposal.typeUrl,
    UploadCosmWasmPoolCodeAndWhiteListProposal as GeneratedType,
  ],
  // alliance.alliance
  [
    MsgCreateAllianceProposal.typeUrl,
    MsgCreateAllianceProposal as GeneratedType,
  ],
  [
    MsgUpdateAllianceProposal.typeUrl,
    MsgUpdateAllianceProposal as GeneratedType,
  ],
  [
    MsgDeleteAllianceProposal.typeUrl,
    MsgDeleteAllianceProposal as GeneratedType,
  ],
  // gaia.metaprotocols
  [ExtensionData.typeUrl, ExtensionData as GeneratedType],
]
export const getTypesRegistry = () => new Registry(getProtobufTypes())

export const getAminoTypes = () =>
  new AminoTypes({
    ...cosmosAminoConverters,
    ...cosmwasmAminoConverters,
    ...junoAminoConverters,
    ...osmosisAminoConverters,
    ...ibcAminoConverters,
    ...stargazeAminoConverters,
    ...gaiaAminoConverters,
    ...neutronAminoConverters,
    ...regenAminoConverters,
    ...allianceAminoConverters,
    ...circleAminoConverters,
    ...kujiraAminoConverters,
    ...pstakeAminoConverters,
    ...bitsongAminoConverters,
    ...secretAminoConverters,
    ...omniFlixAminoConverters,
    ...interchainSecurityAminoConverters,
    ...switcheoAminoConverters,
    // gaia.metaprotocols
    [ExtensionData.typeUrl]: {
      // the Amino type is the same as the protobuf type URL, deviating from
      // convention for some reason...
      aminoType: ExtensionData.typeUrl,
      toAmino: ExtensionData.toAmino,
      fromAmino: ExtensionData.fromAmino,
    },
  })

// Encodes a protobuf message value from its JSON representation into a byte
// array.
export const encodeProtobufValue = (
  typeUrl: string,
  value: any
): Uint8Array => {
  const type = getTypesRegistry().lookupType(typeUrl)
  if (!type) {
    throw new Error(`Type ${typeUrl} not found in registry.`)
  }
  const encodedValue = type.encode(value).finish()
  return encodedValue
}

// Decodes an encoded protobuf message's value from a Uint8Array or base64
// string into its JSON representation.
export const decodeProtobufValue = (
  typeUrl: string,
  encodedValue: string | Uint8Array,
  // Recursively decode nested protobufs. This is useful for automatically
  // decoding `Any` types where protobuf interfaces exist.
  recursive = true
): any => {
  const type = getTypesRegistry().lookupType(typeUrl)
  if (!type) {
    throw new Error(`Type ${typeUrl} not found in registry.`)
  }

  const decodedValue = type.decode(
    typeof encodedValue === 'string' ? fromBase64(encodedValue) : encodedValue,
    undefined,
    // The types in the registry take an extra parameter for recursive
    // decoding even though the registry itself is unaware of this type. Thus,
    // tell TypeScript to ignore it.
    // @ts-ignore
    recursive
  )
  return decodedValue
}

// Decodes a protobuf message from `Any` into its JSON representation.
export const decodeRawProtobufMsg = (
  { typeUrl, value }: Any,
  recursive = true
): DecodedStargateMsg['stargate'] => ({
  typeUrl,
  value: decodeProtobufValue(typeUrl, value, recursive),
})

// Convert protobuf Any into its Amino msg.
export const rawProtobufMsgToAmino = (
  ...params: Parameters<typeof decodeRawProtobufMsg>
): AminoMsg => getAminoTypes().toAmino(decodeRawProtobufMsg(...params))

// Convert Amino msg into raw protobuf Any.
export const aminoToRawProtobufMsg = (msg: AminoMsg): Any => {
  const { typeUrl, value } = getAminoTypes().fromAmino(msg)
  return {
    typeUrl,
    value: encodeProtobufValue(typeUrl, value),
  }
}

// Encodes a protobuf message from its JSON representation into a `StargateMsg`
// that `CosmWasm` understands.
export const makeStargateMessage = ({
  stargate: { typeUrl, value },
}: DecodedStargateMsg): StargateMsg => ({
  stargate: {
    type_url: typeUrl,
    value: toBase64(encodeProtobufValue(typeUrl, prepareProtobufJson(value))),
  },
})

// Decodes an encoded protobuf message from CosmWasm's `StargateMsg` into its
// JSON representation.
export const decodeStargateMessage = (
  { stargate: { type_url, value } }: StargateMsg,
  recursive = true
): DecodedStargateMsg => ({
  stargate: {
    typeUrl: type_url,
    value: decodeProtobufValue(type_url, value, recursive),
  },
})

// Prepare JSON for protobuf encoding. Some fields, like Dates, need special
// handling so that any protobuf type can be encoded.
//
// Rules:
//   (1) Strings with the 'DATE:' prefix are converted to Dates.
export const prepareProtobufJson = (msg: any): any =>
  msg instanceof Uint8Array
    ? msg
    : Array.isArray(msg)
      ? msg.map(prepareProtobufJson)
      : // Rule (1)
        typeof msg === 'string' && msg.startsWith('DATE:')
        ? new Date(msg.replace('DATE:', ''))
        : typeof msg !== 'object' || msg === null || msg.constructor !== Object
          ? msg
          : Object.entries(msg).reduce(
              (acc, [key, value]) => ({
                ...acc,
                [key]: prepareProtobufJson(value),
              }),
              {} as Record<string, any>
            )

export const cwVoteOptionToGovVoteOption = (
  cwVote: CwVoteOption
): GovVoteOption =>
  cwVote === 'yes'
    ? GovVoteOption.VOTE_OPTION_YES
    : cwVote === 'no'
      ? GovVoteOption.VOTE_OPTION_NO
      : cwVote === 'abstain'
        ? GovVoteOption.VOTE_OPTION_ABSTAIN
        : cwVote === 'no_with_veto'
          ? GovVoteOption.VOTE_OPTION_NO_WITH_VETO
          : GovVoteOption.VOTE_OPTION_UNSPECIFIED

export const govVoteOptionToCwVoteOption = (
  govVote: GovVoteOption
): CwVoteOption => {
  const cwVote: CwVoteOption | undefined =
    govVote === GovVoteOption.VOTE_OPTION_YES
      ? 'yes'
      : govVote === GovVoteOption.VOTE_OPTION_NO
        ? 'no'
        : govVote === GovVoteOption.VOTE_OPTION_ABSTAIN
          ? 'abstain'
          : govVote === GovVoteOption.VOTE_OPTION_NO_WITH_VETO
            ? 'no_with_veto'
            : undefined
  if (!cwVote) {
    throw new Error('Invalid vote option')
  }

  return cwVote
}
