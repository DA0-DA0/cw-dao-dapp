import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { daoQueries } from '@dao-dao/state/query'
import { DaoPreProposeApprovalSingleSelectors } from '@dao-dao/state/recoil'
import {
  ActionBase,
  PersonRaisingHandEmoji,
  useActionOptions,
  useCachedLoading,
} from '@dao-dao/stateless'
import {
  Feature,
  ModuleInstantiateInfo,
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
import { InstantiateMsg as DaoPreProposeApproverInstantiateMsg } from '@dao-dao/types/contracts/DaoPreProposeApprover'
import {
  InstantiateMsg as DaoProposalSingleInstantiateMsg,
  Config as SingleChoiceConfig,
} from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import { Config as SecretSingleChoiceConfig } from '@dao-dao/types/contracts/SecretDaoProposalSingle'
import {
  DaoProposalSingleAdapterId,
  decodeJsonFromBase64,
  encodeJsonToBase64,
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  SecretSingleChoiceProposalModule,
  SingleChoiceProposalModule,
} from '../../../../clients'
import { EntityDisplay } from '../../../../components/EntityDisplay'
import { useQueryLoadingDataWithError } from '../../../../hooks'
import {
  BecomeApproverData,
  BecomeApproverComponent as StatelessComponent,
} from './Component'

const Component: ActionComponent = (props) => {
  const {
    address,
    chain: { chainId },
  } = useActionOptions()

  const { watch, setValue } = useFormContext<BecomeApproverData>()
  const preProposeApprovalSingle = watch(
    (props.fieldNamePrefix + 'address') as 'address'
  )
  // When creating, load DAO address from pre-propose module address.
  const dao = useCachedLoading(
    !props.isCreating && preProposeApprovalSingle
      ? DaoPreProposeApprovalSingleSelectors.daoSelector({
          chainId,
          contractAddress: preProposeApprovalSingle,
          params: [],
        })
      : undefined,
    undefined
  )
  useEffect(() => {
    if (!props.isCreating && !dao.loading && dao.data) {
      setValue((props.fieldNamePrefix + 'dao') as 'dao', dao.data)
    }
  }, [dao, props.fieldNamePrefix, props.isCreating, setValue])

  const queryClient = useQueryClient()
  const options = useQueryLoadingDataWithError(
    daoQueries.listPotentialApprovalDaos(queryClient, {
      chainId,
      address,
    })
  )

  return (
    <StatelessComponent
      {...props}
      options={{
        options,
        EntityDisplay,
      }}
    />
  )
}

export class BecomeApproverAction extends ActionBase<BecomeApproverData> {
  public readonly key = ActionKey.BecomeApprover
  public readonly Component = Component

  protected _defaults: BecomeApproverData = {
    address: '',
  }

  constructor(options: ActionOptions) {
    if (
      options.context.type !== ActionContextType.Dao ||
      !options.context.dao.supports(Feature.Approval)
    ) {
      throw new Error('Invalid context for becoming an approver')
    }

    super(options, {
      Icon: PersonRaisingHandEmoji,
      label: options.t('title.becomeApprover'),
      description: options.t('info.becomeApproverDescription'),
    })
  }

  async encode({
    address: preProposeApprovalContract,
  }: BecomeApproverData): Promise<UnifiedCosmosMsg> {
    // Type-check. This is already checked in the constructor.
    if (
      this.options.context.type !== ActionContextType.Dao ||
      this.options.chainContext.type !== ActionChainContextType.Supported
    ) {
      throw new Error('Invalid context for becoming an approver')
    }

    if (!preProposeApprovalContract) {
      throw new Error('No DAO selected.')
    }

    const singleChoiceProposalModule =
      this.options.context.dao.proposalModules.find(
        (module) =>
          module instanceof SingleChoiceProposalModule ||
          module instanceof SecretSingleChoiceProposalModule
      )
    if (!singleChoiceProposalModule) {
      throw new Error('No single choice proposal module found')
    }

    const config = await this.options.queryClient.fetchQuery<
      SingleChoiceConfig | SecretSingleChoiceConfig
    >(
      // Type-cast since we know the module is either a single choice or
      // secret single choice proposal module.
      singleChoiceProposalModule.getConfigQuery() as any
    )

    const info: ModuleInstantiateInfo = {
      admin: { core_module: {} },
      code_id: this.options.chainContext.config.codeIds.DaoProposalSingle,
      label: `dao-proposal-single_approver_${Date.now()}`,
      msg: encodeJsonToBase64({
        threshold: config.threshold,
        allow_revoting: config.allow_revoting,
        close_proposal_on_execution_failure:
          'close_proposal_on_execution_failure' in config
            ? config.close_proposal_on_execution_failure
            : true,
        min_voting_period:
          'min_voting_period' in config ? config.min_voting_period : undefined,
        max_voting_period: config.max_voting_period,
        only_members_execute: config.only_members_execute,
        veto: 'veto' in config ? config.veto : undefined,
        pre_propose_info: {
          module_may_propose: {
            info: {
              admin: { core_module: {} },
              code_id:
                this.options.chainContext.config.codeIds.DaoPreProposeApprover,
              label: `dao-pre-propose-approver_${Date.now()}`,
              msg: encodeJsonToBase64({
                pre_propose_approval_contract: preProposeApprovalContract,
              } as DaoPreProposeApproverInstantiateMsg),
              funds: [],
            },
          },
        },
      } as DaoProposalSingleInstantiateMsg),
      funds: [],
    }

    return makeExecuteSmartContractMessage({
      chainId: this.options.chain.chainId,
      contractAddress: this.options.address,
      sender: this.options.address,
      msg: {
        update_proposal_modules: {
          to_add: [info],
          to_disable: [],
        },
      },
    })
  }

  match([{ decodedMessage }]: ProcessedMessage[]): ActionMatch {
    if (
      !objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              update_proposal_modules: {
                to_add: [
                  {
                    admin: {},
                    code_id: {},
                    label: {},
                    msg: {},
                  },
                ],
                to_disable: [],
              },
            },
          },
        },
      })
    ) {
      return false
    }

    const info =
      decodedMessage.wasm.execute.msg.update_proposal_modules.to_add[0]
    const parsedMsg = decodeJsonFromBase64(info.msg, true)
    if (
      (!info.label.startsWith('dao-proposal-single_approver') &&
        // backwards compatibility
        !info.label.endsWith(`${DaoProposalSingleAdapterId}_approver`)) ||
      !objectMatchesStructure(parsedMsg, {
        pre_propose_info: {
          module_may_propose: {
            info: {
              msg: {},
            },
          },
        },
      }) ||
      !parsedMsg.pre_propose_info.module_may_propose.info.label.includes(
        'approver'
      )
    ) {
      return false
    }

    const parsedPreProposeMsg = decodeJsonFromBase64(
      parsedMsg.pre_propose_info.module_may_propose.info.msg,
      true
    )
    return objectMatchesStructure(parsedPreProposeMsg, {
      pre_propose_approval_contract: {},
    })
  }

  decode([{ decodedMessage }]: ProcessedMessage[]): BecomeApproverData {
    const parsedPreProposeMsg = decodeJsonFromBase64(
      decodeJsonFromBase64(
        decodedMessage.wasm.execute.msg.update_proposal_modules.to_add[0].msg,
        true
      ).pre_propose_info.module_may_propose.info.msg,
      true
    )

    return {
      address: parsedPreProposeMsg.pre_propose_approval_contract,
    }
  }
}
