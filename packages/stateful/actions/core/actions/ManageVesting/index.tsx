import { useQueries, useQueryClient } from '@tanstack/react-query'
import { ComponentType, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  chainQueries,
  cw1WhitelistExtraQueries,
  cwPayrollFactoryQueries,
  cwVestingExtraQueries,
  tokenQueries,
} from '@dao-dao/state/query'
import {
  ActionBase,
  Loader,
  MoneyWingsEmoji,
  SegmentedControls,
  useActionOptions,
} from '@dao-dao/stateless'
import {
  DurationUnits,
  DurationWithUnits,
  SegmentedControlsProps,
  TokenType,
  TypedOption,
  UnifiedCosmosMsg,
  VestingContractVersion,
  VestingInfo,
  VestingPaymentsWidgetData,
  WidgetId,
} from '@dao-dao/types'
import {
  ActionComponent,
  ActionComponentProps,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  ExecuteMsg,
  InstantiateNativePayrollContractMsg,
} from '@dao-dao/types/contracts/CwPayrollFactory'
import { InstantiateMsg as VestingInstantiateMsg } from '@dao-dao/types/contracts/CwVesting'
import {
  chainIsIndexed,
  convertDurationWithUnitsToSeconds,
  convertSecondsToDurationWithUnits,
  decodeJsonFromBase64,
  encodeJsonToBase64,
  getChainAddressForActionOptions,
  getDaoWidgets,
  getDisplayNameForChainId,
  getNativeTokenForChainId,
  isValidBech32Address,
  makeCombineQueryResultsIntoLoadingDataWithError,
  makeExecuteSmartContractMessage,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  AddressInput,
  EntityDisplay,
  SuspenseLoader,
  Trans,
  VestingPaymentCard,
} from '../../../../components'
import {
  useCreateCw1Whitelist,
  useQueryLoadingData,
  useQueryLoadingDataWithError,
} from '../../../../hooks'
import { useWidget } from '../../../../widgets'
import { useTokenBalances } from '../../../hooks/useTokenBalances'
import { BeginVesting, BeginVestingData } from './BeginVesting'
import { CancelVesting, CancelVestingData } from './CancelVesting'
import { RegisterSlash, RegisterSlashData } from './RegisterSlash'

export type ManageVestingData = {
  mode: 'begin' | 'cancel' | 'registerSlash'
  begin: BeginVestingData
  cancel: CancelVestingData
  registerSlash: RegisterSlashData
}

const instantiateStructure = {
  instantiate_msg: {
    denom: {},
    recipient: {},
    schedule: {},
    title: {},
    total: {},
    unbonding_duration_seconds: {},
    vesting_duration_seconds: {},
  },
  label: {},
}

/**
 * Get vesting sources from widget data.
 */
const getVestingSourcesFromWidgetData = (
  options: ActionOptions,
  widgetData: VestingPaymentsWidgetData
) =>
  widgetData.factories
    ? Object.fromEntries(
        Object.entries(widgetData.factories).map(
          ([chainId, { address: factory, version }]) => [
            chainId,
            {
              owner: getChainAddressForActionOptions(options, chainId) || '',
              factory,
              version,
            },
          ]
        )
      )
    : // If the factories are undefined, this DAO is using an old version
      // of the vesting widget which only allows a single factory on the
      // same chain as the DAO. If widget data is undefined, this is being
      // used by a wallet.
      {
        [options.chain.chainId]: {
          owner: options.address,
          factory: widgetData.factory,
          version: widgetData.version,
        },
      }

/**
 * Get queries for the vesting infos owned by (and thus can be canceled by) the
 * current entity using this action, unless the chain is not indexed, in which
 * case fetch from the registered factories. These vests may or may not have
 * been created by the current entity, since someone can set another entity as
 * an owner/canceler of a vesting contract.
 */
const getVestingInfosOwnedByEntityQueries = (
  options: ActionOptions,
  widgetData?: VestingPaymentsWidgetData
) => {
  const sources =
    widgetData && getVestingSourcesFromWidgetData(options, widgetData)
  return options.context.accounts.flatMap(({ chainId, address }) =>
    chainIsIndexed(chainId)
      ? cwVestingExtraQueries.vestingInfosOwnedBy(options.queryClient, {
          address,
          chainId,
        })
      : // Fallback to factory query for this chain if no indexer. This is limited as vesting payments created by other entities will not load, even if the current entity has the power to cancel.
        sources?.[chainId]?.factory
        ? cwVestingExtraQueries.vestingInfosForFactory(options.queryClient, {
            chainId,
            address: sources[chainId].factory!,
          })
        : []
  )
}

