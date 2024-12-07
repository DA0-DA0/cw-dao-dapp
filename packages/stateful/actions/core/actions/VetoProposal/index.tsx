import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { getProposalModule } from '@dao-dao/state/clients'
import { contractQueries, daoQueries } from '@dao-dao/state/query'
import {
  ActionBase,
  ThumbDownEmoji,
  useActionOptions,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
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
  makeCw1WhitelistExecuteMessage,
  makeExecuteSmartContractMessage,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  AddressInput,
  EntityDisplay,
  ProposalLine,
} from '../../../../components'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import { daosWithVetoableProposalsSelector } from '../../../../recoil'
import {
  VetoProposalComponent as StatelessVetoProposalComponent,
  VetoProposalData,
} from './Component'

const Component: ActionComponent<undefined, VetoProposalData> = (props) => {
  const { isCreating, fieldNamePrefix } = props
  const {
    chain: { chainId: daoChainId },
    address,
  } = useActionOptions()
  const { watch, setValue } = useFormContext<VetoProposalData>()

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const coreAddress = watch(
    (props.fieldNamePrefix + 'coreAddress') as 'coreAddress'
  )
  const proposalId = watch(
    (props.fieldNamePrefix + 'proposalId') as 'proposalId'
  )

  const daoVetoableProposals = useCachedLoadingWithError(
    daosWithVetoableProposalsSelector({
      chainId: daoChainId,
      coreAddress: address,
      // Include even those not registered in the DAO's list.
      includeAll: true,
    })
  )

  // If no DAO selected, autoselect first one.
  useEffect(() => {
    if (
      !isCreating ||
      (chainId && coreAddress) ||
      daoVetoableProposals.loading ||
      daoVetoableProposals.errored ||
      daoVetoableProposals.data.length === 0
    ) {
      return
    }

    setValue(
      (fieldNamePrefix + 'chainId') as 'chainId',
      daoVetoableProposals.data[0].chainId
    )
    setValue(
      (fieldNamePrefix + 'coreAddress') as 'coreAddress',
      daoVetoableProposals.data[0].dao
    )
  }, [
    chainId,
    coreAddress,
    daoVetoableProposals,
    fieldNamePrefix,
    isCreating,
    setValue,
  ])

  const queryClient = useQueryClient()
  const selectedDaoInfo = useQueryLoadingDataWithError(
    daoQueries.info(
      queryClient,
      chainId && coreAddress
        ? {
            chainId,
            coreAddress,
          }
        : undefined
    )
  )

  // Select first proposal once loaded if nothing selected.
  useEffect(() => {
    if (
      isCreating &&
      !daoVetoableProposals.loading &&
      !daoVetoableProposals.errored &&
      !proposalId &&
      daoVetoableProposals.data.length > 0
    ) {
      setValue(
        (fieldNamePrefix + 'chainId') as 'chainId',
        daoVetoableProposals.data[0].chainId
      )
      setValue(
        (fieldNamePrefix + 'coreAddress') as 'coreAddress',
        daoVetoableProposals.data[0].dao
      )
      setValue(
        (fieldNamePrefix + 'proposalModuleAddress') as 'proposalModuleAddress',
        daoVetoableProposals.data[0].proposalsWithModule[0].proposalModule
          .address
      )
      setValue(
        (fieldNamePrefix + 'proposalId') as 'proposalId',
        daoVetoableProposals.data[0].proposalsWithModule[0].proposals[0].id
      )
    }
  }, [isCreating, proposalId, setValue, fieldNamePrefix, daoVetoableProposals])

  return (
    <StatelessVetoProposalComponent
      {...props}
      options={{
        selectedDaoInfo,
        daoVetoableProposals,
        AddressInput,
        EntityDisplay,
        ProposalLine,
      }}
    />
  )
}

export class VetoProposalAction extends ActionBase<VetoProposalData> {
  public readonly key = ActionKey.VetoProposal
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: ThumbDownEmoji,
      label: options.t('title.vetoProposal'),
      description: options.t('info.vetoProposalDescription'),
    })

    this.defaults = {
      chainId: options.chain.chainId,
      coreAddress: '',
      proposalModuleAddress: '',
      proposalId: -1,
    }
  }

  async encode({
    chainId,
    proposalModuleAddress,
    proposalId,
  }: VetoProposalData): Promise<UnifiedCosmosMsg[]> {
    const sender = getChainAddressForActionOptions(this.options, chainId)
    if (!sender) {
      throw new Error('No sender found for chain')
    }

    const proposalModule = await getProposalModule({
      queryClient: this.options.queryClient,
      chainId,
      address: proposalModuleAddress,
    })

    const { proposal } = await proposalModule.getProposal({
      proposalId,
    })

    const isCw1Whitelist = proposal.veto
      ? await this.options.queryClient.fetchQuery(
          contractQueries.isCw1Whitelist(this.options.queryClient, {
            chainId,
            address: proposal.veto.vetoer,
          })
        )
      : false

    const msg = makeExecuteSmartContractMessage({
      chainId,
      sender: isCw1Whitelist ? proposal.veto.vetoer : sender,
      contractAddress: proposalModuleAddress,
      msg: {
        veto: {
          proposal_id: proposalId,
        },
      },
    })

    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      isCw1Whitelist
        ? makeCw1WhitelistExecuteMessage({
            chainId,
            sender,
            cw1WhitelistContract: proposal.veto.vetoer,
            msg,
          })
        : msg
    )
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    return objectMatchesStructure(decodedMessage.wasm.execute.msg, {
      wasm: {
        execute: {
          contract_addr: {},
          funds: {},
          msg: {
            veto: {
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
  ]: ProcessedMessage[]): Promise<VetoProposalData> {
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
