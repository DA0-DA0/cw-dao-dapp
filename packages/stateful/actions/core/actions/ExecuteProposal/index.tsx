import { useQueryClient } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'

import { getProposalModule } from '@dao-dao/state/clients'
import { daoQueries } from '@dao-dao/state/query'
import { ActionBase, KeyEmoji } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import {
  getChainAddressForActionOptions,
  isValidBech32Address,
  makeExecuteSmartContractMessage,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  AddressInput,
  DaoProviders,
  ProposalLine,
  ProposalList,
} from '../../../../components'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import {
  ExecuteProposalData,
  ExecuteProposalComponent as StatelessExecuteProposalComponent,
} from './Component'

const Component: ActionComponent<undefined, ExecuteProposalData> = (props) => {
  const { watch } = useFormContext<ExecuteProposalData>()

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const coreAddress = watch(
    (props.fieldNamePrefix + 'coreAddress') as 'coreAddress'
  )

  const queryClient = useQueryClient()
  const selectedDaoInfo = useQueryLoadingDataWithError(
    daoQueries.info(
      queryClient,
      chainId && coreAddress && isValidBech32Address(coreAddress)
        ? {
            chainId,
            coreAddress,
          }
        : undefined
    )
  )

  return (
    <StatelessExecuteProposalComponent
      {...props}
      options={{
        selectedDaoInfo,
        AddressInput,
        ProposalLine,
        ProposalList,
        DaoProviders,
      }}
    />
  )
}

export class ExecuteProposalAction extends ActionBase<ExecuteProposalData> {
  public readonly key = ActionKey.ExecuteProposal
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: KeyEmoji,
      label: options.t('title.executeProposal'),
      description: options.t('info.executeProposalDescription'),
    })

    this.defaults = {
      chainId: options.chain.chainId,
      coreAddress: '',
      proposalModuleAddress: '',
      proposalId: -1,
    }
  }

  encode({
    chainId,
    proposalModuleAddress,
    proposalId,
  }: ExecuteProposalData): UnifiedCosmosMsg[] {
    const sender = getChainAddressForActionOptions(this.options, chainId)
    if (!sender) {
      throw new Error('No sender found for chain')
    }

    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      makeExecuteSmartContractMessage({
        chainId,
        sender,
        contractAddress: proposalModuleAddress,
        msg: {
          execute: {
            proposal_id: proposalId,
          },
        },
      })
    )
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return objectMatchesStructure(decodedMessage.wasm.execute.msg, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            execute: {
              proposal_id: {},
            },
          },
        },
      },
    })
  }

  async decode([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<ExecuteProposalData> {
    const proposalModule = await getProposalModule({
      queryClient: this.options.queryClient,
      chainId,
      address: decodedMessage.wasm.execute.contract_addr,
    })

    return {
      chainId,
      coreAddress: proposalModule.dao.coreAddress,
      proposalModuleAddress: decodedMessage.wasm.execute.contract_addr,
      proposalId: decodedMessage.wasm.execute.msg.veto.proposal_id,
    }
  }
}