/**
 * Get the vesting infos owned by (and thus can be canceled by) the current
 * entity executing an action. These may or may not have been created by the
 * current entity, since someone can set another entity as an owner/canceler of
 * a vesting contract.
 */
const useVestingInfosOwnedByEntity = () => {
  const options = useActionOptions()
  return useQueries({
    queries: getVestingInfosOwnedByEntityQueries(options),
    combine: makeCombineQueryResultsIntoLoadingDataWithError({
      transform: (infos) => infos.flat(),
    }),
  })
}

const Component: ComponentType<
  ActionComponentProps<undefined, ManageVestingData> & {
    widgetData?: VestingPaymentsWidgetData
  }
> = ({ widgetData, ...props }) => {
  const { t } = useTranslation()
  const {
    chain: { chainId: nativeChainId },
  } = useActionOptions()

  const { setValue, watch, setError, clearErrors, trigger } =
    useFormContext<ManageVestingData>()
  const mode = watch((props.fieldNamePrefix + 'mode') as 'mode')
  const selectedChainId =
    mode === 'begin'
      ? watch((props.fieldNamePrefix + 'begin.chainId') as 'begin.chainId')
      : mode === 'registerSlash'
        ? watch(
            (props.fieldNamePrefix +
              'registerSlash.chainId') as 'registerSlash.chainId'
          )
        : mode === 'cancel'
          ? watch(
              (props.fieldNamePrefix + 'cancel.chainId') as 'cancel.chainId'
            )
          : undefined
  const selectedAddress =
    mode === 'registerSlash'
      ? watch(
          (props.fieldNamePrefix +
            'registerSlash.address') as 'registerSlash.address'
        )
      : mode === 'cancel'
        ? watch((props.fieldNamePrefix + 'cancel.address') as 'cancel.address')
        : undefined
  const beginOwnerMode = watch(
    (props.fieldNamePrefix + 'begin.ownerMode') as 'begin.ownerMode'
  )
  const beginManyOwnersCw1WhitelistContract = watch(
    (props.fieldNamePrefix +
      'begin.manyOwnersCw1WhitelistContract') as 'begin.manyOwnersCw1WhitelistContract'
  )

  const tokenBalances = useTokenBalances()

  // Only used on pre-v1 vesting widgets.
  const queryClient = useQueryClient()
  const preV1VestingFactoryOwner = useQueryLoadingDataWithError(
    widgetData && !widgetData.version && widgetData.factory
      ? cwPayrollFactoryQueries.ownership(queryClient, {
          chainId: nativeChainId,
          contractAddress: widgetData.factory,
        })
      : undefined,
    ({ owner }) => owner || null
  )

  const vestingInfos = useVestingInfosOwnedByEntity()

  const didSelectVest =
    !props.isCreating &&
    (mode === 'registerSlash' || mode === 'cancel') &&
    !!selectedChainId &&
    !!selectedAddress
  const selectedVest = useQueryLoadingData(
    didSelectVest
      ? cwVestingExtraQueries.info(queryClient, {
          chainId: selectedChainId,
          address: selectedAddress,
        })
      : undefined,
    undefined as VestingInfo | undefined
  )

  // Prevent action from being submitted if no address is selected while we're
  // registering slash or cancelling.
  useEffect(() => {
    if (mode !== 'registerSlash' && mode !== 'cancel') {
      clearErrors(
        (props.fieldNamePrefix +
          'registerSlash.address') as 'registerSlash.address'
      )
      clearErrors(
        (props.fieldNamePrefix + 'cancel.address') as 'cancel.address'
      )
      return
    }
    // Make sure to clear errors for other modes on switch.
    else if (mode === 'registerSlash') {
      clearErrors(
        (props.fieldNamePrefix + 'cancel.address') as 'cancel.address'
      )
    } else if (mode === 'cancel') {
      clearErrors(
        (props.fieldNamePrefix +
          'registerSlash.address') as 'registerSlash.address'
      )
    }

    if (!selectedAddress || !isValidBech32Address(selectedAddress)) {
      setError(
        (props.fieldNamePrefix + `${mode}.address`) as `${typeof mode}.address`,
        {
          type: 'manual',
          message: t('error.noVestingContractSelected'),
        }
      )
    } else {
      clearErrors(
        (props.fieldNamePrefix + `${mode}.address`) as `${typeof mode}.address`
      )
    }
  }, [setError, clearErrors, props.fieldNamePrefix, t, mode, selectedAddress])

  const tabs: SegmentedControlsProps<ManageVestingData['mode']>['tabs'] = [
    // Only allow beginning a vest if widget is setup.
    ...(widgetData
      ? ([
          {
            label: t('title.beginVesting'),
            value: 'begin',
          },
        ] as TypedOption<ManageVestingData['mode']>[])
      : []),
    {
      label: t('title.cancelVesting'),
      value: 'cancel',
    },
    {
      label: t('title.registerSlash'),
      value: 'registerSlash',
    },
  ]
  const selectedTab = tabs.find((tab) => tab.value === mode)

  const {
    creatingCw1Whitelist: creatingCw1WhitelistOwners,
    createCw1Whitelist: createCw1WhitelistOwners,
  } = useCreateCw1Whitelist({
    // Trigger veto address field validations.
    validation: async () => {
      if (beginOwnerMode !== 'many') {
        throw new Error(t('error.unexpectedError'))
      }

      await trigger(
        (props.fieldNamePrefix + 'begin.manyOwners') as 'begin.manyOwners',
        {
          shouldFocus: true,
        }
      )
    },
    contractLabel: 'Vesting Multi-Owner cw1-whitelist',
  })

  // Prevent action from being submitted if the cw1-whitelist contract has not
  // yet been created and it needs to be.
  useEffect(() => {
    if (beginOwnerMode === 'many' && !beginManyOwnersCw1WhitelistContract) {
      setError(
        (props.fieldNamePrefix +
          'begin.manyOwnersCw1WhitelistContract') as 'begin.manyOwnersCw1WhitelistContract',
        {
          type: 'manual',
          message: t('error.accountListNeedsSaving'),
        }
      )
    } else {
      clearErrors(
        (props.fieldNamePrefix +
          'begin.manyOwnersCw1WhitelistContract') as 'begin.manyOwnersCw1WhitelistContract'
      )
    }
  }, [
    setError,
    clearErrors,
    t,
    beginOwnerMode,
    beginManyOwnersCw1WhitelistContract,
    props.fieldNamePrefix,
  ])

  return (
    <SuspenseLoader
      fallback={<Loader />}
      forceFallback={
        // Manually trigger loader.
        tokenBalances.loading
      }
    >
      {props.isCreating ? (
        <SegmentedControls<ManageVestingData['mode']>
          className="mb-2"
          onSelect={(value) =>
            setValue((props.fieldNamePrefix + 'mode') as 'mode', value)
          }
          selected={mode}
          tabs={tabs}
        />
      ) : (
        <p className="title-text mb-2">{selectedTab?.label}</p>
      )}

      {mode === 'begin' ? (
        <BeginVesting
          {...props}
          errors={props.errors?.begin}
          fieldNamePrefix={props.fieldNamePrefix + 'begin.'}
          options={{
            widgetData,
            tokens: tokenBalances.loading ? [] : tokenBalances.data,
            preV1VestingFactoryOwner,
            AddressInput,
            EntityDisplay,
            createCw1WhitelistOwners,
            creatingCw1WhitelistOwners,
          }}
        />
      ) : mode === 'registerSlash' ? (
        <RegisterSlash
          {...props}
          errors={props.errors?.registerSlash}
          fieldNamePrefix={props.fieldNamePrefix + 'registerSlash.'}
          options={{
            vestingInfos,
            selectedVest: didSelectVest
              ? selectedVest
              : {
                  loading: false,
                  data: undefined,
                },
            EntityDisplay,
            Trans,
          }}
        />
      ) : mode === 'cancel' ? (
        <CancelVesting
          {...props}
          errors={props.errors?.cancel}
          fieldNamePrefix={props.fieldNamePrefix + 'cancel.'}
          options={{
            vestingInfos,
            cancelledVestingContract: didSelectVest
              ? selectedVest
              : {
                  loading: false,
                  data: undefined,
                },
            EntityDisplay,
            VestingPaymentCard,
          }}
        />
      ) : null}
    </SuspenseLoader>
  )
}

