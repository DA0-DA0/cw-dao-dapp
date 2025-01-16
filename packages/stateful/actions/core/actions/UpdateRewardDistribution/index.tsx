import { HugeDecimal } from '@dao-dao/math'
import { daoRewardsDistributorExtraQueries } from '@dao-dao/state/query'
import { ActionBase, ConstructionEmoji } from '@dao-dao/stateless'
import {
  DaoRewardDistribution,
  DaoRewardDistributor,
  DurationUnits,
  TokenType,
  UnifiedCosmosMsg,
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
  convertDurationToDurationWithUnits,
  convertDurationWithUnitsToDuration,
  getDaoRewardDistributors,
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  UpdateRewardDistributionComponent,
  UpdateRewardDistributionData,
} from './Component'

export class UpdateRewardDistributionAction extends ActionBase<UpdateRewardDistributionData> {
  public readonly key = ActionKey.UpdateRewardDistribution
  public readonly Component: ActionComponent<
    undefined,
    UpdateRewardDistributionData
  >

  /**
   * Existing reward distributors.
   */
  private distributors: DaoRewardDistributor[]
  /**
   * Existing reward distributions.
   */
  private distributions: DaoRewardDistribution[] = []

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can update reward distributions')
    }

    super(options, {
      Icon: ConstructionEmoji,
      label: options.t('title.updateRewardDistribution'),
      description: options.t('info.updateRewardDistributionDescription'),
    })

    this.distributors = getDaoRewardDistributors(options.context.dao.info.items)

    const action = this
    this.Component = function Component(props) {
      return (
        <UpdateRewardDistributionComponent
          {...props}
          options={{ distributions: action.distributions }}
        />
      )
    }
  }

  async setup() {
    this.distributions = (
      await Promise.all(
        this.distributors.map(
          async ({ address }) =>
            await this.options.queryClient.fetchQuery(
              daoRewardsDistributorExtraQueries.distributions(
                this.options.queryClient,
                {
                  chainId: this.options.chain.chainId,
                  address,
                }
              )
            )
        )
      )
    ).flat()

    // Default to first distribution, if available.
    const emissionRate = this.distributions[0]?.active_epoch.emission_rate

    this.defaults = {
      address: this.distributions[0]?.address || '',
      id: this.distributions[0]?.id || 0,
      immediate: emissionRate ? 'immediate' in emissionRate : false,
      rate: {
        amount:
          emissionRate &&
          !('immediate' in emissionRate) &&
          !('paused' in emissionRate)
            ? HugeDecimal.from(
                emissionRate.linear.amount
              ).toHumanReadableString(this.distributions[0].token.decimals)
            : '1',
        duration:
          emissionRate &&
          !('immediate' in emissionRate) &&
          !('paused' in emissionRate)
            ? convertDurationToDurationWithUnits(emissionRate.linear.duration)
            : {
                value: 1,
                units: DurationUnits.Hours,
              },
      },
      openFunding: this.distributions[0]?.open_funding || false,
    }
  }

  encode({
    address,
    id,
    immediate,
    rate,
    openFunding,
  }: UpdateRewardDistributionData): UnifiedCosmosMsg {
    const distribution = this.distributions.find(
      (d) => d.address === address && d.id === id
    )
    if (!distribution) {
      throw new Error('Distribution not found')
    }

    return makeExecuteSmartContractMessage({
      chainId: this.options.chain.chainId,
      sender: this.options.address,
      contractAddress: address,
      msg: {
        update: {
          id,
          emission_rate: immediate
            ? {
                immediate: {},
              }
            : {
                linear: {
                  amount: HugeDecimal.fromHumanReadable(
                    rate.amount,
                    distribution.token.decimals
                  ).toString(),
                  duration: convertDurationWithUnitsToDuration(rate.duration),
                  continuous: false,
                },
              },
          // CW20 distributions must have open funding enabled due to a bug in
          // the contract.
          ...(distribution.token.type === TokenType.Cw20 &&
          !distribution.open_funding
            ? {
                open_funding: true,
              }
            : distribution.token.type === TokenType.Native
              ? {
                  open_funding: openFunding,
                }
              : {}),
        },
      },
    })
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              update: {
                id: {},
                emission_rate: {},
              },
            },
          },
        },
      }) &&
      this.distributors.some(
        (d) => d.address === decodedMessage.wasm.execute.contract_addr
      ) &&
      // Ensure vp_contract and hook_caller are unchanged, since we don't allow
      // changing them in the UI. Otherwise, this may be a malicious actor
      // trying to sneakily use a different voting module that distributes
      // rewards to different recipients.
      !decodedMessage.wasm.execute.msg.update.vp_contract &&
      !decodedMessage.wasm.execute.msg.update.hook_caller
    )
  }

  async decode([
    { decodedMessage },
  ]: ProcessedMessage[]): Promise<UpdateRewardDistributionData> {
    const address = decodedMessage.wasm.execute.contract_addr
    const updateMsg = decodedMessage.wasm.execute.msg.update

    const distribution = this.distributions.find(
      (d) => d.address === address && d.id === updateMsg.id
    )
    if (!distribution) {
      throw new Error('Distribution not found')
    }

    return {
      address,
      id: updateMsg.id,
      immediate: 'immediate' in updateMsg.emission_rate,
      rate: {
        amount: HugeDecimal.from(
          'linear' in updateMsg.emission_rate
            ? updateMsg.emission_rate.linear.amount
            : 1
        ).toHumanReadableString(distribution.token.decimals),
        duration:
          'linear' in updateMsg.emission_rate
            ? convertDurationToDurationWithUnits(
                updateMsg.emission_rate.linear.duration
              )
            : {
                value: 1,
                units: DurationUnits.Hours,
              },
      },
      openFunding: updateMsg.open_funding,
    }
  }
}
