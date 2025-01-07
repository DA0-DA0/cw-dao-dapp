import { fromBase64, fromUtf8, toUtf8 } from '@cosmjs/encoding'
import { useQueryClient } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'
import { waitForAll } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  contractQueries,
  genericTokenSelector,
  tokenQueries,
  valenceRebalancerExtraQueries,
  valenceRebalancerQueries,
} from '@dao-dao/state'
import { usdPriceSelector } from '@dao-dao/state/recoil/selectors'
import {
  ActionBase,
  BalanceEmoji,
  ChainProvider,
  DaoSupportedChainPickerInput,
  useActionOptions,
  useCachedLoading,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import {
  AccountType,
  GenericTokenBalance,
  LoadingData,
  TokenType,
  UnifiedCosmosMsg,
  ValenceAccount,
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
import {
  ExecuteMsg as ValenceAccountExecuteMsg,
  InstantiateMsg as ValenceAccountInstantiateMsg,
} from '@dao-dao/types/contracts/ValenceAccount'
import {
  RebalancerData,
  RebalancerUpdateData,
} from '@dao-dao/types/contracts/ValenceRebalancer'
import { MsgInstantiateContract2 } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/tx'
import {
  VALENCE_INSTANTIATE2_SALT,
  VALENCE_SUPPORTED_CHAINS,
  encodeJsonToBase64,
  getAccount,
  getChainAddressForActionOptions,
  getDisplayNameForChainId,
  getSupportedChainConfig,
  isDecodedStargateMsg,
  makeWasmMessage,
  maybeMakePolytoneExecuteMessages,
  mustGetSupportedChainConfig,
  objectMatchesStructure,
  tokensEqual,
} from '@dao-dao/utils'

import { AddressInput } from '../../../../components/AddressInput'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import { useTokenBalances } from '../../../hooks/useTokenBalances'
import {
  ConfigureRebalancerData,
  ConfigureRebalancerComponent as StatelessConfigureRebalancerComponent,
  pidPresets,
} from './Component'

const Component: ActionComponent<undefined, ConfigureRebalancerData> = (
  props
) => {
  const queryClient = useQueryClient()
  const options = useActionOptions()

  const { watch, setValue } = useFormContext<ConfigureRebalancerData>()
  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const selectedTokens = watch((props.fieldNamePrefix + 'tokens') as 'tokens')
  const newValenceAccount =
    watch(
      (props.fieldNamePrefix + 'newValenceAccount') as 'newValenceAccount'
    ) || {}

  const rebalancer = mustGetSupportedChainConfig(chainId).valence?.rebalancer
  const whitelists = useQueryLoadingDataWithError(
    valenceRebalancerExtraQueries.whitelistGenericTokens(
      queryClient,
      rebalancer
        ? {
            chainId,
            address: rebalancer,
          }
        : undefined
    )
  )
  const serviceFee = useQueryLoadingDataWithError(
    valenceRebalancerExtraQueries.rebalancerRegistrationServiceFee(
      queryClient,
      rebalancer
        ? {
            chainId,
            address: rebalancer,
          }
        : undefined
    )
  )

  const minBalanceDenom = watch(
    (props.fieldNamePrefix + 'minBalance.denom') as 'minBalance.denom'
  )
  const minBalanceToken = useCachedLoading(
    minBalanceDenom
      ? genericTokenSelector({
          chainId,
          type: TokenType.Native,
          denomOrAddress: minBalanceDenom,
        })
      : undefined,
    undefined
  )

  const nativeBalances = useTokenBalances({
    filter: TokenType.Native,
    // Ensure chosen tokens are loaded.
    additionalTokens: props.isCreating
      ? undefined
      : (newValenceAccount.funds || []).map(({ denom }) => ({
          chainId,
          type: TokenType.Native,
          denomOrAddress: denom,
        })),
    // Only fetch balances for base/polytone account on Valence chain.
    includeAccountTypes: [AccountType.Base, AccountType.Polytone],
    includeChainIds: [chainId],
  })

  const valenceBalances = useTokenBalances({
    filter: TokenType.Native,
    // Ensure chosen tokens are loaded.
    additionalTokens: selectedTokens.map(({ denom }) => ({
      chainId,
      type: TokenType.Native,
      denomOrAddress: denom,
    })),
    // Only fetch balances for Valence account.
    includeAccountTypes: [AccountType.Valence],
    includeChainIds: [chainId],
  })

  const currentValenceBalances: LoadingData<GenericTokenBalance[]> =
    // If creating new Valence account, use base native tokens that will be used
    // to fund the initial account.
    newValenceAccount.creating
      ? nativeBalances
      : // Otherwise use current Valence account balances.
        valenceBalances.loading
        ? valenceBalances
        : {
            loading: false,
            updating: valenceBalances.updating,
            data: valenceBalances.data.filter(
              ({ token }) => token.chainId === chainId
            ),
          }

  const prices = useCachedLoadingWithError(
    whitelists.loading || whitelists.errored
      ? undefined
      : waitForAll(
          whitelists.data.denoms.map(({ chainId, type, denomOrAddress }) =>
            usdPriceSelector({
              chainId,
              type,
              denomOrAddress,
            })
          )
        ),
    (data) => data.flatMap((data) => data || [])
  )

  return (
    <>
      {options.context.type === ActionContextType.Dao &&
        VALENCE_SUPPORTED_CHAINS.length > 1 && (
          <DaoSupportedChainPickerInput
            className="mb-4"
            disabled={!props.isCreating}
            fieldName={props.fieldNamePrefix + 'chainId'}
            includeChainIds={VALENCE_SUPPORTED_CHAINS}
            onChange={() => {
              // Reset new valence account funds when switching chain.
              setValue(
                (props.fieldNamePrefix +
                  'newValenceAccount.funds') as 'newValenceAccount.funds',
                []
              )
            }}
          />
        )}

      <ChainProvider chainId={chainId}>
        <StatelessConfigureRebalancerComponent
          {...props}
          options={{
            nativeBalances:
              nativeBalances.loading || serviceFee.loading
                ? { loading: true }
                : {
                    loading: false,
                    updating: nativeBalances.updating,
                    data: nativeBalances.data.map(
                      ({ balance: _balance, ...data }) => {
                        // Subtract service fee from balance for corresponding
                        // token to ensure that they leave enough for the fee.
                        // This value is used as the input max.
                        let balance =
                          !serviceFee.errored &&
                          serviceFee.data &&
                          tokensEqual(data.token, serviceFee.data.token)
                            ? HugeDecimal.from(_balance).minus(
                                serviceFee.data.balance
                              )
                            : HugeDecimal.from(_balance)
                        if (balance.lt(0)) {
                          balance = HugeDecimal.zero
                        }

                        return {
                          ...data,
                          balance: balance.toFixed(0),
                        }
                      }
                    ),
                  },
            serviceFee,
            currentValenceBalances,
            baseDenomWhitelistTokens:
              whitelists.loading || whitelists.errored
                ? { loading: true }
                : { loading: false, data: whitelists.data.baseDenoms },
            denomWhitelistTokens:
              whitelists.loading || whitelists.errored
                ? { loading: true }
                : { loading: false, data: whitelists.data.denoms },
            prices,
            minBalanceToken: minBalanceToken.loading
              ? undefined
              : minBalanceToken.data,
            AddressInput,
          }}
        />
      </ChainProvider>
    </>
  )
}

export class ConfigureRebalancerAction extends ActionBase<ConfigureRebalancerData> {
  public readonly key = ActionKey.ConfigureRebalancer
  public readonly Component = Component

  private existingValenceAccount: ValenceAccount | undefined
  private valenceChainId: string

  constructor(options: ActionOptions) {
    super(options, {
      Icon: BalanceEmoji,
      label: options.t('title.configureRebalancer'),
      description: options.t('info.configureRebalancerDescription'),
      notReusable: true,
    })

    this.existingValenceAccount = getAccount({
      accounts: options.context.accounts,
      types: [AccountType.Valence],
    }) as ValenceAccount | undefined
    this.valenceChainId =
      this.existingValenceAccount?.chainId || VALENCE_SUPPORTED_CHAINS[0]
  }

  async setup() {
    const rebalancer = mustGetSupportedChainConfig(this.valenceChainId).valence
      ?.rebalancer
    if (!rebalancer) {
      throw new Error('Missing rebalancer address.')
    }

    const whitelists = await this.options.queryClient.fetchQuery(
      valenceRebalancerExtraQueries.whitelistGenericTokens(
        this.options.queryClient,
        {
          chainId: this.valenceChainId,
          address: rebalancer,
        }
      )
    )

    const rebalancerConfig =
      this.existingValenceAccount?.config?.rebalancer?.config
    const minBalanceTarget = rebalancerConfig?.targets.find(
      ({ min_balance }) => min_balance
    )
    const minBalanceToken = minBalanceTarget
      ? await this.options.queryClient.fetchQuery(
          tokenQueries.info(this.options.queryClient, {
            chainId: this.valenceChainId,
            type: TokenType.Native,
            denomOrAddress: minBalanceTarget.denom,
          })
        )
      : undefined

    const defaultPid: ConfigureRebalancerData['pid'] = rebalancerConfig
      ? {
          kp: Number(rebalancerConfig.pid.p),
          ki: Number(rebalancerConfig.pid.i),
          kd: Number(rebalancerConfig.pid.d),
        }
      : {
          ...pidPresets.find((p) => p.preset === 'medium')!,
        }
    const showCustomPid = !pidPresets.some(
      (preset) =>
        preset.kp === defaultPid.kp &&
        preset.ki === defaultPid.ki &&
        preset.kd === defaultPid.kd
    )

    this.defaults = {
      newValenceAccount: {
        creating: !this.existingValenceAccount,
        funds: [
          {
            denom: 'untrn',
            amount: '10',
            decimals: 6,
          },
        ],
      },
      chainId: this.valenceChainId,
      trustee: rebalancerConfig?.trustee || undefined,
      baseDenom:
        rebalancerConfig?.base_denom || whitelists.baseDenoms[0].denomOrAddress,
      tokens: rebalancerConfig?.targets.map(({ denom, percentage }) => ({
        denom,
        percent: Number(percentage) * 100,
      })) || [
        {
          denom: whitelists.baseDenoms[0].denomOrAddress,
          percent: 50,
        },
        {
          denom: whitelists.baseDenoms[1].denomOrAddress,
          percent: 50,
        },
      ],
      pid: defaultPid,
      showCustomPid,
      maxLimit:
        rebalancerConfig?.max_limit &&
        !isNaN(Number(rebalancerConfig.max_limit))
          ? Number(rebalancerConfig.max_limit) * 100
          : 5,
      minBalance:
        minBalanceTarget?.min_balance && minBalanceToken
          ? {
              denom: minBalanceTarget.denom,
              amount: HugeDecimal.from(
                minBalanceTarget.min_balance
              ).toHumanReadableString(minBalanceToken.decimals),
            }
          : undefined,
      targetOverrideStrategy:
        rebalancerConfig?.target_override_strategy || 'proportional',
    }
  }

  async encode({
    newValenceAccount,
    chainId,
    trustee,
    baseDenom,
    tokens,
    pid,
    maxLimit,
    minBalance,
    targetOverrideStrategy,
  }: ConfigureRebalancerData): Promise<UnifiedCosmosMsg[]> {
    const chainConfig = getSupportedChainConfig(chainId)
    if (!chainConfig?.codeIds?.ValenceAccount || !chainConfig?.valence) {
      throw new Error(this.options.t('error.unsupportedValenceChain'))
    }

    const sender = getChainAddressForActionOptions(this.options, chainId)
    if (!sender) {
      throw new Error(
        this.options.t('error.failedToFindChainAccount', {
          chain: getDisplayNameForChainId(chainId),
        })
      )
    }

    const {
      valence: { rebalancer, servicesManager },
      codeIds: { ValenceAccount },
    } = chainConfig

    const valenceAccountAddress = this.existingValenceAccount
      ? this.existingValenceAccount.address
      : newValenceAccount.creating
        ? // Compute predicted valence account address if we're creating it.
          await this.options.queryClient.fetchQuery(
            contractQueries.instantiate2Address(this.options.queryClient, {
              chainId,
              creator: sender,
              codeId: ValenceAccount,
              salt: VALENCE_INSTANTIATE2_SALT,
            })
          )
        : undefined
    if (!valenceAccountAddress) {
      throw new Error('Missing valence account address.')
    }

    const rebalancerConfig = this.existingValenceAccount
      ? await this.options.queryClient
          .fetchQuery(
            valenceRebalancerQueries.getConfig({
              chainId,
              contractAddress: rebalancer,
              args: {
                addr: valenceAccountAddress,
              },
            })
          )
          // This will error when no rebalancer is configured.
          .catch(() => null)
      : undefined

    const whitelists = await this.options.queryClient.fetchQuery(
      valenceRebalancerExtraQueries.whitelistGenericTokens(
        this.options.queryClient,
        {
          chainId,
          address: rebalancer,
        }
      )
    )

    const msgs: UnifiedCosmosMsg[] = []

    // Add account creation message if valence account does not exist.
    if (!this.existingValenceAccount) {
      const serviceFee = await this.options.queryClient.fetchQuery(
        valenceRebalancerExtraQueries.rebalancerRegistrationServiceFee(
          this.options.queryClient,
          {
            chainId,
            address: rebalancer,
          }
        )
      )

      const convertedFunds = (newValenceAccount.funds || []).map(
        ({ denom, amount, decimals }) =>
          HugeDecimal.fromHumanReadable(amount, decimals).toCoin(denom)
      )

      // Add service fee to funds.
      if (serviceFee && serviceFee.balance !== '0') {
        const existing = convertedFunds.find(
          (f) => f.denom === serviceFee.token.denomOrAddress
        )
        if (existing) {
          existing.amount = HugeDecimal.from(existing.amount)
            .plus(serviceFee.balance)
            .toFixed(0)
        } else {
          convertedFunds.push(
            HugeDecimal.from(serviceFee.balance).toCoin(
              serviceFee.token.denomOrAddress
            )
          )
        }
      }

      msgs.push(
        makeStargateMessage({
          stargate: {
            typeUrl: MsgInstantiateContract2.typeUrl,
            value: MsgInstantiateContract2.fromPartial({
              sender,
              admin: sender,
              codeId: BigInt(ValenceAccount),
              label: 'Valence Account',
              msg: toUtf8(
                JSON.stringify({
                  services_manager: servicesManager,
                } as ValenceAccountInstantiateMsg)
              ),
              funds: convertedFunds
                // Neutron errors with `invalid coins` if the funds list is not
                // alphabetized.
                .sort((a, b) => a.denom.localeCompare(b.denom)),
              salt: toUtf8(VALENCE_INSTANTIATE2_SALT),
              fixMsg: false,
            }),
          },
        })
      )
    }

    msgs.push(
      makeWasmMessage({
        wasm: {
          execute: {
            contract_addr: valenceAccountAddress,
            funds: [],
            msg: {
              // If rebalancer already exists, update it. Otherwise,
              // register it.
              [rebalancerConfig ? 'update_service' : 'register_to_service']: {
                service_name: 'rebalancer',
                data: encodeJsonToBase64({
                  // Common options.
                  ...({
                    base_denom: baseDenom,
                    pid: {
                      p: pid.kp.toString(),
                      i: pid.ki.toString(),
                      d: pid.kd.toString(),
                    },
                    target_override_strategy: targetOverrideStrategy,
                    targets: tokens.map(({ denom, percent }) => ({
                      denom,
                      min_balance:
                        minBalance && minBalance.denom === denom
                          ? HugeDecimal.fromHumanReadable(
                              minBalance.amount,
                              // Should always find this.
                              whitelists.denoms.find(
                                (d) => d.denomOrAddress === denom
                              )?.decimals ?? 0
                            ).toString()
                          : undefined,
                      // BPS
                      bps: percent * 100,
                    })),
                  } as Pick<
                    RebalancerData,
                    keyof RebalancerData & keyof RebalancerUpdateData
                  >),
                  // Differences between data and update.
                  ...(rebalancerConfig
                    ? ({
                        trustee: trustee ? { set: trustee } : 'clear',
                        // BPS
                        max_limit_bps: maxLimit
                          ? { set: maxLimit * 100 }
                          : 'clear',
                      } as Partial<RebalancerUpdateData>)
                    : ({
                        trustee: trustee || null,
                        // BPS
                        max_limit_bps: maxLimit && maxLimit * 100,
                      } as Partial<RebalancerData>)),
                }),
              },
            } as ValenceAccountExecuteMsg,
          },
        },
      })
    )

    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      msgs
    )
  }

  // There are four cases:
  // 1. same-chain valence creation and rebalancer configure
  // 2. same-chain rebalancer configure
  // 3. cross-chain valence creation and rebalancer configure
  // 4. cross-chain rebalancer configure
  async match(_messages: ProcessedMessage[]): Promise<ActionMatch> {
    const isCrossChain = _messages[0].isCrossChain
    const messages = isCrossChain ? _messages[0].wrappedMessages : _messages

    const firstMessageIsCreateValenceAccount =
      !!getSupportedChainConfig(messages[0].account.chainId)?.codeIds
        ?.ValenceAccount &&
      isDecodedStargateMsg(
        messages[0].decodedMessage,
        MsgInstantiateContract2
      ) &&
      fromUtf8(messages[0].decodedMessage.stargate.value.salt) ===
        VALENCE_INSTANTIATE2_SALT

    // Verify configure rebalancer message immediately following. If cross chain
    // message, exactly two should exist since we don't want to match this
    // action if the cross-chain execution does anything else. Otherwise, we
    // need at least two messages.
    const requiredMessageCount = firstMessageIsCreateValenceAccount ? 2 : 1
    if (
      (isCrossChain && messages.length !== requiredMessageCount) ||
      (!isCrossChain && messages.length < requiredMessageCount)
    ) {
      return false
    }

    const {
      decodedMessage,
      account: { chainId },
    } = messages[firstMessageIsCreateValenceAccount ? 1 : 0]

    let serviceName: string | undefined
    let data: RebalancerData | RebalancerUpdateData | undefined
    if (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {},
          },
        },
      })
    ) {
      const serviceData =
        'register_to_service' in decodedMessage.wasm.execute.msg
          ? decodedMessage.wasm.execute.msg.register_to_service
          : 'update_service' in decodedMessage.wasm.execute.msg
            ? decodedMessage.wasm.execute.msg.update_service
            : undefined
      if (
        objectMatchesStructure(serviceData, {
          service_name: {},
          data: {},
        })
      ) {
        serviceName = serviceData.service_name as string
        data = JSON.parse(fromUtf8(fromBase64(serviceData.data as string)))
      }
    }

    if (
      serviceName !== 'rebalancer' ||
      !objectMatchesStructure(data, {
        base_denom: {},
        targets: {},
        pid: {},
        target_override_strategy: {},
      }) ||
      !getSupportedChainConfig(chainId)?.valence?.rebalancer
    ) {
      return false
    }

    // Cross-chain message wraps multiple messages in one, so we only need to
    // match one if this is cross-chain. Otherwise, the create and configure
    // messages will be separate.
    return isCrossChain ? 1 : requiredMessageCount
  }

  async decode(
    _messages: ProcessedMessage[]
  ): Promise<ConfigureRebalancerData> {
    const messages = _messages[0].isCrossChain
      ? _messages[0].wrappedMessages
      : _messages

    const isCreating = messages.length === 2

    // Configure rebalancer message.
    const {
      decodedMessage,
      account: { chainId },
    } = messages[isCreating ? 1 : 0]

    let data: RebalancerData | RebalancerUpdateData | undefined
    if (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {},
          },
        },
      })
    ) {
      const serviceData =
        'register_to_service' in decodedMessage.wasm.execute.msg
          ? decodedMessage.wasm.execute.msg.register_to_service
          : 'update_service' in decodedMessage.wasm.execute.msg
            ? decodedMessage.wasm.execute.msg.update_service
            : undefined
      if (
        objectMatchesStructure(serviceData, {
          service_name: {},
          data: {},
        })
      ) {
        data = JSON.parse(fromUtf8(fromBase64(serviceData.data as string)))
      }
    }

    // Should never happen as this is checked in match.
    if (!data) {
      throw new Error('Missing data.')
    }

    const rebalancer = mustGetSupportedChainConfig(chainId).valence?.rebalancer
    // Should never happen as this is checked in match.
    if (!rebalancer) {
      throw new Error('Missing rebalancer address.')
    }

    const whitelists = await this.options.queryClient.fetchQuery(
      valenceRebalancerExtraQueries.whitelistGenericTokens(
        this.options.queryClient,
        {
          chainId,
          address: rebalancer,
        }
      )
    )

    const kp = Number(data.pid?.p || -1)
    const ki = Number(data.pid?.i || -1)
    const kd = Number(data.pid?.d || -1)

    // Show custom PID fields if no preset found for these settings.
    const showCustomPid = !pidPresets.some(
      (preset) => preset.kp === kp && preset.ki === ki && preset.kd === kd
    )

    // Get target with min balance set.
    const minBalanceTarget = data.targets.find(({ min_balance }) => min_balance)
    const minBalanceToken = minBalanceTarget
      ? await this.options.queryClient.fetchQuery(
          tokenQueries.info(this.options.queryClient, {
            chainId,
            type: TokenType.Native,
            denomOrAddress: minBalanceTarget.denom,
          })
        )
      : undefined

    const newValenceAccountFunds = isCreating
      ? await Promise.all(
          (
            messages[0].decodedMessage.stargate.value as MsgInstantiateContract2
          ).funds.map(async ({ denom, amount }) => {
            const token = await this.options.queryClient.fetchQuery(
              tokenQueries.info(this.options.queryClient, {
                chainId,
                type: TokenType.Native,
                denomOrAddress: denom,
              })
            )

            return {
              denom,
              amount: HugeDecimal.from(amount).toHumanReadableString(
                token.decimals
              ),
              decimals: token.decimals,
            }
          })
        )
      : []

    return {
      newValenceAccount: {
        creating: isCreating,
        funds: newValenceAccountFunds,
        acknowledgedServiceFee: true,
      },
      chainId,
      trustee:
        typeof data.trustee === 'string'
          ? 'update_service' in decodedMessage.wasm.execute.msg &&
            data.trustee === 'clear'
            ? undefined
            : data.trustee
          : 'update_service' in decodedMessage.wasm.execute.msg &&
              typeof data.trustee === 'object' &&
              data.trustee &&
              'set' in data.trustee
            ? data.trustee.set
            : undefined,
      baseDenom: data.base_denom || whitelists.baseDenoms[0].denomOrAddress,
      tokens: data.targets.map(({ denom, bps }) => ({
        denom,
        percent: bps / 100,
      })),
      pid: {
        kp,
        ki,
        kd,
      },
      showCustomPid,
      maxLimit:
        typeof data.max_limit_bps === 'number'
          ? data.max_limit_bps / 100
          : undefined,
      minBalance:
        minBalanceTarget?.min_balance && minBalanceToken
          ? {
              denom: minBalanceTarget.denom,
              amount: HugeDecimal.from(
                minBalanceTarget.min_balance
              ).toHumanReadableString(minBalanceToken.decimals),
            }
          : undefined,
      targetOverrideStrategy: data.target_override_strategy || 'proportional',
    }
  }
}