// Only check if widget exists in DAOs.
const DaoComponent: ActionComponent<undefined, ManageVestingData> = (props) => {
  const widgetData = useWidget<VestingPaymentsWidgetData>(
    WidgetId.VestingPayments
  )?.daoWidget.values

  return <Component {...props} widgetData={widgetData} />
}

const WalletComponent: ActionComponent<undefined, ManageVestingData> = (
  props
) => <Component {...props} />

export class ManageVestingAction extends ActionBase<ManageVestingData> {
  public readonly key = ActionKey.ManageVesting
  public readonly Component: ActionComponent<undefined, ManageVestingData>

  private vestingInfosOwnedByEntity: VestingInfo[] = []
  private widgetData?: VestingPaymentsWidgetData

  constructor(options: ActionOptions) {
    super(options, {
      Icon: MoneyWingsEmoji,
      label: options.t('title.manageVesting'),
      description: options.t('info.manageVestingDescription'),
      // Hide until ready. Update this in setup.
      hideFromPicker: true,
    })

    this.Component =
      options.context.type === ActionContextType.Dao
        ? DaoComponent
        : WalletComponent

    this.widgetData =
      options.context.type === ActionContextType.Dao
        ? getDaoWidgets(options.context.dao.info.items).find(
            ({ id }) => id === WidgetId.VestingPayments
          )?.values
        : undefined

    // Fire async init immediately since we may hide this action.
    this.init().catch(() => {})
  }

