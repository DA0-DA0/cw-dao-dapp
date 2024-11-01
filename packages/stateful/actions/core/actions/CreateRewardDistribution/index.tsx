import { useQueryClient } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { useFormContext } from 'react-hook-form'

import { HugeDecimal } from '@dao-dao/math'
import { contractQueries, tokenQueries } from '@dao-dao/state/query'
import { ActionBase, BucketEmoji, useChain } from '@dao-dao/stateless'
import {
  AccountType,
  DaoRewardDistributor,
  DurationUnits,
  TokenType,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  ActionChainContextType,
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  CreateMsg,
  InstantiateMsg,
} from '@dao-dao/types/contracts/DaoRewardsDistributor'
import {
  convertDurationToDurationWithUnits,
  convertDurationWithUnitsToDuration,
  encodeJsonToBase64,
  getDaoRewardDistributors,
  getNativeTokenForChainId,
  getRewardDistributorStorageItemKey,
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
  parseCw20SendContractMessage,
} from '@dao-dao/utils'

import { useQueryLoadingDataWithError } from '../../../../hooks'
import { useTokenBalances } from '../../../hooks'
import { Instantiate2Action } from '../Instantiate2'
import { ManageStorageItemsAction } from '../ManageStorageItems'
import {
  CreateRewardDistributionComponent,
  CreateRewardDistributionData,
} from './Component'

const Component: ActionComponent<undefined, CreateRewardDistributionData> = (
  props
) => {
  const { chainId } = useChain()
  const queryClient = useQueryClient()

  const { watch } = useFormContext<CreateRewardDistributionData>()
  const type = watch((props.fieldNamePrefix + 'type') as 'type')
  const denomOrAddress = watch(
    (props.fieldNamePrefix + 'denomOrAddress') as 'denomOrAddress'
  )

  const tokens = useTokenBalances({
    // Load selected token when not creating, in case it is no longer returned
    // in the list of all tokens for the given DAO.
    additionalTokens: props.isCreating
      ? undefined
      : [
          {
            chainId,
            type,
            denomOrAddress,
          },
        ],
    // Rewards are distributed from the DAO's home chain, so the tokens must
    // live there.
    includeAccountTypes: [AccountType.Base],
  })

  const token = useQueryLoadingDataWithError(
    denomOrAddress
      ? tokenQueries.info(queryClient, {
          chainId,
          type,
          denomOrAddress,
        })
      : undefined
  )

  return (
    <CreateRewardDistributionComponent {...props} options={{ tokens, token }} />
  )
}

export class CreateRewardDistributionAction extends ActionBase<CreateRewardDistributionData> {
  public readonly key = ActionKey.CreateRewardDistribution
  public readonly Component = Component

  /**
   * Existing reward distributors.
   */
  private distributors: DaoRewardDistributor[]

