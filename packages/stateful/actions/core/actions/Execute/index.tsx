import { Coin } from '@cosmjs/stargate'
import JSON5 from 'json5'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { HugeDecimal } from '@dao-dao/math'
import { tokenQueries } from '@dao-dao/state/query'
import {
  ActionBase,
  ChainProvider,
  DaoSupportedChainPickerInput,
  SwordsEmoji,
  useActionOptions,
} from '@dao-dao/stateless'
import { AccountType, TokenType, UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { MsgExecuteContract as SecretMsgExecuteContract } from '@dao-dao/types/protobuf/codegen/secret/compute/v1beta1/msg'
import {
  bech32DataToAddress,
  decodeJsonFromBase64,
  encodeJsonToBase64,
  getAccountAddress,
  isDecodedStargateMsg,
  isSecretNetwork,
  makeExecuteSmartContractMessage,
  maybeMakeIcaExecuteMessages,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { useTokenBalances } from '../../../hooks'
import {
  ExecuteData,
  ExecuteComponent as StatelessExecuteComponent,
} from './Component'

// Account types that are allowed to execute from.
const ALLOWED_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.Base,
  AccountType.Polytone,
  AccountType.Ica,
]

const Component: ActionComponent = (props) => {
  const { context } = useActionOptions()
  const { watch, setValue } = useFormContext<ExecuteData>()

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const sender = watch((props.fieldNamePrefix + 'sender') as 'sender')
  const funds = watch((props.fieldNamePrefix + 'funds') as 'funds')
  const cw20 = watch((props.fieldNamePrefix + 'cw20') as 'cw20')

  const tokens = useTokenBalances({
    // Load selected tokens when not creating in case they are no longer
    // returned in the list of all tokens for the given DAO/wallet after the
    // proposal is made.
    additionalTokens: props.isCreating
      ? undefined
      : funds.map(({ denom }) => ({
          chainId,
          type: cw20 ? TokenType.Cw20 : TokenType.Native,
          denomOrAddress: denom,
        })),
  })

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

  return (
    <>
      {context.type === ActionContextType.Dao && (
        <DaoSupportedChainPickerInput
          disabled={!props.isCreating}
          fieldName={props.fieldNamePrefix + 'chainId'}
          onChange={(chainId) => {
            // Reset funds when switching chain.
            setValue((props.fieldNamePrefix + 'funds') as 'funds', [])
            // Default sender to first matching account on new chain.
            setValue(
              (props.fieldNamePrefix + 'sender') as 'sender',
              getAccountAddress({
                accounts: context.accounts,
                chainId,
                types: ALLOWED_ACCOUNT_TYPES,
              }) || ''
            )
          }}
        />
      )}

      <ChainProvider chainId={chainId}>
        <StatelessExecuteComponent
          {...props}
          options={{
            tokens: tokens.loading
              ? tokens
              : {
                  loading: false,
                  data: tokens.data.filter(
                    ({ token, owner }) =>
                      token.chainId === chainId && owner.address === sender
                  ),
                },
          }}
        />
      </ChainProvider>
    </>
  )
}

export class ExecuteAction extends ActionBase<ExecuteData> {
  public readonly key = ActionKey.Execute
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: SwordsEmoji,
      label: options.t('title.executeSmartContract'),
      description: options.t('info.executeSmartContractActionDescription'),
      // Most messages are some form of execute, but it needs to be before
      // Custom, since that's the catch-all action.
      matchPriority: -99,
    })

    this.defaults = {
      chainId: options.chain.chainId,
      sender: options.address,
      address: '',
      message: '{}',
      funds: [],
      cw20: false,
    }
  }

  encode({
    chainId,
    sender,
    address,
    message,
    funds,
    cw20,
  }: ExecuteData): UnifiedCosmosMsg | UnifiedCosmosMsg[] {
    const account = this.options.context.accounts.find(
      (a) => a.chainId === chainId && a.address === sender
    )
    if (!account) {
      throw new Error('Executor account not found')
    }

    const msg = JSON5.parse(message)

    let executeMsg: UnifiedCosmosMsg | undefined
    if (cw20) {
      if (funds.length !== 1) {
        throw new Error('Missing CW20 fund denom.')
      }

      // Execute CW20 send message.
      const isSecret = isSecretNetwork(chainId)
      executeMsg = makeExecuteSmartContractMessage({
        chainId,
        sender,
        contractAddress: funds[0].denom,
        msg: {
          send: {
            amount: HugeDecimal.fromHumanReadable(
              funds[0].amount,
              funds[0].decimals
            ).toString(),
            [isSecret ? 'recipient' : 'contract']: address,
            msg: encodeJsonToBase64(msg),
            ...(isSecret && {
              padding: '',
            }),
          },
        },
      })
    } else {
      executeMsg = makeExecuteSmartContractMessage({
        chainId,
        sender,
        contractAddress: address,
        msg,
        funds: funds
          .map(({ denom, amount, decimals }) =>
            HugeDecimal.fromHumanReadable(amount, decimals).toCoin(denom)
          )
          // Neutron errors with `invalid coins` if the funds list is not
          // alphabetized.
          .sort((a, b) => a.denom.localeCompare(b.denom)),
      })
    }

    return account.type === AccountType.Polytone
      ? maybeMakePolytoneExecuteMessages(
          this.options.chain.chainId,
          account.chainId,
          executeMsg
        )
      : account.type === AccountType.Ica
        ? maybeMakeIcaExecuteMessages(
            this.options.chain.chainId,
            account.chainId,
            this.options.address,
            account.address,
            executeMsg
          )
        : executeMsg
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    const isWasmExecute = objectMatchesStructure(decodedMessage, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {},
        },
      },
    })

    const isSecretExecuteMsg = isDecodedStargateMsg(
      decodedMessage,
      SecretMsgExecuteContract
    )

    return isWasmExecute || isSecretExecuteMsg
  }

  async decode([
    {
      decodedMessage,
      account: { chainId, address: sender },
    },
  ]: ProcessedMessage[]): Promise<ExecuteData> {
    const isWasmExecute = objectMatchesStructure(decodedMessage, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {},
        },
      },
    })

    const isSecretExecuteMsg = isDecodedStargateMsg(
      decodedMessage,
      SecretMsgExecuteContract
    )

    const executeMsg = isWasmExecute
      ? decodedMessage.wasm.execute.msg
      : isSecretExecuteMsg
        ? decodeJsonFromBase64(decodedMessage.stargate.value.msg)
        : undefined

    // Check if a CW20 execute, which is a subset of execute.
    const isCw20 =
      (isWasmExecute &&
        objectMatchesStructure(executeMsg, {
          send: {
            amount: {},
            contract: {},
            msg: {},
          },
        })) ||
      (isSecretExecuteMsg &&
        objectMatchesStructure(executeMsg, {
          send: {
            amount: {},
            recipient: {},
            msg: {},
            padding: {},
          },
        }))

    const cw20TokenDecimals = isCw20
      ? (
          await this.options.queryClient.fetchQuery(
            tokenQueries.info(this.options.queryClient, {
              chainId,
              type: TokenType.Cw20,
              denomOrAddress: isWasmExecute
                ? decodedMessage.wasm.execute.contract_addr
                : // Secret Network SNIP20.
                  bech32DataToAddress(
                    chainId,
                    decodedMessage.stargate.value.contract
                  ),
            })
          )
        ).decimals
      : 0

    const funds: Coin[] | undefined = isWasmExecute
      ? decodedMessage.wasm.execute.funds
      : isSecretExecuteMsg
        ? decodedMessage.stargate.value.sentFunds
        : undefined

    const fundsTokens =
      !isCw20 && funds?.length
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

    return isWasmExecute
      ? {
          chainId,
          sender,
          address: isCw20
            ? executeMsg.send.contract
            : decodedMessage.wasm.execute.contract_addr,
          message: JSON.stringify(
            isCw20
              ? decodeJsonFromBase64(executeMsg.send.msg, true)
              : executeMsg,
            null,
            2
          ),
          funds: isCw20
            ? [
                {
                  denom: decodedMessage.wasm.execute.contract_addr,
                  amount: HugeDecimal.from(
                    executeMsg.send.amount
                  ).toHumanReadableString(cw20TokenDecimals),
                  decimals: cw20TokenDecimals,
                },
              ]
            : fundsTokens.map(({ denom, amount, decimals }) => ({
                denom,
                amount:
                  HugeDecimal.from(amount).toHumanReadableString(decimals),
                decimals,
              })),
          cw20: isCw20,
        }
      : // isSecretExecuteMsg
        {
          chainId,
          sender,
          address: isCw20
            ? executeMsg.send.recipient
            : bech32DataToAddress(
                chainId,
                decodedMessage.stargate.value.contract
              ),
          message: JSON.stringify(
            isCw20
              ? decodeJsonFromBase64(executeMsg.send.msg, true)
              : executeMsg,
            null,
            2
          ),
          funds: isCw20
            ? [
                {
                  denom: bech32DataToAddress(
                    chainId,
                    decodedMessage.stargate.value.contract
                  ),
                  amount: HugeDecimal.from(
                    executeMsg.send.amount
                  ).toHumanReadableString(cw20TokenDecimals),
                  decimals: cw20TokenDecimals,
                },
              ]
            : fundsTokens.map(({ denom, amount, decimals }) => ({
                denom,
                amount:
                  HugeDecimal.from(amount).toHumanReadableString(decimals),
                decimals,
              })),
          cw20: isCw20,
        }
  }
}