  async setup() {
    this.vestingInfosOwnedByEntity = (
      await Promise.all(
        getVestingInfosOwnedByEntityQueries(this.options).map((query) =>
          this.options.queryClient.fetchQuery(query)
        )
      )
    ).flat()

    // Don't show if vesting payment widget is not enabled (for DAOs) and this
    // entity owns no vesting payments.
    this.metadata.hideFromPicker =
      (this.options.context.type !== ActionContextType.Dao ||
        !this.widgetData) &&
      this.vestingInfosOwnedByEntity.length === 0

    // Default start to 7 days from now.
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    this.defaults = {
      // Cannot use begin if no widget setup, so default to cancel if no data.
      mode: this.widgetData ? 'begin' : 'cancel',
      begin: {
        chainId: this.options.chain.chainId,
        amount: '1',
        type: TokenType.Native,
        denomOrAddress: getNativeTokenForChainId(this.options.chain.chainId)
          .denomOrAddress,
        recipient: '',
        startDate: `${start.toISOString().split('T')[0]} 12:00 AM`,
        title: '',
        ownerMode: 'me',
        otherOwner: '',
        manyOwners: [
          {
            address: this.options.address,
          },
          {
            address: '',
          },
        ],
        manyOwnersCw1WhitelistContract: '',
        steps: [
          {
            percent: 100,
            delay: {
              value: 1,
              units: DurationUnits.Years,
            },
          },
        ],
      },
      cancel: {
        chainId: this.options.chain.chainId,
        address: '',
      },
      registerSlash: {
        chainId: this.options.chain.chainId,
        address: '',
        validator: '',
        time: '',
        amount: '',
        duringUnbonding: false,
      },
    }
  }

