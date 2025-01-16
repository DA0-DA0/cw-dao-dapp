import { fromUtf8, toBase64, toUtf8 } from '@cosmjs/encoding'
import { Coin } from '@cosmjs/stargate'
import JSON5 from 'json5'
import { nanoid } from 'nanoid'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { HugeDecimal } from '@dao-dao/math'
import { tokenQueries } from '@dao-dao/state/query'
import {
  ActionBase,
  BabyAngelEmoji,
  ChainProvider,
  DaoSupportedChainPickerInput,
  useActionOptions,
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
import { MsgInstantiateContract2 } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/tx'
import {
  decodeJsonFromBase64,
  getAccountAddress,
  isDecodedStargateMsg,
  isSecretNetwork,
  maybeMakeIcaExecuteMessages,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { useGenerateInstantiate2 } from '../../../../hooks'
import { useTokenBalances } from '../../../hooks'
import {
  Instantiate2Data,
  Instantiate2Component as StatelessInstantiate2Component,
} from './Component'

// Account types that are allowed to instantiate from.
const ALLOWED_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.Base,
  AccountType.Polytone,
  AccountType.Ica,
]

const Component: ActionComponent = (props) => {
  const { context } = useActionOptions()

  const { watch, setValue } = useFormContext<Instantiate2Data>()
  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const codeId = watch((props.fieldNamePrefix + 'codeId') as 'codeId')
  const salt = watch((props.fieldNamePrefix + 'salt') as 'salt')
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

  const predictedAddress = useGenerateInstantiate2({
    chainId,
    creator: sender,
    codeId,
    salt,
  })

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
        <StatelessInstantiate2Component
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
            predictedAddress,
          }}
        />
      </ChainProvider>
    </>
  )
}

export class Instantiate2Action extends ActionBase<Instantiate2Data> {
  public readonly key = ActionKey.Instantiate2
  public readonly Component = Component

  constructor(options: ActionOptions) {
    // Secret Network does not support instantiate2.
    if (isSecretNetwork(options.chain.chainId)) {
      throw new Error('Instantiate2 is not supported on Secret Network.')
    }

    super(options, {
      Icon: BabyAngelEmoji,
      label: options.t('title.instantiatePredictableSmartContract'),
      description: options.t(
        'info.instantiatePredictableSmartContractActionDescription'
      ),
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
      salt: nanoid(),
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
    salt,
    funds,
  }: Instantiate2Data): UnifiedCosmosMsg | UnifiedCosmosMsg[] {
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

    const instantiate2Msg = makeStargateMessage({
      stargate: {
        typeUrl: MsgInstantiateContract2.typeUrl,
        value: MsgInstantiateContract2.fromPartial({
          sender,
          admin: admin || '',
          codeId: codeId ? BigInt(codeId) : 0n,
          label,
          msg: toUtf8(JSON.stringify(msg)),
          funds: convertedFunds,
          salt: toUtf8(salt),
          fixMsg: false,
        }),
      },
    })

    return account.type === AccountType.Polytone
      ? maybeMakePolytoneExecuteMessages(
          this.options.chain.chainId,
          account.chainId,
          instantiate2Msg
        )
      : account.type === AccountType.Ica
        ? maybeMakeIcaExecuteMessages(
            this.options.chain.chainId,
            account.chainId,
            this.options.address,
            account.address,
            instantiate2Msg
          )
        : instantiate2Msg
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return (
      isDecodedStargateMsg(decodedMessage, MsgInstantiateContract2) ||
      objectMatchesStructure(decodedMessage, {
        wasm: {
          instantiate2: {
            code_id: {},
            label: {},
            msg: {},
            funds: {},
            salt: {},
            fix_msg: {},
          },
        },
      })
    )
  }

  async decode([
    {
      decodedMessage,
      account: { chainId, address: sender },
    },
  ]: ProcessedMessage[]): Promise<Instantiate2Data> {
    let data

    // Convert to CW msg format to use consistent logic below.
    if (isDecodedStargateMsg(decodedMessage, MsgInstantiateContract2)) {
      data = {
        admin: decodedMessage.stargate.value.admin,
        code_id: Number(decodedMessage.stargate.value.codeId),
        label: decodedMessage.stargate.value.label,
        msg: decodeJsonFromBase64(
          toBase64(decodedMessage.stargate.value.msg),
          true
        ),
        funds: decodedMessage.stargate.value.funds,
        fix_msg: decodedMessage.stargate.value.fixMsg,
        salt: fromUtf8(decodedMessage.stargate.value.salt),
      }
    } else {
      data = decodedMessage.wasm.instantiate2
    }

    const fundsTokens = await Promise.all(
      (data.funds as Coin[])?.map(async ({ denom, amount }) => ({
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
      })) || []
    )

    return {
      chainId,
      sender,
      admin: data.admin || '',
      codeId: data.code_id,
      label: data.label,
      message: JSON.stringify(data.msg, null, 2),
      salt: data.salt,
      funds: fundsTokens.map(({ denom, amount, decimals }) => ({
        denom,
        amount: HugeDecimal.from(amount).toHumanReadableString(decimals),
        decimals,
      })),
    }
  }
}
