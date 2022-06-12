import JSON5 from 'json5'
import { useCallback, useMemo } from 'react'

import { makeWasmMessage, VotingModuleType } from '@dao-dao/utils'

import { ActionKey } from '.'
import {
  Action,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '..'
import { CustomComponent as Component } from '../components'

interface CustomData {
  message: string
}

const useDefaults: UseDefaults<CustomData> = () => ({
  message: '{}',
})

const useTransformToCosmos: UseTransformToCosmos<CustomData> = () =>
  useCallback((data: CustomData) => {
    let msg
    try {
      msg = JSON5.parse(data.message)
    } catch (err) {
      console.error(
        `internal error. unparsable message: (${data.message})`,
        err
      )
      return
    }
    // Convert the wasm message component to base64
    if (msg.wasm) msg = makeWasmMessage(msg)
    return msg
  }, [])

const useDecodedCosmosMsg: UseDecodedCosmosMsg<CustomData> = (
  msg: Record<string, any>
) =>
  useMemo(
    () => ({
      match: true,
      data: {
        message: JSON.stringify(msg, undefined, 2),
      },
    }),
    [msg]
  )

export const customAction: Action<CustomData> = {
  key: ActionKey.Custom,
  label: '🤖 Custom',
  description: 'Perform any custom action a wallet can.',
  Component,
  useDefaults,
  useTransformToCosmos,
  useDecodedCosmosMsg,
  votingModuleTypes: [
    VotingModuleType.Cw20StakedBalanceVoting,
    VotingModuleType.Cw4Voting,
  ],
}
