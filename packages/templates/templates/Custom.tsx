import JSON5 from 'json5'
import { useCallback, useMemo } from 'react'

import { makeWasmMessage, VotingModuleType } from '@dao-dao/utils'

import {
  Template,
  TemplateKey,
  UseDecodeCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '../components'
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

const useDecodeCosmosMsg: UseDecodeCosmosMsg<CustomData> = (
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

export const customTemplate: Template<CustomData> = {
  key: TemplateKey.Custom,
  label: '🤖 Custom',
  description: 'Perform any custom action a wallet can.',
  Component,
  useDefaults,
  useTransformToCosmos,
  useDecodeCosmosMsg,
  votingModuleTypes: [
    VotingModuleType.Cw20StakedBalanceVoting,
    VotingModuleType.Cw4Voting,
  ],
}