  private instantiate2Action: Instantiate2Action
  private manageStorageItemsAction: ManageStorageItemsAction

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can create reward distributions')
    }

    super(options, {
      Icon: BucketEmoji,
      label: options.t('title.createRewardDistribution'),
      description: options.t('info.createRewardDistributionDescription'),
    })

    this.distributors = getDaoRewardDistributors(options.context.dao.info.items)

    this.instantiate2Action = new Instantiate2Action(this.options)
    this.manageStorageItemsAction = new ManageStorageItemsAction(this.options)
  }

  async setup() {
    await Promise.all([
      this.instantiate2Action.setup(),
      this.manageStorageItemsAction.setup(),
    ])

    this.defaults = {
      type: TokenType.Native,
      denomOrAddress: getNativeTokenForChainId(this.options.chain.chainId)
        .denomOrAddress,
      immediate: false,
      rate: {
        amount: '1',
        duration: {
          value: 1,
          units: DurationUnits.Hours,
        },
      },
      initialFunds: '0',
      openFunding: true,
    }
  }

  async encode({
    type,
    denomOrAddress,
    immediate,
    rate,
    initialFunds: _initialFunds,
    openFunding,
  }: CreateRewardDistributionData): Promise<UnifiedCosmosMsg[]> {
    if (this.options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can create reward distributions')
    }
    if (this.options.chainContext.type !== ActionChainContextType.Supported) {
      throw new Error('Unsupported chain')
    }

    const votingModule = this.options.context.dao.votingModule
    const hookCaller = await votingModule.getHookCaller()

    const messages: UnifiedCosmosMsg[] = []

    const token = await this.options.queryClient.fetchQuery(
      tokenQueries.info(this.options.queryClient, {
        chainId: this.options.chain.chainId,
        type,
        denomOrAddress,
      })
    )

    const initialFunds = HugeDecimal.fromHumanReadable(
      _initialFunds,
      token.decimals
    )

    let distributor = this.distributors[0]?.address

    // Create new distributor if not found.
    if (!distributor) {
      const codeId =
        this.options.chainContext.config.codeIds.DaoRewardsDistributor
      if (!codeId) {
        throw new Error(
          'Reward distributor contract not yet uploaded to this chain'
        )
      }

      const id = nanoid(8)
      const salt = `dao-reward-distributor-${id}`

      distributor = await this.options.queryClient.fetchQuery(
        contractQueries.instantiate2Address(this.options.queryClient, {
          chainId: this.options.chain.chainId,
          creator: this.options.address,
          codeId,
          salt,
        })
      )

      messages.push(
        // Will only ever be one message since it's on the native chain.
        ...[
          this.instantiate2Action.encode({
            chainId: this.options.chain.chainId,
            sender: this.options.address,
            admin: this.options.address,
            codeId,
            label: `DAO Rewards Distributor (${id})`,
            message: JSON.stringify(
              {
                owner: this.options.address,
              } as InstantiateMsg,
              null,
              2
            ),
            salt,
            funds: [],
          }),
        ].flat(),
        // Set storage item after instantiation.
        this.manageStorageItemsAction.encode({
          setting: true,
          key: getRewardDistributorStorageItemKey(id),
          value: distributor,
        })
      )
    }

    // Create reward distribution.
    messages.push(
      makeExecuteSmartContractMessage({
        chainId: this.options.chain.chainId,
        sender: this.options.address,
        contractAddress: distributor,
        msg: {
          create: {
            denom:
              type === TokenType.Cw20
                ? {
                    cw20: denomOrAddress,
                  }
                : {
                    native: denomOrAddress,
                  },
            emission_rate: immediate
              ? {
                  immediate: {},
                }
              : {
                  linear: {
                    amount: HugeDecimal.fromHumanReadable(
                      rate.amount,
                      token.decimals
                    ).toString(),
                    duration: convertDurationWithUnitsToDuration(rate.duration),
                    continuous: false,
                  },
                },
            hook_caller: hookCaller,
            vp_contract: votingModule.address,
            // CW20 distributions must have open funding enabled due to a bug in
            // the contract.
            open_funding: type === TokenType.Cw20 ? true : openFunding,
          } as CreateMsg,
        },
      })
    )

    // Fund if initial funds are set.
    if (initialFunds.isPositive()) {
      messages.push(
        type === TokenType.Native
          ? makeExecuteSmartContractMessage({
              chainId: this.options.chain.chainId,
              sender: this.options.address,
              contractAddress: distributor,
              msg: {
                fund_latest: {},
              },
              funds:
                type === TokenType.Native
                  ? [
                      {
                        denom: denomOrAddress,
                        amount: initialFunds.toString(),
                      },
                    ]
                  : undefined,
            })
          : // Execute CW20 send message.
            makeExecuteSmartContractMessage({
              chainId: this.options.chain.chainId,
              sender: this.options.address,
              contractAddress: denomOrAddress,
              msg: {
                send: {
                  amount: initialFunds.toString(),
                  contract: distributor,
                  msg: encodeJsonToBase64({
                    fund_latest: {},
                  }),
                },
              },
            })
      )
    }

    // If hook missing, add it.
    const hooks = await votingModule.getHooks()
    if (!hooks.includes(distributor)) {
      messages.push(
        makeExecuteSmartContractMessage({
          chainId: this.options.chain.chainId,
          sender: this.options.address,
          contractAddress: hookCaller,
          msg: {
            add_hook: {
              addr: distributor,
            },
          },
        })
      )
    }

    return messages
  }

  async match(messages: ProcessedMessage[]): Promise<ActionMatch> {
    if (this.options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can create reward distributions')
    }

    const currentVotingModule = this.options.context.dao.votingModule
    const hookCaller = await currentVotingModule.getHookCaller()

    // There are 2 scenarios with different message sets:
    //
    // new contract:
    // - instantiate contract
    // - set storage item
    // - create distribution
    // - fund distribution (if initial funds set)
    // - add hook (if needed)
    //
    // existing contract:
    // - create distribution
    // - fund distribution (if initial funds set)
    // - add hook (if needed)

    // Existing contract
    if (
      objectMatchesStructure(messages[0].decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              create: {
                denom: {},
                emission_rate: {},
                hook_caller: {},
                vp_contract: {},
              },
            },
          },
        },
      }) &&
      this.distributors.some(
        (d) =>
          d.address === messages[0].decodedMessage.wasm.execute.contract_addr
      ) &&
      // Ensure voting module and hook caller are correct. Otherwise, this may
      // be a malicious actor trying to use a different voting module that
      // distributes rewards to different recipients.
      messages[0].decodedMessage.wasm.execute.msg.create.vp_contract ===
        currentVotingModule.address &&
      messages[0].decodedMessage.wasm.execute.msg.create.hook_caller ===
        hookCaller
    ) {
      const distributor = messages[0].decodedMessage.wasm.execute.contract_addr

      const fundExists =
        messages.length >= 2 &&
        // Native
        ((objectMatchesStructure(messages[1].decodedMessage, {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                fund_latest: {},
              },
            },
          },
        }) &&
          messages[1].decodedMessage.wasm.execute.contract_addr ===
            distributor) ||
          // Cw20
          !!parseCw20SendContractMessage(
            messages[1].decodedMessage,
            {
              fund_latest: {},
            },
            distributor
          ))

      const potentialAddHookId = fundExists ? 2 : 1
      const hookExists =
        messages.length >= potentialAddHookId + 1 &&
        objectMatchesStructure(messages[potentialAddHookId].decodedMessage, {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                add_hook: {
                  addr: {},
                },
              },
            },
          },
        }) &&
        messages[potentialAddHookId].decodedMessage.wasm.execute
          .contract_addr === hookCaller &&
        messages[potentialAddHookId].decodedMessage.wasm.execute.msg.add_hook
          .addr === distributor

      // 1, 2, or 3 messages expected for existing contracts, depending on if
      // funding and if hook is being added.
      return 1 + (fundExists ? 1 : 0) + (hookExists ? 1 : 0)
    }

    // New contract
    if (
      messages.length >= 3 &&
      // First is instantiate2 contract.
      this.instantiate2Action.match([messages[0]]) &&
      // Make sure instantiate2 has no funds.
      (await this.instantiate2Action.decode([messages[0]])).funds.length ===
        0 &&
      // Second is set storage item.
      this.manageStorageItemsAction.match([messages[1]]) &&
      // Make sure setting distributor storage item.
      this.manageStorageItemsAction
        .decode([messages[1]])
        .key.startsWith(getRewardDistributorStorageItemKey('')) &&
      // Third is create distribution.
      objectMatchesStructure(messages[2].decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              create: {
                denom: {},
                emission_rate: {},
                hook_caller: {},
                vp_contract: {},
              },
            },
          },
        },
      }) &&
      // Ensure voting module and hook caller are correct. Otherwise, this may
      // be a malicious actor trying to use a different voting module that
      // distributes rewards to different recipients.
      messages[2].decodedMessage.wasm.execute.msg.create.vp_contract ===
        currentVotingModule.address &&
      messages[2].decodedMessage.wasm.execute.msg.create.hook_caller ===
        hookCaller
    ) {
      const distributor = messages[2].decodedMessage.wasm.execute.contract_addr

      const fundExists =
        messages.length >= 4 &&
        // Native
        ((objectMatchesStructure(messages[3].decodedMessage, {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                fund_latest: {},
              },
            },
          },
        }) &&
          messages[3].decodedMessage.wasm.execute.contract_addr ===
            distributor) ||
          // Cw20
          !!parseCw20SendContractMessage(
            messages[3].decodedMessage,
            {
              fund_latest: {},
            },
            distributor
          ))

      const potentialAddHookId = fundExists ? 4 : 3
      const hookExists =
        messages.length >= potentialAddHookId + 1 &&
        objectMatchesStructure(messages[potentialAddHookId].decodedMessage, {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                add_hook: {
                  addr: {},
                },
              },
            },
          },
        }) &&
        messages[potentialAddHookId].decodedMessage.wasm.execute
          .contract_addr === hookCaller &&
        messages[potentialAddHookId].decodedMessage.wasm.execute.msg.add_hook
          .addr === distributor

      // 3, 4, or 5 messages expected for new contracts, depending on if funding
      // and if hook is being added.
      return 3 + (fundExists ? 1 : 0) + (hookExists ? 1 : 0)
    }

    return false
  }

  async decode(
    messages: ProcessedMessage[]
  ): Promise<CreateRewardDistributionData> {
    const createId = objectMatchesStructure(messages[0].decodedMessage, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            create: {},
          },
        },
      },
    })
      ? 0
      : 2

    const createMsg: CreateMsg =
      messages[createId].decodedMessage.wasm.execute.msg.create
    const type = 'native' in createMsg.denom ? TokenType.Native : TokenType.Cw20

    // Fund latest is after create if initial funds are set.
    const fundLatestId = createId + 1
    const initialFunds =
      messages.length >= fundLatestId + 1
        ? // Native
          type === TokenType.Native &&
          objectMatchesStructure(messages[fundLatestId].decodedMessage, {
            wasm: {
              execute: {
                contract_addr: {},
                funds: {},
                msg: {
                  fund_latest: {},
                },
              },
            },
          })
          ? messages[fundLatestId].decodedMessage.wasm.execute.funds[0]?.amount
          : // Cw20
          type === TokenType.Cw20
          ? parseCw20SendContractMessage(
              messages[fundLatestId].decodedMessage,
              {
                fund_latest: {},
              }
            )?.amount || 0
          : 0
        : 0

    const denomOrAddress =
      'native' in createMsg.denom
        ? createMsg.denom.native
        : createMsg.denom.cw20

    const token = await this.options.queryClient.fetchQuery(
      tokenQueries.info(this.options.queryClient, {
        chainId: this.options.chain.chainId,
        type,
        denomOrAddress,
      })
    )

    return {
      type,
      denomOrAddress,
      immediate: 'immediate' in createMsg.emission_rate,
      rate: {
        amount: HugeDecimal.from(
          'linear' in createMsg.emission_rate
            ? createMsg.emission_rate.linear.amount
            : 1
        ).toHumanReadableString(token.decimals),
        duration:
          'linear' in createMsg.emission_rate
            ? convertDurationToDurationWithUnits(
                createMsg.emission_rate.linear.duration
              )
            : {
                value: 1,
                units: DurationUnits.Hours,
              },
      },
      initialFunds: HugeDecimal.from(initialFunds).toHumanReadableString(
        token.decimals
      ),
      openFunding: !!createMsg.open_funding,
    }
  }

  transformImportData({
    initialFunds,
    ...data
  }: any): CreateRewardDistributionData {
    return {
      ...data,
      // Ensure initialFunds is a string.
      initialFunds: HugeDecimal.from(initialFunds).toString(),
    }
  }
}
