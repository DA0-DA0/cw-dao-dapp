import { useQueryClient } from '@tanstack/react-query'
import { ComponentType, useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { constSelector, useRecoilValue } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  neutronQueries,
  nobleQueries,
  skipQueries,
  tokenQueries,
} from '@dao-dao/state/query'
import {
  accountsSelector,
  skipRouteMessageSelector,
  skipRouteSelector,
} from '@dao-dao/state/recoil'
import {
  ActionBase,
  MoneyEmoji,
  useActionOptions,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import {
  AccountType,
  ChainId,
  Duration,
  DurationUnits,
  Entity,
  GenericTokenBalanceWithOwner,
  LoadingData,
  LoadingDataWithError,
  TokenType,
  UnifiedCosmosMsg,
  ValenceAccount,
} from '@dao-dao/types'
import {
  ActionComponentProps,
  ActionContextType,
  ActionEncodeContext,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { makeStargateMessage } from '@dao-dao/types/protobuf'
import { MsgCommunityPoolSpend } from '@dao-dao/types/protobuf/codegen/cosmos/distribution/v1beta1/tx'
import { MsgTransfer } from '@dao-dao/types/protobuf/codegen/ibc/applications/transfer/v1/tx'
import { MsgTransfer as NeutronMsgTransfer } from '@dao-dao/types/protobuf/codegen/neutron/transfer/v1/tx'
import {
  MAINNET,
  convertDurationWithUnitsToSeconds,
  decodeMessage,
  getAccountAddress,
  getChainForChainId,
  getChainForChainName,
  getIbcTransferInfoBetweenChains,
  getIbcTransferInfoFromChannel,
  getPfmChainPathFromMemo,
  getPfmFinalReceiverFromMemo,
  isDecodedStargateMsg,
  isValidBech32Address,
  makeBankMessage,
  makeExecuteSmartContractMessage,
  makeWasmMessage,
  maybeGetChainForChainId,
  maybeGetNativeTokenForChainId,
  maybeMakeIcaExecuteMessages,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
  parseValidPfmMemo,
  transformBech32Address,
} from '@dao-dao/utils'

import { AddressInput } from '../../../../components'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import { useProposalModuleAdapterCommonContextIfAvailable } from '../../../../proposal-module-adapter/react/context'
import { entityQueries } from '../../../../queries/entity'
import { useTokenBalances } from '../../../hooks/useTokenBalances'
import {
  SpendData,
  SpendComponent as StatelessSpendComponent,
} from './Component'

const StatefulSpendComponent: ComponentType<
  ActionComponentProps<undefined, SpendData> & {
    /**
     * Disallow changing the destination chain and address. This is useful if
     * the Spend component is being wrapped by another component.
     */
    noChangeDestination?: boolean
    /**
     * Whether or not to restrict the token options to Valence accounts.
     * Defaults to false.
     */
    fromValence?: boolean
  }
> = (props) => {
  const {
    context,
    address,
    chain: { chainId: currentChainId },
  } = useActionOptions()
  const { watch, setValue, getValues } = useFormContext<SpendData>()
  const queryClient = useQueryClient()

  const fromChainId = watch(
    (props.fieldNamePrefix + 'fromChainId') as 'fromChainId'
  )
  const denom = watch((props.fieldNamePrefix + 'denom') as 'denom')
  const from = watch((props.fieldNamePrefix + 'from') as 'from')
  const recipient = watch((props.fieldNamePrefix + 'to') as 'to')
  const toChainId = watch((props.fieldNamePrefix + 'toChainId') as 'toChainId')
  const amount = watch((props.fieldNamePrefix + 'amount') as 'amount')
  const isCw20 = watch((props.fieldNamePrefix + 'cw20') as 'cw20')
  const useDirectIbcPath = watch(
    (props.fieldNamePrefix + 'useDirectIbcPath') as 'useDirectIbcPath'
  )
  // Loaded on decode after creation.
  const _ibcData = watch((props.fieldNamePrefix + '_ibcData') as '_ibcData')

  const validRecipient =
    !!recipient &&
    isValidBech32Address(recipient, getChainForChainId(toChainId).bech32Prefix)

  const isIbc = !!fromChainId && !!toChainId && fromChainId !== toChainId
  // Only defined if valid PFM memo and chains all have PFM enabled.
  const pfmMemo = _ibcData && parseValidPfmMemo(_ibcData.pfmMemo || '')
  const pfmChainPath =
    isIbc && !props.isCreating && pfmMemo && _ibcData
      ? getPfmChainPathFromMemo(fromChainId, _ibcData.sourceChannel, pfmMemo)
      : undefined

  const loadingAllTokenBalances = useTokenBalances({
    // Load selected token when not creating, in case it is no longer returned
    // in the list of all tokens for the given DAO/wallet.
    additionalTokens: props.isCreating
      ? undefined
      : [
          {
            chainId: fromChainId,
            type: isCw20 ? TokenType.Cw20 : TokenType.Native,
            denomOrAddress: denom,
          },
        ],
    includeAccountTypes: props.fromValence ? [AccountType.Valence] : undefined,
    excludeAccountTypes: props.fromValence ? [] : undefined,
  })

  // Load selected token and ensure fields are up to date when creating in case
  // using custom token input.
  const loadingToken = useQueryLoadingDataWithError(
    fromChainId && denom
      ? tokenQueries.info(queryClient, {
          chainId: fromChainId,
          denomOrAddress: denom,
          // isCw20 not immediately updated for custom tokens.
          type: (
            props.isCreating
              ? isValidBech32Address(
                  denom,
                  maybeGetChainForChainId(fromChainId)?.bech32Prefix
                )
              : isCw20
          )
            ? TokenType.Cw20
            : TokenType.Native,
        })
      : undefined
  )
  useEffect(() => {
    if (!props.isCreating || loadingToken.loading || loadingToken.errored) {
      return
    }

    const isCw20 = getValues((props.fieldNamePrefix + 'cw20') as 'cw20')
    if (isCw20 !== (loadingToken.data.type === TokenType.Cw20)) {
      setValue(
        (props.fieldNamePrefix + 'cw20') as 'cw20',
        loadingToken.data.type === TokenType.Cw20
      )
    }
  }, [
    getValues,
    loadingToken,
    props.fieldNamePrefix,
    props.isCreating,
    setValue,
  ])

  // Should always be defined if in a DAO proposal. Even for a DAO, it may not
  // be defined if being authz executed or something similar.
  const maxVotingPeriodSelector =
    useProposalModuleAdapterCommonContextIfAvailable()?.common?.selectors
      ?.maxVotingPeriod ||
    // If no selector, default to 0 time (likely in authz context).
    constSelector({ time: 0 })
  const proposalModuleMaxVotingPeriod = useRecoilValue(
    context.type === ActionContextType.Dao
      ? maxVotingPeriodSelector || constSelector(undefined)
      : context.type === ActionContextType.Wallet
        ? // Wallets execute transactions right away, so there's no voting delay.
          constSelector({
            time: 0,
          })
        : context.type === ActionContextType.Gov
          ? constSelector({
              // Seconds
              time: context.params.votingPeriod
                ? Number(context.params.votingPeriod.seconds) +
                  context.params.votingPeriod.nanos / 1e9
                : // If no voting period loaded, default to 30 days.
                  30 * 24 * 60 * 60,
            })
          : constSelector(undefined)
  )

  // If creating, use all token balances since they need to choose among them,
  // but once already created, we only need to load the selected token.
  const loadingTokens: LoadingData<GenericTokenBalanceWithOwner[]> =
    props.isCreating
      ? loadingAllTokenBalances
      : loadingToken.loading
        ? loadingToken
        : {
            loading: false,
            updating: loadingToken.updating,
            data: !loadingToken.errored
              ? [
                  {
                    token: loadingToken.data,
                    // Not used once already created.
                    balance: '0',
                    // Only address is checked so the specific account type is not
                    // a big deal.
                    owner: {
                      type: AccountType.Base,
                      chainId: fromChainId,
                      address: from,
                    },
                  },
                ]
              : [],
          }

  const selectedToken = loadingTokens.loading
    ? undefined
    : loadingTokens.data.find(
        ({ token }) =>
          token.chainId === fromChainId && token.denomOrAddress === denom
      )

  const amountIn =
    selectedToken && amount
      ? HugeDecimal.fromHumanReadable(
          amount,
          selectedToken.token.decimals
        ).toString()
      : undefined

  // Get Skip route for IBC transfer.
  const skipRoute = useCachedLoadingWithError(
    isIbc && denom && amountIn
      ? skipRouteSelector({
          fromChainId,
          toChainId,
          sourceDenom: denom,
          amountIn,
        })
      : undefined
  )

  // Get accounts to extract the receiver addresses for the transfer.
  const accounts = useCachedLoadingWithError(
    skipRoute.loading ||
      skipRoute.errored ||
      // Cannot use skip route if more than one TX is required.
      skipRoute.data.txs_required > 1
      ? undefined
      : accountsSelector({
          chainId: currentChainId,
          address,
          // Only need ICA for intermediate accounts.
          includeIcaChains: skipRoute.data.chain_ids.slice(1, -1),
        })
  )
  // Get account for each skip route chain.
  const routeAddresses =
    skipRoute.loading ||
    skipRoute.errored ||
    // Cannot use skip route if more than one TX is required.
    skipRoute.data.txs_required > 1 ||
    accounts.loading ||
    accounts.errored
      ? undefined
      : skipRoute.data.chain_ids.slice(0, -1).map((chainId, index) =>
          // For source, use from address. This should always match the first
          // chain ID.
          index === 0
            ? from
            : // Use profile address if set, falling back to transforming the address (which is unreliable due to different chains using different HD paths).
              context.type === ActionContextType.Wallet
              ? context.profile?.chains[chainId]?.address ||
                transformBech32Address(address, chainId)
              : // Otherwise try to find an account (DAOs and gov).
                getAccountAddress({
                  accounts: accounts.data,
                  chainId,
                  types: [
                    AccountType.Base,
                    AccountType.Polytone,
                    AccountType.Ica,
                  ],
                })
        )
  // Get missing accounts for skip route.
  const missingAccountChainIds =
    !routeAddresses || skipRoute.loading || skipRoute.errored
      ? undefined
      : routeAddresses.flatMap((address, index) =>
          address ? [] : [skipRoute.data.chain_ids[index]]
        )

  // Load Skip route message if IBC transfer.
  const skipRouteMessageLoading = useCachedLoadingWithError(
    isIbc &&
      props.isCreating &&
      denom &&
      amountIn &&
      !skipRoute.loading &&
      !skipRoute.errored &&
      // Can only use skip route if only one TX is required.
      skipRoute.data.txs_required === 1 &&
      routeAddresses &&
      missingAccountChainIds &&
      missingAccountChainIds.length === 0 &&
      validRecipient
      ? skipRouteMessageSelector({
          chainAddresses: routeAddresses.reduce(
            (acc, address, index) => ({
              ...acc,
              [skipRoute.data.chain_ids[index]]: address,
            }),
            {} as Record<string, string | undefined>
          ),
          fromChainId,
          toChainId,
          toAddress: recipient,
          sourceDenom: denom,
          amountIn,
        })
      : undefined
  )

  // Get the IBC path.
  const ibcPath: LoadingDataWithError<string[]> = isIbc
    ? props.isCreating && skipRoute.loading
      ? {
          loading: true,
          errored: false,
        }
      : props.isCreating &&
          !useDirectIbcPath &&
          !skipRoute.loading &&
          !skipRoute.errored &&
          // Can only use skip route if only one TX is required.
          skipRoute.data.txs_required === 1 &&
          // Only use skip IBC path if loads message successfully.
          !skipRouteMessageLoading.loading &&
          !skipRouteMessageLoading.errored
        ? {
            loading: false,
            errored: false,
            updating: skipRoute.updating,
            data: skipRoute.data.chain_ids,
          }
        : !props.isCreating && pfmChainPath?.length
          ? {
              loading: false,
              errored: false,
              data: pfmChainPath,
            }
          : // Fallback to just showing one hop if failed to load actual path.
            {
              loading: false,
              errored: false,
              updating: false,
              data: [fromChainId, toChainId],
            }
    : // Not IBC.
      {
        loading: true,
        errored: false,
      }
  // Get the amount out from an IBC path.
  const ibcAmountOut: LoadingDataWithError<HugeDecimal | undefined> = isIbc
    ? skipRoute.loading || !selectedToken
      ? {
          loading: true,
          errored: false,
        }
      : skipRoute.errored
        ? {
            loading: false,
            errored: true,
            error: skipRoute.error,
          }
        : {
            loading: false,
            errored: false,
            updating: skipRoute.updating,
            data: HugeDecimal.from(skipRoute.data.amount_out),
          }
    : {
        loading: false,
        errored: false,
        updating: false,
        data: undefined,
      }

  // Compute chain fees.
  const nobleTariff = useQueryLoadingDataWithError(
    ibcPath.loading || ibcPath.errored
      ? undefined
      : MAINNET &&
          // If selected token is from Noble.
          selectedToken &&
          selectedToken.token.source.chainId === ChainId.NobleMainnet &&
          // If Noble is one of the non-destination chains, meaning it will be
          // transferred out of Noble at some point.
          ibcPath.data.slice(0, -1).includes(ChainId.NobleMainnet)
        ? nobleQueries.ibcTransferFee()
        : undefined
  )
  const neutronTransferFee = useQueryLoadingDataWithError(
    ibcPath.loading || ibcPath.errored
      ? undefined
      : MAINNET &&
          // If Neutron is one of the non-destination chains, meaning it will be
          // transferred out of Neutron at some point.
          ibcPath.data.slice(0, -1).includes(ChainId.NeutronMainnet)
        ? neutronQueries.ibcTransferFee(queryClient)
        : undefined
  )

  // Store skip route message once loaded successfully during creation.
  useEffect(() => {
    if (!props.isCreating) {
      return
    }

    if (!isIbc) {
      setValue(
        (props.fieldNamePrefix +
          '_skipIbcTransferMsg') as '_skipIbcTransferMsg',
        undefined
      )
    } else {
      setValue(
        (props.fieldNamePrefix +
          '_skipIbcTransferMsg') as '_skipIbcTransferMsg',
        skipRouteMessageLoading
      )
    }
  }, [
    skipRouteMessageLoading,
    props.fieldNamePrefix,
    setValue,
    isIbc,
    props.isCreating,
  ])

  const [currentEntity, setCurrentEntity] = useState<Entity | undefined>()
  const loadingEntity = useQueryLoadingDataWithError(
    entityQueries.info(
      queryClient,
      validRecipient
        ? {
            address: recipient,
            chainId: toChainId,
          }
        : undefined
    )
  )
  // Cache last successfully loaded entity.
  useEffect(() => {
    if (loadingEntity.loading || loadingEntity.errored) {
      return
    }

    setCurrentEntity(loadingEntity.data)
  }, [loadingEntity])

  return (
    <StatelessSpendComponent
      {...props}
      options={{
        tokens: loadingTokens,
        token: loadingToken,
        currentEntity,
        ibcPath,
        ibcAmountOut,
        betterNonPfmIbcPath:
          skipRoute.loading || skipRoute.errored
            ? { loading: true }
            : {
                loading: false,
                data:
                  skipRoute.data.txs_required === 1
                    ? undefined
                    : skipRoute.data.chain_ids,
              },
        missingAccountChainIds,
        nobleTariff,
        neutronTransferFee:
          neutronTransferFee.loading || neutronTransferFee.errored
            ? neutronTransferFee
            : {
                loading: false,
                errored: false,
                updating: neutronTransferFee.updating,
                data: neutronTransferFee.data?.sum,
              },
        proposalModuleMaxVotingPeriodInBlocks:
          !!proposalModuleMaxVotingPeriod &&
          'blocks' in proposalModuleMaxVotingPeriod,
        AddressInput,
        noChangeDestination: props.noChangeDestination,
      }}
    />
  )
}

export class SpendAction extends ActionBase<SpendData> {
  public readonly key: ActionKey = ActionKey.Spend
  public Component = StatefulSpendComponent

  constructor(options: ActionOptions) {
    super(options, {
      Icon: MoneyEmoji,
      label: options.t('title.spend'),
      description: options.t('info.spendActionDescription', {
        context: options.context.type,
      }),
      // Some actions use Spend under the hood, like Fund and Withdraw
      // Rebalancer.
      matchPriority: -1,
    })

    const nativeToken = maybeGetNativeTokenForChainId(
      this.options.chain.chainId
    )

    this.defaults = {
      fromChainId: this.options.chain.chainId,
      toChainId: this.options.chain.chainId,
      from: this.options.address,
      to: '',
      amount: '1',
      denom: nativeToken?.denomOrAddress || '',
      cw20: nativeToken?.type === TokenType.Cw20,
      ibcTimeout: {
        value: 1,
        units: DurationUnits.Weeks,
      },
    }
  }

  async encode(
    {
      fromChainId,
      toChainId,
      from,
      to,
      amount: _amount,
      denom,
      cw20,
      ibcTimeout,
      useDirectIbcPath,
      _skipIbcTransferMsg,
    }: SpendData,
    encodeContext: ActionEncodeContext
  ): Promise<UnifiedCosmosMsg | UnifiedCosmosMsg[]> {
    const { decimals } = await this.options.queryClient.fetchQuery(
      tokenQueries.info(this.options.queryClient, {
        chainId: fromChainId,
        denomOrAddress: denom,
        type: cw20 ? TokenType.Cw20 : TokenType.Native,
      })
    )
    const amount = HugeDecimal.fromHumanReadable(_amount, decimals)

    // Gov module community pool spend.
    if (this.options.context.type === ActionContextType.Gov) {
      return makeStargateMessage({
        stargate: {
          typeUrl: MsgCommunityPoolSpend.typeUrl,
          value: MsgCommunityPoolSpend.fromPartial({
            authority: this.options.address,
            recipient: to,
            amount: amount.toCoins(denom),
          }),
        },
      })
    }

    let spendAccount = this.options.context.accounts.find(
      (a) => a.chainId === fromChainId && a.address === from
    )
    // Should never happen.
    if (!spendAccount) {
      throw new Error(this.options.t('error.failedToFindSpendingAccount'))
    }

    let msg: UnifiedCosmosMsg | undefined
    // IBC transfer of native token.
    if (!cw20 && toChainId !== fromChainId) {
      // Load voting period so we can add the IBC timeout to it.
      const maxVotingPeriod: Duration =
        // If in a DAO proposal, load voting period from proposal module.
        (encodeContext.type === ActionContextType.Dao &&
          encodeContext.proposalModule &&
          (await encodeContext.proposalModule.getMaxVotingPeriod())) ||
        (encodeContext.type === ActionContextType.Gov
          ? {
              // Seconds
              time: encodeContext.params.votingPeriod
                ? Number(encodeContext.params.votingPeriod.seconds) +
                  encodeContext.params.votingPeriod.nanos / 1e9
                : // If no voting period loaded, default to 30 days.
                  30 * 24 * 60 * 60,
            }
          : // If not in DAO with a proposal module, and not in gov, default to 0. This is probably a wallet, which executes transactions immediately.
            { time: 0 })

      // Default to conservative 30 days if no IBC timeout is set for some
      // reason. This should never happen.
      const timeoutSeconds = ibcTimeout
        ? convertDurationWithUnitsToSeconds(ibcTimeout)
        : 30 * 24 * 60 * 60
      // Convert seconds to nanoseconds.
      const timeoutTimestamp = BigInt(
        Date.now() * 1e6 +
          // Add timeout to voting period if it's a time duration.
          ((!('time' in maxVotingPeriod) ? 0 : maxVotingPeriod.time) +
            timeoutSeconds) *
            1e9
      )

      // If no Skip IBC msg or it errored or disabled, use single-hop IBC
      // transfer.
      if (
        useDirectIbcPath ||
        !_skipIbcTransferMsg ||
        _skipIbcTransferMsg.loading ||
        _skipIbcTransferMsg.errored
      ) {
        const { sourceChannel } = getIbcTransferInfoBetweenChains(
          fromChainId,
          toChainId
        )
        msg = makeStargateMessage({
          stargate: {
            typeUrl:
              fromChainId === ChainId.NeutronMainnet ||
              fromChainId === ChainId.NeutronTestnet
                ? NeutronMsgTransfer.typeUrl
                : MsgTransfer.typeUrl,
            value: {
              sourcePort: 'transfer',
              sourceChannel,
              token: amount.toCoin(denom),
              sender: from,
              receiver: to,
              timeoutTimestamp,
              memo: '',
              // Add Neutron IBC transfer fee if sending from Neutron.
              ...((fromChainId === ChainId.NeutronMainnet ||
                fromChainId === ChainId.NeutronTestnet) && {
                fee: (
                  await this.options.queryClient.fetchQuery(
                    neutronQueries.ibcTransferFee(this.options.queryClient)
                  )
                )?.fee,
              }),
            } as NeutronMsgTransfer,
          },
        })
      } else {
        if (
          _skipIbcTransferMsg.data.msg_type_url !== MsgTransfer.typeUrl &&
          _skipIbcTransferMsg.data.msg_type_url !== NeutronMsgTransfer.typeUrl
        ) {
          throw new Error(
            `Unexpected Skip transfer message type: ${_skipIbcTransferMsg.data.msg_type_url}`
          )
        }

        const skipTransferMsgValue = JSON.parse(_skipIbcTransferMsg.data.msg)
        msg = makeStargateMessage({
          stargate: {
            typeUrl:
              fromChainId === ChainId.NeutronMainnet ||
              fromChainId === ChainId.NeutronTestnet
                ? NeutronMsgTransfer.typeUrl
                : MsgTransfer.typeUrl,
            value: {
              ...(fromChainId === ChainId.NeutronMainnet ||
              fromChainId === ChainId.NeutronTestnet
                ? NeutronMsgTransfer
                : MsgTransfer
              ).fromAmino({
                ...skipTransferMsgValue,
                // Replace all forwarding timeouts with our own. If no memo,
                // use empty string. This will be undefined if PFM is not
                // used and it's only a single hop.
                memo:
                  (typeof skipTransferMsgValue.memo === 'string' &&
                    skipTransferMsgValue.memo.replace(
                      /"timeout":\d+/g,
                      `"timeout":${timeoutTimestamp.toString()}`
                    )) ||
                  '',
                timeout_timestamp: timeoutTimestamp,
                timeout_height: undefined,
              }),
              // Add Neutron IBC transfer fee if sending from Neutron.
              ...((fromChainId === ChainId.NeutronMainnet ||
                fromChainId === ChainId.NeutronTestnet) && {
                fee: (
                  await this.options.queryClient.fetchQuery(
                    neutronQueries.ibcTransferFee(this.options.queryClient)
                  )
                )?.fee,
              }),
            },
          },
        })
      }
    } else if (!cw20) {
      msg = {
        bank: makeBankMessage(amount.toString(), to, denom),
      }
    } else {
      msg = makeWasmMessage({
        wasm: {
          execute: {
            contract_addr: denom,
            funds: [],
            msg: {
              transfer: {
                recipient: to,
                amount: amount.toString(),
              },
            },
          },
        },
      })
    }

    // If spending from Valence account, perform admin execute.
    if (spendAccount.type === AccountType.Valence) {
      // Only the Valence account admin can withdraw funds.
      const valenceAdmin = this.options.context.accounts.find(
        (a) =>
          spendAccount &&
          a.chainId === spendAccount.chainId &&
          a.address === (spendAccount as ValenceAccount).config.admin
      )
      if (!valenceAdmin) {
        throw new Error('Valence account owner not found')
      }

      // Wrap message in Valence admin execute.
      msg = makeExecuteSmartContractMessage({
        chainId: spendAccount.chainId,
        contractAddress: spendAccount.address,
        sender: valenceAdmin.address,
        msg: {
          execute_by_admin: {
            msgs: [msg],
          },
        },
      })
      // Change spend account to Valence admin.
      spendAccount = valenceAdmin
    }

    return spendAccount.type === AccountType.Ica
      ? maybeMakeIcaExecuteMessages(
          this.options.chain.chainId,
          fromChainId,
          this.options.address,
          spendAccount.address,
          msg
        )
      : maybeMakePolytoneExecuteMessages(
          this.options.chain.chainId,
          fromChainId,
          msg
        )
  }

  async match([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<ActionMatch> {
    // Unwrap Valence admin execute message.
    if (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              execute_by_admin: {
                msgs: [{}],
              },
            },
          },
        },
      })
    ) {
      decodedMessage = decodeMessage(
        decodedMessage.wasm.execute.msg.execute_by_admin.msgs[0]
      )
    }

    const isNative = objectMatchesStructure(decodedMessage, {
      bank: {
        send: {
          amount: [
            {
              amount: {},
              denom: {},
            },
          ],
          to_address: {},
        },
      },
    })

    const isCw20 = objectMatchesStructure(decodedMessage, {
      wasm: {
        execute: {
          contract_addr: {},
          msg: {
            transfer: {
              recipient: {},
              amount: {},
            },
          },
        },
      },
    })

    const isIbcTransfer =
      isDecodedStargateMsg(decodedMessage, [MsgTransfer, NeutronMsgTransfer], {
        sourcePort: {},
        sourceChannel: {},
        token: {},
        sender: {},
        receiver: {},
      }) && decodedMessage.stargate.value.sourcePort === 'transfer'

    // Try to parse packet-forward-middleware memo.
    const pfmMemo =
      isIbcTransfer && decodedMessage.stargate.value.memo
        ? parseValidPfmMemo(decodedMessage.stargate.value.memo)
        : undefined

    // If valid PFM memo, validate that all chains (except the receiver) have
    // enabled PFM.
    const pfmChainPath =
      pfmMemo &&
      getPfmChainPathFromMemo(
        chainId,
        decodedMessage.stargate.value.sourceChannel,
        pfmMemo
      )

    const hasPfmChainPath = pfmChainPath && pfmChainPath.length > 1
    const allChainsExceptReceiverPfmEnabled = hasPfmChainPath
      ? (
          await Promise.all(
            pfmChainPath.slice(0, -1).map((chainId) =>
              this.options.queryClient.fetchQuery(
                skipQueries.chainPfmEnabled(this.options.queryClient, {
                  chainId,
                })
              )
            )
          )
        ).every(Boolean)
      : false

    return (
      isNative ||
      isCw20 ||
      // If chains don't have PFM enabled, this may be a malicious spend.
      (isIbcTransfer && (!hasPfmChainPath || allChainsExceptReceiverPfmEnabled))
    )
  }

  async decode([
    {
      decodedMessage,
      account: { chainId, address: from },
    },
  ]: ProcessedMessage[]): Promise<SpendData> {
    // Unwrap Valence admin execute message.
    if (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              execute_by_admin: {
                msgs: [{}],
              },
            },
          },
        },
      })
    ) {
      from = decodedMessage.wasm.execute.contract_addr
      decodedMessage = decodeMessage(
        decodedMessage.wasm.execute.msg.execute_by_admin.msgs[0]
      )
    }

    const isNative = objectMatchesStructure(decodedMessage, {
      bank: {
        send: {
          amount: [
            {
              amount: {},
              denom: {},
            },
          ],
          to_address: {},
        },
      },
    })

    const isIbcTransfer =
      isDecodedStargateMsg(decodedMessage, [MsgTransfer, NeutronMsgTransfer], {
        sourcePort: {},
        sourceChannel: {},
        token: {},
        sender: {},
        receiver: {},
      }) && decodedMessage.stargate.value.sourcePort === 'transfer'

    const token = await this.options.queryClient.fetchQuery(
      tokenQueries.info(this.options.queryClient, {
        chainId,
        type: isNative || isIbcTransfer ? TokenType.Native : TokenType.Cw20,
        denomOrAddress: isIbcTransfer
          ? decodedMessage.stargate.value.token.denom
          : isNative
            ? decodedMessage.bank.send.amount[0].denom
            : // isCw20
              decodedMessage.wasm.execute.contract_addr,
      })
    )

    // Try to parse packet-forward-middleware memo.
    const pfmMemo =
      isIbcTransfer && decodedMessage.stargate.value.memo
        ? parseValidPfmMemo(decodedMessage.stargate.value.memo)
        : undefined
    const pfmChainPath =
      pfmMemo &&
      getPfmChainPathFromMemo(
        chainId,
        decodedMessage.stargate.value.sourceChannel,
        pfmMemo
      )

    if (isIbcTransfer) {
      const toChainId = pfmChainPath
        ? pfmChainPath[pfmChainPath.length - 1]
        : getChainForChainName(
            // Get destination chain of hop.
            getIbcTransferInfoFromChannel(
              chainId,
              decodedMessage.stargate.value.sourceChannel
            ).destinationChain.chain_name
          ).chainId
      const to = pfmChainPath
        ? getPfmFinalReceiverFromMemo(pfmMemo)
        : decodedMessage.stargate.value.receiver

      return {
        fromChainId: chainId,
        toChainId,
        from,
        to,
        amount: HugeDecimal.from(
          decodedMessage.stargate.value.token.amount
        ).toHumanReadableString(token.decimals),
        denom: token.denomOrAddress,
        // Should always be false.
        cw20: token.type === TokenType.Cw20,

        // Nanoseconds to milliseconds.
        _absoluteIbcTimeout: Number(
          BigInt(decodedMessage.stargate.value.timeoutTimestamp) / BigInt(1e6)
        ),

        _ibcData: {
          sourceChannel: decodedMessage.stargate.value.sourceChannel,
          pfmMemo: pfmMemo && JSON.stringify(pfmMemo),
        },
      }
    } else if (token.type === TokenType.Native) {
      return {
        fromChainId: chainId,
        toChainId: chainId,
        from,
        to: decodedMessage.bank.send.to_address,
        amount: HugeDecimal.from(
          decodedMessage.bank.send.amount[0].amount
        ).toHumanReadableString(token.decimals),
        denom: token.denomOrAddress,
        cw20: false,
      }
    } else if (token.type === TokenType.Cw20) {
      return {
        fromChainId: chainId,
        toChainId: chainId,
        from,
        to: decodedMessage.wasm.execute.msg.transfer.recipient,
        amount: HugeDecimal.from(
          decodedMessage.wasm.execute.msg.transfer.amount
        ).toHumanReadableString(token.decimals),
        denom: decodedMessage.wasm.execute.contract_addr,
        cw20: true,
      }
    }

    throw new Error('Failed to decode spend message')
  }

  transformImportData(data: any): SpendData {
    return {
      ...data,
      // Ensure amount is a string.
      amount: HugeDecimal.from(data.amount).toString(),
    }
  }
}
