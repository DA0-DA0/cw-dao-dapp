import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { HugeDecimal } from '@dao-dao/math'
import {
  contractQueries,
  daoRewardsDistributorExtraQueries,
} from '@dao-dao/state/query'
import { ActionBase, WrenchEmoji, useActionOptions } from '@dao-dao/stateless'
import {
  ContractVersion,
  DaoRewardDistributor,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  ActionChainContextType,
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
} from '@dao-dao/types/actions'
import {
  getDaoRewardDistributors,
  getRewardDistributionKey,
  parseContractVersion,
  tokenToUncheckedDenom,
  versionGte,
} from '@dao-dao/utils'

import { useQueryLoadingDataWithError } from '../../../../hooks'
import { ExecuteAction } from '../Execute'
import { FundRewardDistributionAction } from '../FundRewardDistribution'
import { MigrateAction } from '../Migrate'
import { PauseRewardDistributionAction } from '../PauseRewardDistribution'
import { ResumeRewardDistributionAction } from '../ResumeRewardDistribution'
import { WithdrawRewardDistributionAction } from '../WithdrawRewardDistribution'
import {
  FixRewardDistributorComponent,
  FixRewardDistributorData,
} from './Component'

const Component: ActionComponent<undefined, FixRewardDistributorData> = (
  props
) => {
  const {
    address,
    chain: { chainId },
    queryClient,
  } = useActionOptions()
  const { setValue } = useFormContext<FixRewardDistributorData>()

  const recovery = useQueryLoadingDataWithError(
    daoRewardsDistributorExtraQueries.v250DistributionRecoveryInfo(
      queryClient,
      {
        chainId,
        daoAddress: address,
      }
    )
  )

  useEffect(() => {
    setValue(
      (props.fieldNamePrefix + 'step') as 'step',
      recovery.loading || recovery.errored ? undefined : recovery.data.step
    )
  }, [props.fieldNamePrefix, recovery, setValue])

  return (
    <FixRewardDistributorComponent
      {...props}
      options={{
        recovery,
      }}
    />
  )
}

export class FixRewardDistributorAction extends ActionBase<FixRewardDistributorData> {
  public readonly key = ActionKey.FixRewardDistributor
  public readonly Component = Component

  /**
   * Existing reward distributors on v2.5.0.
   */
  private distributors: DaoRewardDistributor[] = []

