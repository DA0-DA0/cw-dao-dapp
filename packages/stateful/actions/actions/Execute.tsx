import { Coin } from '@cosmjs/stargate'
import JSON5 from 'json5'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValue } from 'recoil'

import { genericTokenSelector } from '@dao-dao/state/recoil'
import { ActionCardLoader, SwordsEmoji } from '@dao-dao/stateless'
import { TokenType } from '@dao-dao/types'
import {
  ActionComponent,
  ActionMaker,
  CoreActionKey,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import {
  NATIVE_DECIMALS,
  convertDenomToMicroDenomWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  encodeMessageAsBase64,
  makeWasmMessage,
  nativeTokenDecimals,
  objectMatchesStructure,
  parseEncodedMessage,
} from '@dao-dao/utils'

import { SuspenseLoader } from '../../components/SuspenseLoader'
import {
  ExecuteData,
  ExecuteComponent as StatelessExecuteComponent,
} from '../components/Execute'
import { useTokenBalances } from '../hooks'

const useDefaults: UseDefaults<ExecuteData> = () => ({
  address: '',
  message: '{}',
  funds: [],
  cw20: false,
})

const useTransformToCosmos: UseTransformToCosmos<ExecuteData> = () => {
  const { t } = useTranslation()
  const tokenBalances = useTokenBalances()

  return useCallback(
    ({ address, message, funds, cw20 }: ExecuteData) => {
      let msg
      try {
        msg = JSON5.parse(message)
      } catch (err) {
        console.error(`internal error. unparsable message: (${message})`, err)
        return
      }

      if (cw20) {
        const tokenBalance =
          tokenBalances.loading || funds.length !== 1
            ? undefined
            : tokenBalances.data.find(
                ({ token }) => token.denomOrAddress === funds[0].denom
              )
        if (!tokenBalance) {
          throw new Error(t('error.unknownDenom', { denom: funds[0].denom }))
        }

        // Execute CW20 send message.
        return makeWasmMessage({
          wasm: {
            execute: {
              contract_addr: tokenBalance.token.denomOrAddress,
              funds: [],
              msg: {
                send: {
                  amount: convertDenomToMicroDenomWithDecimals(
                    funds[0].amount,
                    tokenBalance.token.decimals
                  ).toString(),
                  contract: address,
                  msg: encodeMessageAsBase64(msg),
                },
              },
            },
          },
        })
      } else {
        return makeWasmMessage({
          wasm: {
            execute: {
              contract_addr: address,
              funds: funds.map(({ denom, amount }) => ({
                denom,
                amount: convertDenomToMicroDenomWithDecimals(
                  amount,
                  nativeTokenDecimals(denom) ?? NATIVE_DECIMALS
                ).toString(),
              })),
              msg,
            },
          },
        })
      }
    },
    [t, tokenBalances]
  )
}

const useDecodedCosmosMsg: UseDecodedCosmosMsg<ExecuteData> = (
  msg: Record<string, any>
) => {
  const isExecute = objectMatchesStructure(msg, {
    wasm: {
      execute: {
        contract_addr: {},
        funds: {},
        msg: {},
      },
    },
  })

  // Check if a CW20 execute, which is a subset of execute.
  const isCw20 = objectMatchesStructure(msg, {
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

  const cw20Token = useRecoilValue(
    isCw20
      ? genericTokenSelector({
          type: TokenType.Cw20,
          denomOrAddress: msg.wasm.execute.contract_addr,
        })
      : constSelector(undefined)
  )

  // Can't match until we have the CW20 token info.
  if (isCw20 && !cw20Token) {
    return { match: false }
  }

  return isExecute
    ? {
        match: true,
        data: {
          address: isCw20
            ? msg.wasm.execute.msg.send.contract
            : msg.wasm.execute.contract_addr,
          message: JSON.stringify(
            isCw20
              ? parseEncodedMessage(msg.wasm.execute.msg.send.msg)
              : msg.wasm.execute.msg,
            undefined,
            2
          ),
          funds: isCw20
            ? [
                {
                  denom: msg.wasm.execute.contract_addr,
                  amount: convertMicroDenomToDenomWithDecimals(
                    msg.wasm.execute.msg.send.amount,
                    cw20Token?.decimals ?? 0
                  ),
                },
              ]
            : (msg.wasm.execute.funds as Coin[]).map(({ denom, amount }) => ({
                denom,
                amount: convertMicroDenomToDenomWithDecimals(
                  amount,
                  nativeTokenDecimals(denom) ?? NATIVE_DECIMALS
                ),
              })),
          cw20: isCw20,
        },
      }
    : { match: false }
}

const Component: ActionComponent = (props) => {
  const tokenBalances = useTokenBalances()

  return (
    <SuspenseLoader
      fallback={<ActionCardLoader />}
      forceFallback={
        // Manually trigger loader.
        tokenBalances.loading
      }
    >
      <StatelessExecuteComponent
        {...props}
        options={{
          balances: tokenBalances.loading ? [] : tokenBalances.data,
        }}
      />
    </SuspenseLoader>
  )
}

export const makeExecuteAction: ActionMaker<ExecuteData> = ({ t }) => ({
  key: CoreActionKey.Execute,
  Icon: SwordsEmoji,
  label: t('title.executeSmartContract'),
  description: t('info.executeSmartContractActionDescription'),
  Component,
  useDefaults,
  useTransformToCosmos,
  useDecodedCosmosMsg,
})
