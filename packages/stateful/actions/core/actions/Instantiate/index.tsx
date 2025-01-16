import { fromUtf8 } from '@cosmjs/encoding'
import { Coin } from '@cosmjs/stargate'
import JSON5 from 'json5'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { constSelector } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import { tokenQueries } from '@dao-dao/state/query'
import { PolytoneListenerSelectors } from '@dao-dao/state/recoil'
import {
  ActionBase,
  BabyEmoji,
  ChainProvider,
  DaoSupportedChainPickerInput,
  useActionOptions,
  useCachedLoading,
} from '@dao-dao/stateless'
import {
  AccountType,
  TokenType,
  UnifiedCosmosMsg,
  makeStargateMessage,
} from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { MsgInstantiateContract as SecretMsgInstantiateContract } from '@dao-dao/types/protobuf/codegen/secret/compute/v1beta1/msg'
import {
  bech32AddressToBase64,
  decodeJsonFromBase64,
  encodeJsonToBase64,
  getAccountAddress,
  isDecodedStargateMsg,
  isSecretNetwork,
  makeWasmMessage,
  maybeMakeIcaExecuteMessages,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { useExecutedProposalTxLoadable } from '../../../../hooks/useExecutedProposalTxLoadable'
import { useTokenBalances } from '../../../hooks'
import {
  InstantiateData,
  InstantiateComponent as StatelessInstantiateComponent,
} from './Component'

// Account types that are allowed to instantiate from.
const ALLOWED_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.Base,
  AccountType.Polytone,
  AccountType.Ica,
]

