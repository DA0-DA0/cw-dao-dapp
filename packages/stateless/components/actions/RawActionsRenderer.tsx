import { useMemo } from 'react'

import {
  ActionEncodeContext,
  ActionKeyAndDataNoId,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import { decodeMessages, decodeRawDataForDisplay } from '@dao-dao/utils'

import { useActionsEncoder } from '../../contexts/ActionsEncoder'
import { ActionsEncoderProvider } from '../../providers/ActionsEncoder'
import {
  CosmosMessageDisplay,
  CosmosMessageDisplayProps,
} from '../CosmosMessageDisplay'
import { ErrorPage } from '../error'

export type RawActionsRendererProps =
  | {
      /**
       * This likely comes from a form field array that holds the action data.
       */
      actionKeysAndData: ActionKeyAndDataNoId[]
      /**
       * Encode context.
       */
      encodeContext: ActionEncodeContext
      /**
       * Existing messages to display.
       */
      messages?: never
    }
  | {
      /**
       * Existing messages to display.
       */
      messages: UnifiedCosmosMsg[]
      /**
       * This likely comes from a form field array that holds the action data.
       */
      actionKeysAndData?: never
      /**
       * Encode context.
       */
      encodeContext?: never
    }

export const RawActionsRenderer = (props: RawActionsRendererProps) =>
  props.actionKeysAndData ? (
    <ActionsEncoderProvider
      actionKeysAndData={props.actionKeysAndData}
      encodeContext={props.encodeContext}
    >
      <RawActionsRendererEncoder />
    </ActionsEncoderProvider>
  ) : (
    <RawActionsRendererMessages messages={props.messages} />
  )

const RawActionsRendererEncoder = () => {
  const encoder = useActionsEncoder()

  return (
    <>
      {encoder.errored ? (
        <ErrorPage error={encoder.error} />
      ) : encoder.ready ? (
        <RawActionsRendererMessages messages={encoder.messages} />
      ) : (
        <CosmosMessageDisplay loading value="" />
      )}
    </>
  )
}

export const RawActionsRendererMessages = ({
  messages,
  ...props
}: {
  messages: any[]
} & Omit<CosmosMessageDisplayProps, 'value'>) => {
  const value = useMemo(() => {
    const decoded = decodeMessages(messages).map(decodeRawDataForDisplay)
    return JSON.stringify(decoded.length === 1 ? decoded[0] : decoded, null, 2)
  }, [messages])

  return <CosmosMessageDisplay {...props} value={value} />
}
