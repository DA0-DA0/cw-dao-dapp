import {
  ActionBase,
  BallotDepositEmoji,
  useActionOptions,
  useLoadingPromise,
} from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionContextType,
  ActionEncodeContext,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types'

import { SuspenseLoader, Trans } from '../../../../components'
import { matchAndLoadCommon } from '../../../../proposal-module-adapter'
import {
  ProposalModuleWithAction,
  UpdatePreProposeConfigComponent,
  UpdatePreProposeConfigData,
} from './Component'

const getUpdatePreProposeConfigActions = async (
  options: ActionOptions
): Promise<ProposalModuleWithAction[]> => {
  if (options.context.type !== ActionContextType.Dao) {
    throw new Error('Not DAO context')
  }

  const { dao } = options.context

  return (
    (
      await Promise.all(
        dao.proposalModules.flatMap(
          (proposalModule): Promise<ProposalModuleWithAction> | [] => {
            const action = matchAndLoadCommon(
              dao,
              proposalModule.address
            ).fields.updatePreProposeConfigActionMaker?.(options)

            if (!action) {
              return []
            }

            return Promise.resolve(
              action.ready ? undefined : action.init()
            ).then(() => ({
              proposalModule,
              action,
            }))
          }
        )
      )
    )
      // Sort proposal modules by prefix.
      .sort((a, b) =>
        a.proposalModule.prefix.localeCompare(b.proposalModule.prefix)
      )
  )
}

const Component: ActionComponent = (props) => {
  const actionOptions = useActionOptions()
  const options = useLoadingPromise({
    promise: async () => getUpdatePreProposeConfigActions(actionOptions),
    deps: [actionOptions],
  })

  return (
    <UpdatePreProposeConfigComponent
      {...props}
      options={{
        options,
        SuspenseLoader,
        Trans,
      }}
    />
  )
}

export class UpdatePreProposeConfigAction extends ActionBase<UpdatePreProposeConfigData> {
  public readonly key = ActionKey.UpdatePreProposeConfig
  public readonly Component = Component

  private actionOptions: ProposalModuleWithAction[] = []

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    super(options, {
      Icon: BallotDepositEmoji,
      label: options.t('form.updateProposalSubmissionConfigTitle'),
      description: options.t(
        'info.updateProposalSubmissionConfigActionDescription'
      ),
    })
  }

  async setup() {
    this.actionOptions = await getUpdatePreProposeConfigActions(this.options)
    this.defaults = {
      proposalModuleAddress:
        this.actionOptions[0]?.proposalModule.address ?? '',
      data: this.actionOptions[0]?.action.defaults ?? {},
    }
  }

  encode(
    { proposalModuleAddress, data }: UpdatePreProposeConfigData,
    encodeContext: ActionEncodeContext
  ) {
    const option = this.actionOptions.find(
      (option) => option.proposalModule.address === proposalModuleAddress
    )
    if (!option) {
      throw new Error(
        this.options.t('error.failedToFindMatchingProposalModule')
      )
    }

    return option.action.encode(data, encodeContext)
  }

  // helper function used in both match and decode
  async _match(messages: ProcessedMessage[]): Promise<
    | {
        option: ProposalModuleWithAction
        match: ActionMatch
      }
    | undefined
  > {
    const matches = await Promise.allSettled(
      this.actionOptions.map(async (option) => ({
        option,
        match: await option.action.match(messages),
      }))
    )

    const match = matches.flatMap((p) =>
      p.status === 'fulfilled' && p.value.match
        ? [
            {
              option: p.value.option,
              match: p.value.match,
            },
          ]
        : []
    )[0]

    return match
  }

  async match(messages: ProcessedMessage[]): Promise<ActionMatch> {
    return (await this._match(messages))?.match || false
  }

  async decode(
    messages: ProcessedMessage[]
  ): Promise<UpdatePreProposeConfigData> {
    const match = await this._match(messages)
    // Should never happen since `match` confirms one of these options match.
    if (!match) {
      throw new Error('No matching action')
    }

    return {
      proposalModuleAddress: match.option.proposalModule.address,
      data: await match.option.action.decode(messages),
    }
  }
}