  async encode({
    mode,
    begin,
    registerSlash,
    cancel,
  }: ManageVestingData): Promise<UnifiedCosmosMsg[]> {
    let chainId: string
    let cosmosMsg: UnifiedCosmosMsg

    // Can only begin a vest if there is widget data available.
    if (mode === 'begin' && this.widgetData) {
      chainId = begin.chainId

      const vestingSource = getVestingSourcesFromWidgetData(
        this.options,
        this.widgetData
      )[chainId]
      if (!vestingSource?.factory) {
        throw new Error(
          this.options.t('error.noChainVestingManager', {
            chain: getDisplayNameForChainId(chainId),
          })
        )
      }

      const [nativeUnstakingDurationSeconds, token, preV1VestingFactoryOwner] =
        await Promise.all([
          this.options.queryClient.fetchQuery(
            chainQueries.nativeUnstakingDurationSeconds({
              chainId,
            })
          ),
          this.options.queryClient.fetchQuery(
            tokenQueries.info(this.options.queryClient, {
              chainId,
              type: begin.type,
              denomOrAddress: begin.denomOrAddress,
            })
          ),
          // Pre-v1 vesting widgets use the factory owner as the vesting owner.
          this.widgetData.factory && !this.widgetData.version
            ? this.options.queryClient
                .fetchQuery(
                  cwPayrollFactoryQueries.ownership(this.options.queryClient, {
                    chainId: this.options.chain.chainId,
                    contractAddress: this.widgetData.factory,
                  })
                )
                .then(({ owner }) => owner || null)
            : null,
        ])

      const total = HugeDecimal.fromHumanReadable(begin.amount, token.decimals)

      const vestingDurationSeconds = begin.steps.reduce(
        (acc, { delay }) => acc + convertDurationWithUnitsToSeconds(delay),
        0
      )

      const instantiateMsg: VestingInstantiateMsg = {
        denom:
          token.type === TokenType.Native
            ? {
                native: token.denomOrAddress,
              }
            : {
                cw20: token.denomOrAddress,
              },
        description: begin.description || undefined,
        owner:
          // Widgets prior to V1 use the factory owner.
          !vestingSource.version
            ? preV1VestingFactoryOwner
            : // V1 and later can set the owner, or no widget data (when used by a wallet).
              !this.widgetData ||
                (vestingSource.version &&
                  vestingSource.version >= VestingContractVersion.V1)
              ? begin.ownerMode === 'none'
                ? undefined
                : begin.ownerMode === 'me'
                  ? vestingSource.owner
                  : begin.ownerMode === 'other'
                    ? begin.otherOwner
                    : begin.ownerMode === 'many'
                      ? begin.manyOwnersCw1WhitelistContract
                      : vestingSource.owner
              : vestingSource.owner,
        recipient: begin.recipient,
        schedule:
          begin.steps.length === 1
            ? 'saturating_linear'
            : {
                piecewise_linear: [
                  // First point must be 0 amount at 1 second.
                  [1, '0'],
                  ...(begin.steps.reduce(
                    (acc, { percent, delay }, index) => {
                      const delaySeconds = Math.max(
                        // Ensure this is at least 1 second since it can't have
                        // overlapping points.
                        1,
                        convertDurationWithUnitsToSeconds(delay) -
                          // For the first step, subtract 1 second since the first
                          // point must start at 1 second and is hardcoded above.
                          (index === 0 ? 1 : 0)
                      )

                      // For the first step, start at 1 second since the first
                      // point must start at 1 second and is hardcoded above.
                      const lastSeconds =
                        index === 0 ? 1 : acc[acc.length - 1][0]
                      const lastAmount =
                        index === 0 ? '0' : acc[acc.length - 1][1]

                      return [
                        ...acc,
                        [
                          lastSeconds + delaySeconds,
                          HugeDecimal.from(
                            // For the last step, use total to avoid rounding
                            // issues.
                            index === begin.steps.length - 1
                              ? total
                              : HugeDecimal.from(lastAmount).plus(
                                  total.times(percent / 100)
                                )
                          ).toString(),
                        ],
                      ]
                    },
                    [] as [number, string][]
                  ) as [number, string][]),
                ],
              },
        start_time:
          begin.startDate && !isNaN(Date.parse(begin.startDate))
            ? // milliseconds => nanoseconds
              BigInt(
                Math.round(new Date(begin.startDate).getTime() * 1e6)
              ).toString()
            : '',
        title: begin.title,
        total: total.toString(),
        unbonding_duration_seconds:
          token.type === TokenType.Native &&
          token.denomOrAddress ===
            getNativeTokenForChainId(chainId).denomOrAddress
            ? nativeUnstakingDurationSeconds
            : 0,
        vesting_duration_seconds: vestingDurationSeconds,
      }

      const msg: InstantiateNativePayrollContractMsg = {
        instantiate_msg: instantiateMsg,
        label: `vest_to_${begin.recipient}_${Date.now()}`,
      }

      if (token.type === TokenType.Native) {
        cosmosMsg = makeExecuteSmartContractMessage({
          chainId,
          contractAddress: vestingSource.factory,
          sender: vestingSource.owner,
          msg: {
            instantiate_native_payroll_contract: msg,
          } as ExecuteMsg,
          funds: total.toCoins(token.denomOrAddress),
        })
      } else if (token.type === TokenType.Cw20) {
        // Execute CW20 send message.
        cosmosMsg = makeExecuteSmartContractMessage({
          chainId,
          contractAddress: token.denomOrAddress,
          sender: vestingSource.owner,
          msg: {
            send: {
              amount: total.toString(),
              contract: vestingSource.factory,
              msg: encodeJsonToBase64({
                instantiate_payroll_contract: msg,
              }),
            },
          },
        })
      } else {
        throw new Error(this.options.t('error.unexpectedError'))
      }
    } else if (mode === 'cancel' || mode === 'registerSlash') {
      chainId = mode === 'cancel' ? cancel.chainId : registerSlash.chainId

      const contractAddress =
        mode === 'cancel' ? cancel.address : registerSlash.address

      const vestingInfo = this.vestingInfosOwnedByEntity.find(
        ({ vestingContractAddress }) =>
          vestingContractAddress === contractAddress
      )
      if (!vestingInfo) {
        throw new Error(this.options.t('error.noVestingContractSelected'))
      }

      const from = getChainAddressForActionOptions(this.options, chainId)
      if (!from) {
        throw new Error(this.options.t('error.loadingData'))
      }

      const viaCw1Whitelist =
        !!vestingInfo.owner?.isCw1Whitelist &&
        vestingInfo.owner.cw1WhitelistAdmins.includes(from)

      const msg = makeExecuteSmartContractMessage({
        chainId,
        contractAddress,
        sender: viaCw1Whitelist ? vestingInfo.owner!.address : from,
        msg:
          mode === 'cancel'
            ? {
                cancel: {},
              }
            : {
                register_slash: {
                  validator: registerSlash.validator,
                  time: registerSlash.time,
                  amount: registerSlash.amount,
                  during_unbonding: registerSlash.duringUnbonding,
                },
              },
      })

      cosmosMsg = viaCw1Whitelist
        ? // Wrap in cw1-whitelist execute.
          makeExecuteSmartContractMessage({
            chainId,
            contractAddress: vestingInfo.owner!.address,
            sender: from,
            msg: {
              execute: {
                msgs: [msg],
              },
            },
          })
        : msg
    } else {
      throw new Error(this.options.t('error.unexpectedError'))
    }

    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      cosmosMsg
    )
  }

  // helper to be used in match and decode
  breakDownMessage({ decodedMessage, account: { chainId } }: ProcessedMessage) {
    const isNativeBegin =
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              instantiate_native_payroll_contract: instantiateStructure,
            },
          },
        },
      }) &&
      decodedMessage.wasm.execute.funds.length === 1 &&
      objectMatchesStructure(decodedMessage.wasm.execute.funds[0], {
        amount: {},
        denom: {},
      })

    const isCw20Begin =
      objectMatchesStructure(decodedMessage, {
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
      }) &&
      objectMatchesStructure(
        decodeJsonFromBase64(decodedMessage.wasm.execute.msg.send.msg, true),
        {
          instantiate_payroll_contract: instantiateStructure,
        }
      )

    const isRegisterSlash = objectMatchesStructure(decodedMessage, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            register_slash: {
              validator: {},
              time: {},
              amount: {},
              during_unbonding: {},
            },
          },
        },
      },
    })

    const isCancel = objectMatchesStructure(decodedMessage, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            cancel: {},
          },
        },
      },
    })

    return {
      chainId,
      decodedMessage,
      isNativeBegin,
      isCw20Begin,
      isRegisterSlash,
      isCancel,
    }
  }

  match([message]: ProcessedMessage[]): ActionMatch {
    const { isNativeBegin, isCw20Begin, isRegisterSlash, isCancel } =
      this.breakDownMessage(message)

    return isNativeBegin || isCw20Begin || isRegisterSlash || isCancel
  }

  async decode([message]: ProcessedMessage[]): Promise<
    Partial<ManageVestingData>
  > {
    const {
      chainId,
      decodedMessage,
      isNativeBegin,
      isCw20Begin,
      isRegisterSlash,
      isCancel,
    } = this.breakDownMessage(message)

    if (isNativeBegin || isCw20Begin) {
      const instantiateMsg: VestingInstantiateMsg = isNativeBegin
        ? decodedMessage.wasm.execute.msg.instantiate_native_payroll_contract
            .instantiate_msg
        : // isCw20Begin
          // Extract instantiate message from cw20 send message.
          (decodeJsonFromBase64(decodedMessage.wasm.execute.msg.send.msg, true)
            .instantiate_payroll_contract
            ?.instantiate_msg as VestingInstantiateMsg)

      const [token, cw1WhitelistAdmins] = await Promise.all([
        this.options.queryClient.fetchQuery(
          tokenQueries.info(this.options.queryClient, {
            chainId,
            type: isNativeBegin ? TokenType.Native : TokenType.Cw20,
            denomOrAddress: isNativeBegin
              ? decodedMessage.wasm.execute.funds[0].denom
              : decodedMessage.wasm.execute.contract_addr,
          })
        ),
        // Attempt to load cw1-whitelist admins if the owner is set. Will only
        // succeed if the owner is a cw1-whitelist contract. Otherwise it
        // returns null.
        instantiateMsg.owner
          ? this.options.queryClient.fetchQuery(
              cw1WhitelistExtraQueries.adminsIfCw1Whitelist(
                this.options.queryClient,
                {
                  chainId,
                  address: instantiateMsg.owner,
                }
              )
            )
          : null,
      ])

      const ownerMode = !instantiateMsg.owner
        ? 'none'
        : instantiateMsg.owner ===
            getChainAddressForActionOptions(this.options, chainId)
          ? 'me'
          : cw1WhitelistAdmins
            ? 'many'
            : 'other'

      return {
        mode: 'begin',
        begin: {
          chainId,
          type: token.type,
          denomOrAddress: token.denomOrAddress,
          description: instantiateMsg.description || undefined,
          recipient: instantiateMsg.recipient,
          startDate: instantiateMsg.start_time
            ? new Date(
                // nanoseconds => milliseconds
                Number(instantiateMsg.start_time) / 1e6
              ).toISOString()
            : '',
          title: instantiateMsg.title,
          amount: HugeDecimal.from(instantiateMsg.total).toHumanReadableString(
            token.decimals
          ),
          ownerMode,
          otherOwner: (ownerMode === 'other' && instantiateMsg.owner) || '',
          manyOwners:
            ownerMode === 'many' && cw1WhitelistAdmins
              ? cw1WhitelistAdmins.map((address) => ({
                  address,
                }))
              : [],
          manyOwnersCw1WhitelistContract:
            (ownerMode === 'many' && instantiateMsg.owner) || '',
          steps:
            instantiateMsg.schedule === 'saturating_linear'
              ? [
                  {
                    percent: 100,
                    delay: convertSecondsToDurationWithUnits(
                      instantiateMsg.vesting_duration_seconds
                    ),
                  },
                ]
              : instantiateMsg.schedule.piecewise_linear.reduce(
                  (acc, [seconds, amount], index) => {
                    // Ignore first step if hardcoded 0 amount at 1 second.
                    if (index === 0 && seconds === 1 && amount === '0') {
                      return acc
                    }

                    const pastTimestamp =
                      index === 1 ||
                      // Typecheck. Always false.
                      instantiateMsg!.schedule === 'saturating_linear'
                        ? // For first user-defined step, account for 1 second
                          // delay since we ignore the first hardcoded step at
                          // 1 second. When we created the msg, we subtracted
                          // 1 second from the first user-defined step's
                          // delay.
                          0
                        : instantiateMsg!.schedule.piecewise_linear[
                            index - 1
                          ][0]
                    const pastAmount =
                      index === 0 ||
                      // Typecheck. Always false.
                      instantiateMsg!.schedule === 'saturating_linear'
                        ? '0'
                        : instantiateMsg!.schedule.piecewise_linear[
                            index - 1
                          ][1]

                    return [
                      ...acc,
                      {
                        percent: HugeDecimal.from(amount)
                          .minus(pastAmount)
                          .div(instantiateMsg!.total)
                          .times(100)
                          .toNumber(2),
                        delay: convertSecondsToDurationWithUnits(
                          seconds - pastTimestamp
                        ),
                      },
                    ]
                  },
                  [] as {
                    percent: number
                    delay: DurationWithUnits
                  }[]
                ),
        },
      }
    } else if (isRegisterSlash) {
      return {
        mode: 'registerSlash',
        registerSlash: {
          chainId,
          address: decodedMessage.wasm.execute.contract_addr,
          validator: decodedMessage.wasm.execute.msg.register_slash.validator,
          time: decodedMessage.wasm.execute.msg.register_slash.time,
          amount: decodedMessage.wasm.execute.msg.register_slash.amount,
          duringUnbonding:
            decodedMessage.wasm.execute.msg.register_slash.during_unbonding,
        },
      }
    } else if (isCancel) {
      return {
        mode: 'cancel',
        cancel: {
          chainId,
          address: decodedMessage.wasm.execute.contract_addr,
        },
      }
    }

    // Should never happen.
    throw new Error('Unexpected message')
  }
}