  private pauseAction: PauseRewardDistributionAction
  private withdrawAction: WithdrawRewardDistributionAction
  private migrateAction: MigrateAction
  private executeAction: ExecuteAction
  private resumeAction: ResumeRewardDistributionAction
  private fundAction: FundRewardDistributionAction

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Only DAOs can setup reward distributions')
    }
    if (options.chainContext.type !== ActionChainContextType.Supported) {
      throw new Error('Unsupported chain')
    }

    // Reward distributor is fixed in v2.6.0.
    if (
      !versionGte(
        options.chainContext.config.latestVersion,
        ContractVersion.V260
      )
    ) {
      throw new Error('Unsupported chain version')
    }

    super(options, {
      Icon: WrenchEmoji,
      label: options.t('title.fixRewardDistributor'),
      description: options.t('info.fixRewardDistributorDescription'),
      notReusable: true,
      // Default hidden and unhide if we detect a v2.5.0 distributor.
      hideFromPicker: true,
    })

    this.pauseAction = new PauseRewardDistributionAction(options)
    this.withdrawAction = new WithdrawRewardDistributionAction(options)
    this.migrateAction = new MigrateAction(options)
    this.executeAction = new ExecuteAction(options)
    this.resumeAction = new ResumeRewardDistributionAction(options)
    this.fundAction = new FundRewardDistributionAction(options)

    this.distributors = getDaoRewardDistributors(options.context.dao.info.items)
  }

  async setup() {
    await this.pauseAction.setup()

    // These all use the same queries as the pause action, so let it cache them
    // and then load all these at once.
    await Promise.all([
      this.withdrawAction.setup(),
      this.resumeAction.setup(),
      this.fundAction.setup(),
    ])

    this.distributors = (
      await Promise.all(
        this.distributors.map(async ({ id, address }) => {
          const { info } = await this.options.queryClient.fetchQuery(
            contractQueries.info(this.options.queryClient, {
              chainId: this.options.chain.chainId,
              address,
            })
          )

          const version = parseContractVersion(info.version)

          return { id, address, version }
        })
      )
    ).flatMap(({ id, address, version }): DaoRewardDistributor | [] =>
      version === ContractVersion.V250 ? { id, address } : []
    )

    this.metadata.hideFromPicker = this.distributors.length === 0

    this.defaults = {
      step: undefined,
      resume: {},
      fundAmounts: {},
    }
  }

  encode({
    step,
    resume,
    fundAmounts,
  }: FixRewardDistributorData): UnifiedCosmosMsg[] {
    if (this.options.chainContext.type !== ActionChainContextType.Supported) {
      throw new Error('Unsupported chain')
    }
    const codeId =
      this.options.chainContext.config.codeIds.DaoRewardsDistributor

    if (!step) {
      throw new Error('Recovery information not yet loaded')
    }

    if (step.step === 'done') {
      throw new Error('Recovery already completed')
    }

    switch (step.step) {
      case 1: {
        const pauseActions = step.needsPause.flatMap(({ distribution }) =>
          this.pauseAction.encode({
            address: distribution.address,
            id: distribution.id,
          })
        )

        const withdrawActions = step.needsWithdraw.flatMap(({ distribution }) =>
          this.withdrawAction.encode({
            address: distribution.address,
            id: distribution.id,
          })
        )

        return [...pauseActions, ...withdrawActions]
      }
      case 2: {
        const upgradeActions = step.needsUpgrade.flatMap((distributor) =>
          this.migrateAction.encode({
            chainId: this.options.chain.chainId,
            contract: distributor.address,
            codeId,
            msg: '{}',
          })
        )

        const forceWithdrawActions = step.needsForceWithdraw.flatMap(
          ({ distributor, token, missed }) =>
            this.executeAction.encode({
              chainId: this.options.chain.chainId,
              sender: this.options.address,
              address: distributor.address,
              message: JSON.stringify({
                unsafe_force_withdraw: {
                  amount: missed.toFixed(0),
                  denom: tokenToUncheckedDenom(token),
                },
              }),
              funds: [],
              cw20: false,
            })
        )

        const resumeActions = step.canBeResumed.flatMap(
          ({ distributor, distribution }) =>
            resume[
              getRewardDistributionKey(distributor.address, distribution.id)
            ]
              ? this.resumeAction.encode({
                  address: distribution.address,
                  id: distribution.id,
                })
              : []
        )

        const fundActions = step.canBeResumed.flatMap(
          ({ distributor, distribution }) => {
            const key = getRewardDistributionKey(
              distributor.address,
              distribution.id
            )

            return resume[key] &&
              fundAmounts[key] &&
              !HugeDecimal.from(fundAmounts[key]).isNaN() &&
              HugeDecimal.from(fundAmounts[key]).isPositive()
              ? this.fundAction.encode({
                  address: distribution.address,
                  id: distribution.id,
                  amount:
                    fundAmounts[
                      getRewardDistributionKey(
                        distributor.address,
                        distribution.id
                      )
                    ],
                })
              : []
          }
        )

        return [
          ...upgradeActions,
          ...forceWithdrawActions,
          ...resumeActions,
          ...fundActions,
        ]
      }
    }
  }

  // There are too many combined messages to validate, and we run the risk of
  // someone being able to sneak in a message that isn't valid if we don't
  // implement the matching perfectly. Also, we don't want other actions to
  // render as this action, so we'll just return false and display all of the
  // actions individually.
  match(): ActionMatch {
    return false
  }

  async decode(): Promise<FixRewardDistributorData> {
    throw new Error('Not implemented')
  }
}
