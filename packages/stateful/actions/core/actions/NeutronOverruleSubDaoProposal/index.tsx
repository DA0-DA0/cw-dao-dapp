import {
  contractQueries,
  neutronCwdSubdaoTimelockSingleQueries,
} from '@dao-dao/state'
import { getDao } from '@dao-dao/state/clients'
import { ActionBase, ThumbDownEmoji } from '@dao-dao/stateless'
import { ChainId, PreProposeModuleType } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  ContractName,
  isNeutronForkVersion,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { EntityDisplay, ProposalLine } from '../../../../components'
import {
  NeutronOverruleSubDaoProposalData,
  NeutronOverruleSubDaoProposalComponent as StatelessNeutronOverruleSubDaoProposalComponent,
} from './Component'

const Component: ActionComponent<
  undefined,
  NeutronOverruleSubDaoProposalData
> = (props) => (
  <StatelessNeutronOverruleSubDaoProposalComponent
    {...props}
    options={{
      EntityDisplay,
      ProposalLine,
    }}
  />
)

export class NeutronOverruleSubDaoProposalAction extends ActionBase<NeutronOverruleSubDaoProposalData> {
  public readonly key = ActionKey.NeutronOverruleSubDaoProposal
  public readonly Component = Component

  protected _defaults: NeutronOverruleSubDaoProposalData = {
    coreAddress: '',
    proposalId: '',
  }

  constructor(options: ActionOptions) {
    // Only usable in Neutron-fork SubDAOs.
    if (
      options.chain.chainId !== ChainId.NeutronMainnet ||
      options.context.type !== ActionContextType.Dao ||
      !isNeutronForkVersion(options.context.dao.coreVersion)
    ) {
      throw new Error('Only Neutron-forked SubDAOs can overrule proposals.')
    }

    super(options, {
      Icon: ThumbDownEmoji,
      label: options.t('title.overruleSubDaoProposal'),
      description: options.t('info.overruleSubDaoProposalDescription'),
      // Don't allow selecting in picker since Neutron fork DAO overrule
      // proposals are automatically created. This is just an action to render
      // them.
      hideFromPicker: true,
    })
  }

  // This action is just for rendering Neutron fork DAO overrule proposals.
  encode() {
    return []
  }

  async match([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<ActionMatch> {
    if (
      !objectMatchesStructure(
        decodedMessage,
        {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                overrule_proposal: {
                  proposal_id: {},
                },
              },
            },
          },
        } ||
          !(await this.options.queryClient.fetchQuery(
            contractQueries.isContract(this.options.queryClient, {
              chainId: this.options.chain.chainId,
              address: decodedMessage.wasm.execute.contract_addr,
              nameOrNames: ContractName.NeutronCwdSubdaoTimelockSingle,
            })
          ))
      )
    ) {
      return false
    }

    // Get SubDAO from the timelock module used in the message.
    const { subdao } = await this.options.queryClient.fetchQuery(
      neutronCwdSubdaoTimelockSingleQueries.config(this.options.queryClient, {
        chainId,
        contractAddress: decodedMessage.wasm.execute.contract_addr,
      })
    )

    const subDao = getDao({
      queryClient: this.options.queryClient,
      chainId,
      coreAddress: subdao,
    })
    await subDao.init()

    // Get proposal module that uses the specified timelock module.
    const proposalModule = subDao.proposalModules.find(
      ({ prePropose }) =>
        prePropose?.type === PreProposeModuleType.NeutronSubdaoSingle &&
        prePropose.config.timelockAddress ===
          decodedMessage.wasm.execute.contract_addr
    )

    return !!proposalModule
  }

  async decode([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<NeutronOverruleSubDaoProposalData> {
    // Get SubDAO from the timelock module used in the message.
    const { subdao } = await this.options.queryClient.fetchQuery(
      neutronCwdSubdaoTimelockSingleQueries.config(this.options.queryClient, {
        chainId,
        contractAddress: decodedMessage.wasm.execute.contract_addr,
      })
    )

    const subDao = getDao({
      queryClient: this.options.queryClient,
      chainId,
      coreAddress: subdao,
    })
    await subDao.init()

    // Get proposal module that uses the specified timelock module.
    const proposalModule = subDao.proposalModules.find(
      ({ prePropose }) =>
        prePropose?.type === PreProposeModuleType.NeutronSubdaoSingle &&
        prePropose.config.timelockAddress ===
          decodedMessage.wasm.execute.contract_addr
    )

    // Should never happen as this is validated in match.
    if (!proposalModule) {
      throw new Error('Proposal module not found.')
    }

    return {
      coreAddress: subdao,
      proposalId:
        proposalModule.prefix +
        decodedMessage.wasm.execute.msg.overrule_proposal.proposal_id,
    }
  }
}
