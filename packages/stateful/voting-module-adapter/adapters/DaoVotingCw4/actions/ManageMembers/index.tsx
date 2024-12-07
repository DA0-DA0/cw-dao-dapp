import { Cw4VotingModule } from '@dao-dao/state/clients'
import { daoVotingCw4Queries } from '@dao-dao/state/query'
import { ActionBase, PeopleEmoji } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { AddressInput, EntityDisplay } from '../../../../../components'
import { useLoadingVotingModuleInfo } from '../../hooks/useLoadingVotingModuleInfo'
import {
  ManageMembersData,
  ManageMembersComponent as StatelessManageMembersComponent,
} from './Component'

const Component: ActionComponent = (props) => {
  const loadingMembers = useLoadingVotingModuleInfo({
    fetchMembers: true,
  })

  return (
    <StatelessManageMembersComponent
      {...props}
      options={{
        currentMembers:
          loadingMembers.loading || loadingMembers.errored
            ? { loading: true }
            : {
                loading: false,
                data:
                  loadingMembers.data.members?.map(({ addr }) => addr) || [],
              },
        AddressInput,
        EntityDisplay,
      }}
    />
  )
}

export class ManageMembersAction extends ActionBase<ManageMembersData> {
  public readonly key = ActionKey.ManageMembers
  public readonly Component = Component

  protected _defaults: ManageMembersData = {
    toAdd: [],
    toRemove: [],
  }

  private votingModule: Cw4VotingModule
  private cw4GroupAddress = ''

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    if (!(options.context.dao.votingModule instanceof Cw4VotingModule)) {
      throw new Error('Not a CW4 voting module')
    }

    super(options, {
      Icon: PeopleEmoji,
      label: options.t('title.manageMembers'),
      description: options.t('info.manageMembersActionDescription'),
      // Show at the top.
      listOrder: 1,
    })

    this.votingModule = options.context.dao.votingModule
  }

  async setup() {
    this.cw4GroupAddress = await this.options.queryClient.fetchQuery(
      daoVotingCw4Queries.groupContract(this.options.queryClient, {
        chainId: this.votingModule.chainId,
        contractAddress: this.votingModule.address,
      })
    )
  }

  encode({ toAdd, toRemove }: ManageMembersData): UnifiedCosmosMsg {
    if (!this.cw4GroupAddress) {
      throw new Error('Manage members action not initialized')
    }

    return makeExecuteSmartContractMessage({
      chainId: this.options.chain.chainId,
      sender: this.options.address,
      contractAddress: this.cw4GroupAddress,
      msg: {
        update_members: {
          add: toAdd,
          remove: toRemove,
        },
      },
    })
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return objectMatchesStructure(decodedMessage, {
      wasm: {
        execute: {
          msg: {
            update_members: {
              add: {},
              remove: {},
            },
          },
        },
      },
    })
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): ManageMembersData {
    return {
      toAdd: decodedMessage.wasm.execute.msg.update_members.add,
      toRemove: decodedMessage.wasm.execute.msg.update_members.remove,
    }
  }
}
