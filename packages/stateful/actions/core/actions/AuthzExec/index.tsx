import { useQueryClient } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'

import { contractQueries, processMessage } from '@dao-dao/state'
import {
  ActionBase,
  ActionsContext,
  ChainProvider,
  DaoSupportedChainPickerInput,
  LockWithKeyEmoji,
  useActionOptions,
  useChain,
} from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
  UnifiedCosmosMsg,
  cwMsgToProtobuf,
  makeStargateMessage,
  protobufToCwMsg,
} from '@dao-dao/types'
import { MsgExec } from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/tx'
import {
  getChainAddressForActionOptions,
  getChainForChainId,
  isDecodedStargateMsg,
  isValidBech32Address,
  maybeMakePolytoneExecuteMessages,
} from '@dao-dao/utils'

import {
  AddressInput,
  DaoProviders,
  EntityDisplay,
  SuspenseLoader,
} from '../../../../components'
import { useQueryLoadingData } from '../../../../hooks'
import { useActionEncodeContext } from '../../../context'
import { WalletActionsProvider } from '../../../providers/wallet'
import {
  AuthzExecData,
  AuthzExecOptions,
  AuthzExecComponent as StatelessAuthzExecComponent,
} from './Component'

type InnerOptions = Pick<AuthzExecOptions, 'msgPerSenderIndex'>

const InnerComponentLoading: ActionComponent<InnerOptions> = (props) => (
  <ActionsContext.Provider
    value={{
      // Just pass the same options down for now since they aren't used.
      options: useActionOptions(),
      actions: [],
      actionMap: {} as any,
      categories: [],
      messageProcessor: processMessage,
    }}
  >
    <StatelessAuthzExecComponent
      {...props}
      options={{
        msgPerSenderIndex: props.options.msgPerSenderIndex,
        encodeContext: useActionEncodeContext(),
        AddressInput,
        EntityDisplay,
        SuspenseLoader,
      }}
    />
  </ActionsContext.Provider>
)

const InnerComponent: ActionComponent<InnerOptions> = (props) => (
  <StatelessAuthzExecComponent
    {...props}
    options={{
      msgPerSenderIndex: props.options.msgPerSenderIndex,
      encodeContext: useActionEncodeContext(),
      AddressInput,
      EntityDisplay,
      SuspenseLoader,
    }}
  />
)

const InnerComponentWrapper: ActionComponent<
  InnerOptions & { address: string }
> = (props) => {
  const {
    options: { address },
  } = props
  const { chainId, bech32Prefix } = useChain()

  const isDao = useQueryLoadingData(
    contractQueries.isDao(
      useQueryClient(),
      address && isValidBech32Address(address, bech32Prefix)
        ? {
            chainId,
            address,
          }
        : undefined
    ),
    false
  )

  return isDao.loading || isDao.updating ? (
    <InnerComponentLoading {...props} />
  ) : isDao.data ? (
    <DaoProviders
      key={
        // Make sure to re-render (reset state inside the contexts) when the
        // address changes.
        address
      }
      chainId={chainId}
      coreAddress={address}
      loaderFallback={<InnerComponentLoading {...props} />}
    >
      <InnerComponent {...props} />
    </DaoProviders>
  ) : (
    <WalletActionsProvider address={address}>
      <InnerComponent {...props} />
    </WalletActionsProvider>
  )
}

const Component: ActionComponent = (props) => {
  const { context } = useActionOptions()

  // Load DAO info for chosen DAO.
  const { watch } = useFormContext<AuthzExecData>()
  const address = watch((props.fieldNamePrefix + 'address') as 'address') || ''
  const msgsPerSender =
    watch((props.fieldNamePrefix + '_msgs') as '_msgs') ?? []

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')

  // When creating, just show one form for the chosen address. When not
  // creating, render a form for each sender message group since the component
  // needs to be wrapped in the providers for that sender.
  return (
    <>
      {context.type === ActionContextType.Dao && (
        <DaoSupportedChainPickerInput
          disabled={!props.isCreating}
          fieldName={props.fieldNamePrefix + 'chainId'}
          onlyDaoChainIds
        />
      )}

      {/* Re-render when chain changes so hooks and state reset. */}
      <ChainProvider key={chainId} chainId={chainId}>
        {props.isCreating ? (
          <InnerComponentWrapper
            {...props}
            options={{
              address,
            }}
          />
        ) : (
          <>
            {msgsPerSender.map(({ sender }, index) => (
              <InnerComponentWrapper
                key={index}
                {...props}
                options={{
                  address: sender,
                  // Set so the component knows which sender message group to render.
                  msgPerSenderIndex: index,
                }}
              />
            ))}
          </>
        )}
      </ChainProvider>
    </>
  )
}

export class AuthzExecAction extends ActionBase<AuthzExecData> {
  public readonly key = ActionKey.AuthzExec
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: LockWithKeyEmoji,
      label: options.t('title.authzExec'),
      description: options.t('info.authzExecDescription'),
    })

    this.defaults = {
      chainId: options.chain.chainId,
      address: '',
      msgs: [],
    }
  }

  encode({ chainId, address, msgs }: AuthzExecData): UnifiedCosmosMsg[] {
    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      makeStargateMessage({
        stargate: {
          typeUrl: MsgExec.typeUrl,
          value: {
            grantee:
              getChainAddressForActionOptions(this.options, chainId) ?? '',
            msgs: msgs.map((msg) => cwMsgToProtobuf(chainId, msg, address)),
          } satisfies MsgExec,
        },
      })
    )
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return (
      isDecodedStargateMsg(decodedMessage, MsgExec, {
        grantee: {},
        msgs: {},
      }) && Array.isArray(decodedMessage.stargate.value.msgs)
    )
  }

  decode([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): AuthzExecData {
    const execMsg = decodedMessage.stargate.value as MsgExec

    // Group adjacent messages by sender, preserving message order.
    const msgsPerSender = execMsg.msgs
      .map((msg) => protobufToCwMsg(getChainForChainId(chainId), msg))
      .reduce(
        (acc, { msg, sender }) => {
          const last = acc[acc.length - 1]
          if (last && last.sender === sender) {
            last.msgs.push(msg)
          } else {
            acc.push({ sender, msgs: [msg] })
          }
          return acc
        },
        [] as {
          sender: string
          msgs: UnifiedCosmosMsg[]
        }[]
      )

    return {
      chainId,
      // Technically each message could have a different address. While we don't
      // support that on creation, we can still detect and render them correctly
      // in the component.
      address: msgsPerSender.length === 1 ? msgsPerSender[0].sender : '',
      msgs: msgsPerSender.length === 1 ? msgsPerSender[0].msgs : [],
      _msgs: msgsPerSender,
    }
  }
}
