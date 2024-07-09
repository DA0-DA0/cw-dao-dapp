import { fromUtf8, toUtf8 } from '@cosmjs/encoding'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { waitForAll } from 'recoil'

import { genericTokenSelector } from '@dao-dao/state/recoil'
import {
  AtomEmoji,
  ChainProvider,
  DaoSupportedChainPickerInput,
  useCachedLoading,
} from '@dao-dao/stateless'
import { TokenType, makeStargateMessage } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMaker,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import { InstantiateMsg as ValenceAccountInstantiateMsg } from '@dao-dao/types/contracts/ValenceAccount'
import { MsgInstantiateContract2 } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/tx'
import {
  VALENCE_INSTANTIATE2_SALT,
  VALENCE_SUPPORTED_CHAINS,
  convertDenomToMicroDenomStringWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  decodePolytoneExecuteMsg,
  getChainAddressForActionOptions,
  getDisplayNameForChainId,
  getSupportedChainConfig,
  isDecodedStargateMsg,
  maybeMakePolytoneExecuteMessage,
} from '@dao-dao/utils'

import { useTokenBalances } from '../../../hooks'
import { useActionOptions } from '../../../react/context'
import {
  CreateValenceAccountComponent,
  CreateValenceAccountData,
} from './Component'

const Component: ActionComponent = (props) => {
  const { context } = useActionOptions()
  const { watch, setValue } = useFormContext<CreateValenceAccountData>()

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const funds = watch((props.fieldNamePrefix + 'funds') as 'funds')

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

  return (
    <>
      {context.type === ActionContextType.Dao &&
        VALENCE_SUPPORTED_CHAINS.length > 1 && (
          <DaoSupportedChainPickerInput
            className="mb-4"
            disabled={!props.isCreating}
            fieldName={props.fieldNamePrefix + 'chainId'}
            includeChainIds={VALENCE_SUPPORTED_CHAINS}
            onChange={() => {
              // Reset funds when switching chain.
              setValue((props.fieldNamePrefix + 'funds') as 'funds', [])
            }}
          />
        )}

      <ChainProvider chainId={chainId}>
        <CreateValenceAccountComponent
          {...props}
          options={{
            nativeBalances,
          }}
        />
      </ChainProvider>
    </>
  )
}

const useDefaults: UseDefaults<CreateValenceAccountData> = () => ({
  chainId: VALENCE_SUPPORTED_CHAINS[0],
  funds: [
    {
      denom: 'untrn',
      amount: 10,
    },
  ],
})

export const makeCreateValenceAccountAction: ActionMaker<
  CreateValenceAccountData
> = (options) => {
  const {
    t,
    chain: { chain_id: currentChainId },
  } = options

  const useDecodedCosmosMsg: UseDecodedCosmosMsg<CreateValenceAccountData> = (
    msg: Record<string, any>
  ) => {
    let chainId = currentChainId
    const decodedPolytone = decodePolytoneExecuteMsg(chainId, msg)
    if (decodedPolytone.match) {
      chainId = decodedPolytone.chainId
      msg = decodedPolytone.msg
    }

    const typedMsg =
      isDecodedStargateMsg(msg) &&
      msg.stargate.typeUrl === MsgInstantiateContract2.typeUrl &&
      fromUtf8(msg.stargate.value.salt) === VALENCE_INSTANTIATE2_SALT
        ? (msg.stargate.value as MsgInstantiateContract2)
        : undefined

    const valenceAccountCodeId =
      getSupportedChainConfig(chainId)?.codeIds?.ValenceAccount

    const fundTokens = useCachedLoading(
      typedMsg
        ? waitForAll(
            typedMsg.funds.map(({ denom }) =>
              genericTokenSelector({
                chainId,
                type: TokenType.Native,
                denomOrAddress: denom,
              })
            )
          )
        : undefined,
      []
    )

    return valenceAccountCodeId !== undefined && typedMsg
      ? {
          match: true,
          data: {
            chainId,
            funds: typedMsg.funds.map(({ denom, amount }) => ({
              denom,
              amount: convertMicroDenomToDenomWithDecimals(
                amount,
                (!fundTokens.loading &&
                  fundTokens.data.find(
                    (token) =>
                      token.chainId === chainId &&
                      token.denomOrAddress === denom
                  )?.decimals) ||
                  0
              ),
            })),
          },
        }
      : {
          match: false,
        }
  }

  const useTransformToCosmos: UseTransformToCosmos<
    CreateValenceAccountData
  > = () => {
    const nativeBalances = useTokenBalances({
      filter: TokenType.Native,
    })

    return useCallback(
      ({ chainId, funds }) => {
        const config = getSupportedChainConfig(chainId)
        if (!config?.codeIds?.ValenceAccount || !config?.valence) {
          throw new Error(t('error.unsupportedValenceChain'))
        }

        const sender = getChainAddressForActionOptions(options, chainId)
        if (!sender) {
          throw new Error(
            t('error.failedToFindChainAccount', {
              chain: getDisplayNameForChainId(chainId),
            })
          )
        }

        return maybeMakePolytoneExecuteMessage(
          currentChainId,
          chainId,
          makeStargateMessage({
            stargate: {
              typeUrl: MsgInstantiateContract2.typeUrl,
              value: {
                sender,
                admin: sender,
                codeId: BigInt(config.codeIds.ValenceAccount),
                label: 'Valence Account',
                msg: toUtf8(
                  JSON.stringify({
                    services_manager: config.valence.servicesManager,
                  } as ValenceAccountInstantiateMsg)
                ),
                funds: funds.map(({ denom, amount }) => ({
                  denom,
                  amount: convertDenomToMicroDenomStringWithDecimals(
                    amount,
                    (!nativeBalances.loading &&
                      nativeBalances.data.find(
                        ({ token }) =>
                          token.chainId === chainId &&
                          token.denomOrAddress === denom
                      )?.token.decimals) ||
                      0
                  ),
                })),
                salt: toUtf8(VALENCE_INSTANTIATE2_SALT),
                fixMsg: false,
              } as MsgInstantiateContract2,
            },
          })
        )
      },
      [nativeBalances]
    )
  }

  return {
    key: ActionKey.CreateValenceAccount,
    Icon: AtomEmoji,
    label: t('title.createValenceAccount'),
    description: t('info.createValenceAccountDescription'),
    notReusable: true,
    Component,
    useDefaults,
    useTransformToCosmos,
    useDecodedCosmosMsg,
    // The configure rebalancer action is responsible for adding this action.
    programmaticOnly: true,
  }
}
