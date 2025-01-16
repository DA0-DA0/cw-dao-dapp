import { useQueryClient } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { contractQueries } from '@dao-dao/state'
import {
  ActionBase,
  ChainProvider,
  DaoSupportedChainPickerInput,
  InputLabel,
  Loader,
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
  makeEmptyUnifiedProfile,
  makeValidateAddress,
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
import { BaseActionsProvider } from '../../../providers/base'
import { WalletActionsProvider } from '../../../providers/wallet'
import {
  AuthzExecData,
  AuthzExecOptions,
  AuthzExecComponent as StatelessAuthzExecComponent,
} from './Component'

type InnerOptions = Pick<AuthzExecOptions, 'msgPerSenderIndex'>

const InnerComponent: ActionComponent<InnerOptions> = (props) => (
  <StatelessAuthzExecComponent
    {...props}
    options={{
      msgPerSenderIndex: props.options.msgPerSenderIndex,
      encodeContext: useActionEncodeContext(),
      EntityDisplay,
      SuspenseLoader,
    }}
  />
)

const InnerComponentWrapper: ActionComponent<
  InnerOptions & { address: string }
> = (props) => {
  const {
    isCreating,
    options: { address },
  } = props
  const { chainId, bech32Prefix } = useChain()
  const queryClient = useQueryClient()

  const validAddress = !!address && isValidBech32Address(address, bech32Prefix)
  const isDao = useQueryLoadingData(
    contractQueries.isDao(
      queryClient,
      validAddress
        ? {
            chainId,
            address,
          }
        : undefined
    ),
    false
  )

  if (isCreating && !validAddress) {
    return null
  }

  // Load until we know it's a DAO or not. If not creating and not a valid
  // address, no need to show loading.
  return (isCreating || validAddress) && (isDao.loading || isDao.updating) ? (
    <Loader />
  ) : // If a DAO, wrap in necessary DAO context.
  !isDao.loading && !isDao.updating && isDao.data ? (
    <DaoProviders
      key={
        // Make sure to re-render (reset state inside the contexts) when the
        // address changes.
        address
      }
      chainId={chainId}
      coreAddress={address}
    >
      <InnerComponent {...props} />
    </DaoProviders>
  ) : // If not a DAO, and either we're creating OR we're not creating but the address is valid, wrap in necessary wallet context.
  isCreating || validAddress ? (
    <WalletActionsProvider address={address}>
      <InnerComponent {...props} />
    </WalletActionsProvider>
  ) : (
    // !isCreating && !validAddress
    //
    // If no valid address is set and we're not creating, that means the
    // component failed to detect the sender, likely due to not knowing how to
    // decode the messages contained which would contain the sender. Use an
    // empty profile and accounts so the component can still render.
    <BaseActionsProvider
      actionContext={{
        type: ActionContextType.Wallet,
        profile: makeEmptyUnifiedProfile(chainId, address),
        accounts: [],
      }}
      address={address}
    >
      <InnerComponent {...props} />
    </BaseActionsProvider>
  )
}

const Component: ActionComponent = (props) => {
  const { t } = useTranslation()
  const { context } = useActionOptions()

  // Load DAO info for chosen DAO.
  const { register, watch } = useFormContext<AuthzExecData>()
  const address = watch((props.fieldNamePrefix + 'address') as 'address') || ''
  const msgsPerSender =
    watch((props.fieldNamePrefix + '_msgs') as '_msgs') ?? []

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const { bech32Prefix } = getChainForChainId(chainId)

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
        {/* When creating, show common address field for all messages. When not creating, msgs will be grouped by sender and displayed in order, which if created via this action, will look the same with one address at the top and many actions below it. */}
        {props.isCreating && (
          <>
            <InputLabel className="-mb-3" name={t('title.account')} />

            <AddressInput
              autoFocus
              error={props.errors?.address}
              fieldName={(props.fieldNamePrefix + 'address') as 'address'}
              register={register}
              validation={[makeValidateAddress(bech32Prefix)]}
            />
          </>
        )}

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