const Component: ActionComponent = (props) => {
  const options = useActionOptions()
  const {
    context,
    address,
    chain: { chainId: currentChainId },
  } = options

  const { watch, setValue } = useFormContext<InstantiateData>()
  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const funds = watch((props.fieldNamePrefix + 'funds') as 'funds')

  const sender = watch((props.fieldNamePrefix + 'sender') as 'sender')
  // If sender is not found in the list of accounts, reset to the first account
  // on the target chain, or an empty account.
  useEffect(() => {
    if (
      sender &&
      !context.accounts.some(
        (a) => a.chainId === chainId && a.address === sender
      )
    ) {
      setValue(
        (props.fieldNamePrefix + 'sender') as 'sender',
        getAccountAddress({
          accounts: context.accounts,
          chainId,
          types: ALLOWED_ACCOUNT_TYPES,
        }) || ''
      )
    }
  }, [chainId, context.accounts, props.fieldNamePrefix, sender, setValue])

  // Once created, if this is a polytone message, this will be defined with
  // polytone metadata that can be used to get the instantiated address.
  const _polytone = watch((props.fieldNamePrefix + '_polytone') as '_polytone')
  // Callback results.
  const polytoneResult = useCachedLoading(
    _polytone
      ? PolytoneListenerSelectors.resultSelector({
          chainId: currentChainId,
          contractAddress: _polytone.note.listener,
          params: [
            {
              initiator: address,
              initiatorMsg: _polytone.initiatorMsg,
            },
          ],
        })
      : constSelector(undefined),
    undefined
  )

  const nativeBalances = useTokenBalances({
    filter: TokenType.Native,
    // Load selected tokens when not creating in case they are no longer
    // returned in the list of all tokens for the given DAO/wallet after the
    // proposal is made.
    additionalTokens: props.isCreating
      ? undefined
      : funds.map(({ denom }) => ({
          chainId,
          type: TokenType.Native,
          denomOrAddress: denom,
        })),
  })

  // If in DAO context, use executed proposal TX events to find instantiated
  // address if already instantiated. If in wallet context, there will be no tx.
  const executedTxLoadable = useExecutedProposalTxLoadable()

  const codeId: number = watch((props.fieldNamePrefix + 'codeId') as 'codeId')
  // This gets all instantiation actions that instantiate the same codeId
  // and all addresses actually instantiated in the transaction on-chain.
  // If these two lists are not the same length, then another instantiation
  // occurred in this transaction (likely via a custom message or a
  // contract execution) for the same code ID, and we cannot detect the
  // correct address. If the lists are the same length, there is a 1:1
  // mapping of instantiation actions to instantiated addresses, so we
  // can use the index of this action in all instantiation actions to
  // select the correct address.
  const getInstantiatedAddress = () => {
    // If polytone, can get from the polytone execution results directly.
    if (_polytone) {
      if (
        !polytoneResult.loading &&
        polytoneResult.data &&
        'execute' in polytoneResult.data.callback.result &&
        'Ok' in polytoneResult.data.callback.result.execute
      ) {
        const instantiateEvent =
          polytoneResult.data.callback.result.execute.Ok.result[0].events.find(
            ({ type }) => type === 'instantiate'
          )
        return instantiateEvent?.attributes.find(
          ({ key }) => key === '_contract_address'
        )?.value
      }

      return
    }

    if (
      executedTxLoadable.state !== 'hasValue' ||
      !executedTxLoadable.contents
    ) {
      return
    }

    // All instantiate action indexes that instantiate the same code ID.
    const instantiateIndexes = props.allActionsWithData.flatMap(
      ({ actionKey, data }, index) =>
        (actionKey === ActionKey.Instantiate ||
          actionKey === ActionKey.Instantiate2) &&
        data &&
        'codeId' in data &&
        data.codeId === codeId
          ? index
          : []
    )
    // Index of this action in the list of all instantiation actions for this
    // code ID.
    const innerIndex = instantiateIndexes.indexOf(props.index)
    // If all actions with data not yet loaded, this will not be found.
    if (innerIndex === -1) {
      return
    }

    // Instantiated contracts from the transaction data for this code ID.
    const instantiatedContracts = executedTxLoadable.contents.events
      .map(({ type, attributes }) =>
        type === 'instantiate' &&
        attributes.some(
          ({ key, value }) => key === 'code_id' && value === codeId.toString()
        )
          ? attributes.find(({ key }) => key === '_contract_address')?.value
          : null
      )
      .filter((attr): attr is string => !!attr)

    // If the instantiated contracts length does not match the actual
    // instantiation events from the chain, then another message must've
    // instantiated the same contract, so we cannot definitively locate the
    // address.
    if (instantiateIndexes.length !== instantiatedContracts.length) {
      return
    }

    return instantiatedContracts[innerIndex]
  }
  const instantiatedAddress = getInstantiatedAddress()

  return (
    <>
      {context.type === ActionContextType.Dao && (
        <DaoSupportedChainPickerInput
          disabled={!props.isCreating}
          fieldName={props.fieldNamePrefix + 'chainId'}
          onChange={(chainId) => {
            // Reset funds and update admin/sender when switching chain.
            setValue((props.fieldNamePrefix + 'funds') as 'funds', [])

            const chainAddress =
              getAccountAddress({
                accounts: context.accounts,
                chainId,
                types: ALLOWED_ACCOUNT_TYPES,
              }) || ''
            setValue((props.fieldNamePrefix + 'admin') as 'admin', chainAddress)
            setValue(
              (props.fieldNamePrefix + 'sender') as 'sender',
              chainAddress
            )
          }}
        />
      )}

      <ChainProvider chainId={chainId}>
        <StatelessInstantiateComponent
          {...props}
          options={{
            nativeBalances: nativeBalances.loading
              ? nativeBalances
              : {
                  loading: false,
                  data: nativeBalances.data.filter(
                    ({ token, owner }) =>
                      token.chainId === chainId && owner.address === sender
                  ),
                },
            instantiatedAddress,
          }}
        />
      </ChainProvider>
    </>
  )
}

