import { fromUtf8, toUtf8 } from '@cosmjs/encoding'
import JSON5 from 'json5'
import { useFormContext } from 'react-hook-form'

import { HugeDecimal } from '@dao-dao/math'
import { tokenQueries } from '@dao-dao/state/query'
import {
  ActionBase,
  ChainProvider,
  DaoSupportedChainPickerInput,
  KeyEmoji,
  Loader,
  useActionOptions,
} from '@dao-dao/stateless'
import {
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
import { GenericAuthorization } from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/authz'
import {
  MsgGrant,
  MsgRevoke,
} from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/tx'
import { SendAuthorization } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/authz'
import {
  AcceptedMessageKeysFilter,
  AcceptedMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  ContractGrant,
  ContractMigrationAuthorization,
  MaxCallsLimit,
} from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/authz'
import { Any } from '@dao-dao/types/protobuf/codegen/google/protobuf/any'
import {
  getChainAddressForActionOptions,
  isDecodedStargateMsg,
  maybeMakePolytoneExecuteMessages,
} from '@dao-dao/utils'

import { AddressInput, SuspenseLoader } from '../../../../components'
import { useTokenBalances } from '../../../hooks'
import { AuthzGrantRevokeComponent as StatelessAuthzAuthorizationComponent } from './Component'
import {
  ACTION_TYPES,
  AUTHORIZATION_TYPES,
  AuthzGrantRevokeData,
  FILTER_TYPES,
  LIMIT_TYPES,
} from './types'

const Component: ActionComponent = (props) => {
  const balances = useTokenBalances()

  const { context } = useActionOptions()
  const { watch } = useFormContext<AuthzGrantRevokeData>()
  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')

  return (
    <>
      {context.type === ActionContextType.Dao && (
        <DaoSupportedChainPickerInput
          disabled={!props.isCreating}
          fieldName={props.fieldNamePrefix + 'chainId'}
          onlyDaoChainIds
        />
      )}

      <ChainProvider chainId={chainId}>
        <SuspenseLoader
          fallback={<Loader />}
          forceFallback={
            // Manually trigger loader.
            balances.loading
          }
        >
          <StatelessAuthzAuthorizationComponent
            {...props}
            options={{
              AddressInput,
              balances,
            }}
          />
        </SuspenseLoader>
      </ChainProvider>
    </>
  )
}

export class AuthzGrantRevokeAction extends ActionBase<AuthzGrantRevokeData> {
  public readonly key = ActionKey.AuthzGrantRevoke
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: KeyEmoji,
      label: options.t('title.authzAuthorization'),
      description: options.t('info.authzAuthorizationDescription'),
      keywords: ['authorization', 'authz'],
    })

    this._defaults = {
      chainId: options.chain.chainId,
      mode: 'grant',
      authorizationTypeUrl: AUTHORIZATION_TYPES[0].type.typeUrl,
      customTypeUrl: false,
      grantee: '',
      filterTypeUrl: FILTER_TYPES[0].type.typeUrl,
      filterKeys: '',
      filterMsgs: '{}',
      funds: [],
      contract: '',
      calls: 10,
      limitTypeUrl: LIMIT_TYPES[0].type.typeUrl,
      msgTypeUrl: ACTION_TYPES[0].type.typeUrl,
    }
  }

  encode({
    chainId,
    mode,
    authorizationTypeUrl,
    grantee,
    msgTypeUrl,
    filterKeys,
    filterMsgs,
    filterTypeUrl,
    funds,
    contract,
    limitTypeUrl,
    calls,
  }: AuthzGrantRevokeData): UnifiedCosmosMsg[] {
    const parsedFilterMsgs = JSON5.parse(filterMsgs)
    const filter: Any | undefined = FILTER_TYPES.find(
      ({ type: { typeUrl } }) => typeUrl === filterTypeUrl
    )?.type.toProtoMsg({
      // AcceptedMessageKeysFilter
      keys: filterKeys.split(',').map((k) => k.trim()),
      // AcceptedMessagesFilter
      messages: (Array.isArray(parsedFilterMsgs)
        ? parsedFilterMsgs
        : [parsedFilterMsgs]
      ).map((m: unknown) => toUtf8(JSON.stringify(m))),
    })

    const limit: Any | undefined = LIMIT_TYPES.find(
      ({ type: { typeUrl } }) => typeUrl === limitTypeUrl
    )?.type.toProtoMsg({
      // MaxCallsLimit
      remaining: BigInt(calls),
      // CombinedLimit
      callsRemaining: BigInt(calls),
      // MaxFundsLimit
      // CombinedLimit
      amounts: funds.map(({ denom, amount, decimals }) =>
        HugeDecimal.fromHumanReadable(amount, decimals).toCoin(denom)
      ),
    })

    let authorization: Any | undefined
    if (mode === 'grant') {
      authorization = AUTHORIZATION_TYPES.find(
        ({ type: { typeUrl } }) => typeUrl === authorizationTypeUrl
      )?.type.toProtoMsg({
        // GenericAuthorization
        msg: msgTypeUrl,
        // SendAuthorization
        spendLimit: funds.map(({ denom, amount, decimals }) => ({
          amount: HugeDecimal.fromHumanReadable(amount, decimals).toString(),
          denom,
        })),
        allowList: [],
        // ContractExecutionAuthorization
        // ContractMigrationAuthorization
        grants: [
          {
            contract,
            filter: filter as any,
            limit: limit as any,
          },
        ],
      })

      if (!authorization) {
        throw new Error('Unknown authorization type')
      }
    }

    // Expiration set to 10 years.
    const expiration = new Date()
    expiration.setFullYear(expiration.getFullYear() + 10)
    // Encoder needs a whole number of seconds.
    expiration.setMilliseconds(0)

    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      makeStargateMessage({
        stargate: {
          typeUrl: mode === 'grant' ? MsgGrant.typeUrl : MsgRevoke.typeUrl,
          value: {
            ...(mode === 'grant' && authorization
              ? {
                  grant: {
                    authorization,
                    expiration,
                  },
                }
              : {
                  msgTypeUrl,
                }),
            grantee,
            granter: getChainAddressForActionOptions(this.options, chainId),
          },
        },
      })
    )
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    if (
      !isDecodedStargateMsg(decodedMessage, [MsgGrant, MsgRevoke], {
        grantee: {},
        granter: {},
      })
    ) {
      return false
    }

    // Some additional checks on MsgGrant types.
    if (decodedMessage.stargate.typeUrl === MsgGrant.typeUrl) {
      const grant = (decodedMessage.stargate.value as MsgGrant).grant
      const grantAuthorizationTypeUrl =
        grant &&
        // If not auto-decoded, will be Any. This should be the case for the
        // CosmWasm contract authorizations. $typeUrl will be Any which is
        // unhelpful.
        (grant.authorization?.typeUrl ||
          // If auto-decoded, such as Generic or Send, this will be set instead.
          grant.authorization?.$typeUrl)

      if (
        !grant ||
        !grantAuthorizationTypeUrl ||
        !AUTHORIZATION_TYPES.some(
          ({ type }) => type.typeUrl === grantAuthorizationTypeUrl
        )
      ) {
        return false
      }

      if (
        grantAuthorizationTypeUrl === ContractExecutionAuthorization.typeUrl ||
        grantAuthorizationTypeUrl === ContractMigrationAuthorization.typeUrl
      ) {
        const grants: ContractGrant[] = (
          grant.authorization as
            | ContractExecutionAuthorization
            | ContractMigrationAuthorization
        ).grants

        // Supports only one grant.
        if (grants.length !== 1) {
          return false
        }

        const { filter, limit } = grants[0]

        // Type-check. Should always pass until new types are added.
        if (
          !limit?.$typeUrl ||
          !filter?.$typeUrl ||
          !LIMIT_TYPES.some(
            ({ type: { typeUrl } }) => typeUrl === limit.$typeUrl
          ) ||
          !FILTER_TYPES.some(
            ({ type: { typeUrl } }) => typeUrl === filter.$typeUrl
          )
        ) {
          return false
        }
      }
    }

    // Match all MsgRevoke types, no filtering needed.

    return true
  }

  async decode([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<Partial<AuthzGrantRevokeData>> {
    if (decodedMessage.stargate.typeUrl === MsgGrant.typeUrl) {
      const { grant } = decodedMessage.stargate.value as MsgGrant
      const grantAuthorizationTypeUrl =
        grant &&
        // If not auto-decoded, will be Any. This should be the case for the
        // CosmWasm contract authorizations. $typeUrl will be Any which is
        // unhelpful.
        (grant.authorization?.typeUrl ||
          // If auto-decoded, such as Generic or Send, this will be set instead.
          grant.authorization?.$typeUrl)

      const funds =
        grant && grantAuthorizationTypeUrl
          ? grantAuthorizationTypeUrl === SendAuthorization.typeUrl
            ? (grant.authorization as SendAuthorization).spendLimit
            : grantAuthorizationTypeUrl ===
                  ContractExecutionAuthorization.typeUrl ||
                grantAuthorizationTypeUrl ===
                  ContractMigrationAuthorization.typeUrl
              ? (
                  grant.authorization as
                    | ContractExecutionAuthorization
                    | ContractMigrationAuthorization
                ).grants[0]?.limit?.amounts
              : undefined
          : undefined

      const tokens = await Promise.all(
        funds?.map(({ denom }) =>
          this.options.queryClient.fetchQuery(
            tokenQueries.info(this.options.queryClient, {
              chainId,
              type: TokenType.Native,
              denomOrAddress: denom,
            })
          )
        ) || []
      )

      const grantMsg = decodedMessage.stargate.value as MsgGrant
      const authorizationTypeUrl = grantAuthorizationTypeUrl

      // Type-checks. Should already be checked in match.
      if (!authorizationTypeUrl || !grant) {
        throw new Error('Unknown authorization type')
      }

      switch (authorizationTypeUrl) {
        case GenericAuthorization.typeUrl: {
          const msgTypeUrl = (grant.authorization as GenericAuthorization).msg
          return {
            chainId,
            mode: 'grant',
            authorizationTypeUrl,
            customTypeUrl: !ACTION_TYPES.some(
              ({ type: { typeUrl } }) => typeUrl === msgTypeUrl
            ),
            msgTypeUrl,
            grantee: grantMsg.grantee,
          }
        }

        case SendAuthorization.typeUrl: {
          const { spendLimit } = grant.authorization as SendAuthorization

          return {
            chainId,
            mode: 'grant',
            authorizationTypeUrl,
            customTypeUrl: false,
            grantee: grantMsg.grantee,
            funds:
              spendLimit.map(({ denom, amount }) => {
                const decimals =
                  tokens.find((t) => t.denomOrAddress === denom)?.decimals || 0
                return {
                  denom,
                  amount:
                    HugeDecimal.from(amount).toHumanReadableString(decimals),
                  decimals,
                }
              }) ?? [],
          }
        }

        case ContractExecutionAuthorization.typeUrl:
        case ContractMigrationAuthorization.typeUrl: {
          // Supports only one grant.
          const [{ contract, filter, limit }]: ContractGrant[] = (
            grant.authorization as
              | ContractExecutionAuthorization
              | ContractMigrationAuthorization
          ).grants

          // Type-check. Should always pass until new types are added.
          if (!limit?.$typeUrl || !filter?.$typeUrl) {
            throw new Error('Unknown limit or filter type')
          }

          const filterMsgs =
            filter.$typeUrl === AcceptedMessagesFilter.typeUrl
              ? (filter.messages as Uint8Array[]).map((msg) =>
                  JSON.parse(fromUtf8(msg))
                )
              : []

          return {
            chainId,
            mode: 'grant',
            authorizationTypeUrl,
            customTypeUrl: false,
            grantee: decodedMessage.stargate.value.grantee,
            funds:
              limit.amounts?.map(({ denom, amount }) => {
                const decimals =
                  tokens.find((t) => t.denomOrAddress === denom)?.decimals || 0
                return {
                  denom,
                  amount:
                    HugeDecimal.from(amount).toHumanReadableString(decimals),
                  decimals,
                }
              }) ?? [],
            contract,
            filterTypeUrl: filter.$typeUrl,
            filterKeys:
              filter.$typeUrl === AcceptedMessageKeysFilter.typeUrl
                ? filter.keys.join()
                : '',
            filterMsgs: JSON.stringify(
              filterMsgs.length === 0
                ? {}
                : filterMsgs.length === 1
                  ? filterMsgs[0]
                  : filterMsgs,
              null,
              2
            ),
            limitTypeUrl: limit.$typeUrl,
            calls:
              limit.$typeUrl === MaxCallsLimit.typeUrl
                ? Number(limit.remaining)
                : limit.$typeUrl === CombinedLimit.typeUrl
                  ? Number(limit.callsRemaining)
                  : 0,
          }
        }

        default:
          // Should already be checked in match.
          throw new Error('Unknown authorization type')
      }
    } else if (decodedMessage.stargate.typeUrl === MsgRevoke.typeUrl) {
      const msgTypeUrl = decodedMessage.stargate.value.msgTypeUrl

      return {
        chainId,
        mode: 'revoke',
        customTypeUrl: !ACTION_TYPES.some(
          ({ type: { typeUrl } }) => typeUrl === msgTypeUrl
        ),
        grantee: decodedMessage.stargate.value.grantee,
        msgTypeUrl,
      }
    }

    // Should already be checked in match.
    throw new Error('Unknown message type')
  }
}
