import { ComponentType } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  InputLabel,
  NestedActionsEditor,
  NestedActionsEditorOptions,
  NestedActionsRenderer,
  NestedActionsRendererProps,
  useChain,
} from '@dao-dao/stateless'
import {
  NestedActionsEditorFormData,
  StatefulEntityDisplayProps,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { isValidBech32Address } from '@dao-dao/utils'

export type AuthzExecData = {
  chainId: string
  // Set common address to use for all actions.
  address: string
  // Once created, fill group adjacent messages by sender.
  _msgs?: {
    sender: string
    msgs: UnifiedCosmosMsg[]
  }[]
} & NestedActionsEditorFormData

export type AuthzExecOptions = {
  // When not creating, this will be set to the index of the group of messages
  // to render.
  msgPerSenderIndex?: number

  EntityDisplay: ComponentType<StatefulEntityDisplayProps>
} & NestedActionsEditorOptions &
  Omit<NestedActionsRendererProps, 'msgsFieldName'>

export const AuthzExecComponent: ActionComponent<AuthzExecOptions> = (
  props
) => {
  const { t } = useTranslation()
  const { bech32Prefix } = useChain()
  const { watch } = useFormContext<AuthzExecData>()
  const {
    fieldNamePrefix,
    isCreating,
    options: { msgPerSenderIndex, EntityDisplay, ...options },
  } = props

  const address = watch((fieldNamePrefix + 'address') as 'address')
  const msgsPerSender = watch((fieldNamePrefix + '_msgs') as '_msgs') || []

  const sender = !isCreating
    ? msgsPerSender[msgPerSenderIndex!]?.sender
    : undefined

  return (
    <>
      {isValidBech32Address(address, bech32Prefix) && isCreating ? (
        <>
          <InputLabel className="-mb-2" name={t('title.actions')} />

          <NestedActionsEditor {...props} />
        </>
      ) : (
        !isCreating && (
          <div className="flex flex-col gap-4">
            <InputLabel className="-mb-2" name={t('title.account')} />
            {sender ? (
              <EntityDisplay address={sender} />
            ) : (
              <p className="body-text italic">
                {t('info.failedToDecodeAddressUnrecognizedMessage')}
              </p>
            )}

            <InputLabel className="-mb-2" name={t('title.actions')} />
            <NestedActionsRenderer
              {...options}
              msgsFieldName={
                fieldNamePrefix + `_msgs.${msgPerSenderIndex!}.msgs`
              }
            />
          </div>
        )
      )}
    </>
  )
}