export class InstantiateAction extends ActionBase<InstantiateData> {
  public readonly key = ActionKey.Instantiate
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: BabyEmoji,
      label: options.t('title.instantiateSmartContract'),
      description: options.t('info.instantiateSmartContractActionDescription'),
      // Some other actions are instantiate2 actions, so this needs to be after
      // them but before cross chain and ICA execute.
      matchPriority: -90,
    })

    this.defaults = {
      chainId: options.chain.chainId,
      sender: options.address,
      admin: options.address,
      codeId: 0,
      label: '',
      message: '{}',
      funds: [],
    }
  }

  encode({
    chainId,
    sender,
    admin,
    codeId,
    label,
    message,
    funds,
  }: InstantiateData): UnifiedCosmosMsg | UnifiedCosmosMsg[] {
    const account = this.options.context.accounts.find(
      (a) => a.chainId === chainId && a.address === sender
    )
    if (!account) {
      throw new Error('Instantiator account not found')
    }

    const msg = JSON5.parse(message)

    const convertedFunds = funds
      .map(({ denom, amount, decimals }) =>
        HugeDecimal.fromHumanReadable(amount, decimals).toCoin(denom)
      )
      // Neutron errors with `invalid coins` if the funds list is not
      // alphabetized.
      .sort((a, b) => a.denom.localeCompare(b.denom))

    const instantiateMsg = isSecretNetwork(chainId)
      ? makeStargateMessage({
          stargate: {
            typeUrl: SecretMsgInstantiateContract.typeUrl,
            value: SecretMsgInstantiateContract.fromAmino({
              sender: bech32AddressToBase64(sender),
              admin: admin || '',
              code_id: BigInt(codeId).toString(),
              init_funds: convertedFunds,
              label,
              init_msg: encodeJsonToBase64(msg),
            }),
          },
        })
      : makeWasmMessage({
          wasm: {
            instantiate: {
              admin: admin || '',
              code_id: codeId,
              funds: convertedFunds,
              label,
              msg,
            },
          },
        })

    return account.type === AccountType.Polytone
      ? maybeMakePolytoneExecuteMessages(
          this.options.chain.chainId,
          account.chainId,
          instantiateMsg
        )
      : account.type === AccountType.Ica
        ? maybeMakeIcaExecuteMessages(
            this.options.chain.chainId,
            account.chainId,
            this.options.address,
            account.address,
            instantiateMsg
          )
        : instantiateMsg
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    const isWasmInstantiateMsg = objectMatchesStructure(decodedMessage, {
      wasm: {
        instantiate: {
          code_id: {},
          label: {},
          msg: {},
          funds: {},
        },
      },
    })

    const isSecretInstantiateMsg = isDecodedStargateMsg(
      decodedMessage,
      SecretMsgInstantiateContract
    )

    return isWasmInstantiateMsg || isSecretInstantiateMsg
  }

  async decode([
    {
      decodedMessage,
      account: { chainId, address: sender },
      polytone,
    },
  ]: ProcessedMessage[]): Promise<InstantiateData> {
    const isWasmInstantiateMsg = objectMatchesStructure(decodedMessage, {
      wasm: {
        instantiate: {
          code_id: {},
          label: {},
          msg: {},
          funds: {},
        },
      },
    })

    const isSecretInstantiateMsg = isDecodedStargateMsg(
      decodedMessage,
      SecretMsgInstantiateContract
    )

    const funds: Coin[] | undefined = isWasmInstantiateMsg
      ? decodedMessage.wasm.instantiate.funds
      : isSecretInstantiateMsg
        ? decodedMessage.stargate.value.initFunds
        : undefined

    const fundsTokens = funds?.length
      ? await Promise.all(
          funds.map(async ({ denom, amount }) => ({
            denom,
            amount,
            decimals: (
              await this.options.queryClient.fetchQuery(
                tokenQueries.info(this.options.queryClient, {
                  chainId,
                  type: TokenType.Native,
                  denomOrAddress: denom,
                })
              )
            ).decimals,
          }))
        )
      : []

    return isWasmInstantiateMsg
      ? {
          chainId,
          sender,
          admin: decodedMessage.wasm.instantiate.admin ?? '',
          codeId: decodedMessage.wasm.instantiate.code_id,
          label: decodedMessage.wasm.instantiate.label,
          message: JSON.stringify(decodedMessage.wasm.instantiate.msg, null, 2),
          funds: fundsTokens.map(({ denom, amount, decimals }) => ({
            denom,
            amount: HugeDecimal.from(amount).toHumanReadableString(decimals),
            decimals,
          })),
          _polytone: polytone
            ? {
                chainId: polytone.chainId,
                note: polytone.polytoneConnection,
                initiatorMsg: polytone.initiatorMsg,
              }
            : undefined,
        }
      : // isSecretExecuteMsg
        {
          chainId,
          sender,
          admin: decodedMessage.stargate.value.admin ?? '',
          codeId: Number(decodedMessage.stargate.value.codeId),
          label: decodedMessage.stargate.value.label,
          message: JSON.stringify(
            decodeJsonFromBase64(
              fromUtf8(decodedMessage.stargate.value.msg),
              true
            ),
            null,
            2
          ),
          funds: fundsTokens.map(({ denom, amount, decimals }) => ({
            denom,
            amount: HugeDecimal.from(amount).toHumanReadableString(decimals),
            decimals,
          })),
          _polytone: polytone
            ? {
                chainId: polytone.chainId,
                note: polytone.polytoneConnection,
                initiatorMsg: polytone.initiatorMsg,
              }
            : undefined,
        }
  }
}
