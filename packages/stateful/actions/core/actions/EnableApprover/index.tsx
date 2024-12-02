import { contractQueries } from '@dao-dao/state/query'
import { ActionBase, PersonRaisingHandEmoji } from '@dao-dao/stateless'
import {
  Feature,
  IProposalModuleBase,
  ModuleInstantiateInfo,
  PreProposeModuleType,
  SecretModuleInstantiateInfo,
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
import { PreProposeInfo } from '@dao-dao/types/contracts/DaoDaoCore'
import { InstantiateMsg as DaoPreProposeApprovalSingleInstantiateMsg } from '@dao-dao/types/contracts/DaoPreProposeApprovalSingle'
import { InstantiateMsg as SecretDaoPreProposeApprovalSingleInstantiateMsg } from '@dao-dao/types/contracts/SecretDaoPreProposeApprovalSingle'
import {
  decodeJsonFromBase64,
  encodeJsonToBase64,
  isFeatureSupportedByVersion,
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  MultipleChoiceProposalModule,
  SecretMultipleChoiceProposalModule,
  SecretSingleChoiceProposalModule,
  SingleChoiceProposalModule,
} from '../../../../clients'
import { AddressInput } from '../../../../components'
import { EnableApproverComponent, EnableApproverData } from './Component'

const Component: ActionComponent = (props) => (
  <EnableApproverComponent {...props} options={{ AddressInput }} />
)

export class EnableApproverAction extends ActionBase<EnableApproverData> {
  public readonly key = ActionKey.EnableApprover
  public readonly Component = Component

  private validProposalModules: IProposalModuleBase[]

  protected _defaults = {
    approver: '',
  }

  constructor(options: ActionOptions) {
    // Disallow usage if:
    // - not a DAO
    // - DAO is not on a supported version
    //
    // Disallows creation via `hideWithPicker` (at the bottom) if:
    // - approver is already enabled
    if (
      options.context.type !== ActionContextType.Dao ||
      !options.context.dao.supports(Feature.Approval)
    ) {
      throw new Error('Invalid context for enabling approver')
    }

    super(options, {
      Icon: PersonRaisingHandEmoji,
      label: options.t('title.enableApprover'),
      description: options.t('info.enableApproverDescription'),
      notReusable: true,
    })

    // Can only add approver to proposal modules that are on a supported version
    // and have no pre-propose module or use the normal pre-propose modules.
    this.validProposalModules = options.context.dao.proposalModules.filter(
      (m) =>
        isFeatureSupportedByVersion(Feature.Approval, m.version) &&
        (!m.prePropose || m.prePropose.type === PreProposeModuleType.Normal)
    )

    // Disallow creation if no proposal modules can have approval added.
    this.metadata.hideFromPicker = this.validProposalModules.length === 0
  }

  async encode({ approver }: EnableApproverData): Promise<UnifiedCosmosMsg[]> {
    // Type-check. This is already checked in the constructor.
    if (
      this.options.context.type !== ActionContextType.Dao ||
      this.options.chainContext.type !== ActionChainContextType.Supported
    ) {
      throw new Error('Invalid context for enabling approver')
    }

    // Error if any are multiple choice since approval does not yet support
    // multiple choice proposals.
    if (
      this.options.context.dao.proposalModules.some(
        (m) =>
          m instanceof MultipleChoiceProposalModule ||
          m instanceof SecretMultipleChoiceProposalModule
      )
    ) {
      throw new Error(
        this.options.t('error.multipleChoiceApprovalNotYetSupported')
      )
    }

    const { allCodeIds, allCodeHashes } = this.options.chainContext.config

    return await Promise.all(
      this.validProposalModules.map(async (m) => {
        const isSecretSingle = m instanceof SecretSingleChoiceProposalModule
        const isSecretMultiple = m instanceof SecretMultipleChoiceProposalModule
        const isSecret = isSecretSingle || isSecretMultiple

        const isSingle =
          m instanceof SingleChoiceProposalModule ||
          m instanceof SecretSingleChoiceProposalModule

        let codeId
        let codeHash

        if (isSingle) {
          codeId = allCodeIds[m.version]?.DaoPreProposeApprovalSingle
          codeHash = allCodeHashes?.[m.version]?.DaoPreProposeApprovalSingle
        } else {
          throw new Error(
            this.options.t('error.multipleChoiceApprovalNotYetSupported')
          )

          // TODO(approver-multiple): not yet ready
          // codeId = allCodeIds[m.version]?.DaoPreProposeApprovalMultiple
          // codeHash = allCodeHashes[m.version]?.DaoPreProposeApprovalMultiple
        }

        if (!codeId) {
          throw new Error(
            'Pre-propose approval module code ID not found for this version'
          )
        }

        if (isSecret && !codeHash) {
          throw new Error(
            'Pre-propose approval module code hash not found for this version'
          )
        }

        const depositInfo = await this.options.queryClient.fetchQuery(
          m.getDepositInfoQuery()
        )

        let msg
        if (isSecret) {
          const secretDenomCodeHash =
            depositInfo && 'cw20' in depositInfo.denom
              ? await this.options.queryClient.fetchQuery(
                  contractQueries.secretCodeHash({
                    chainId: this.options.chain.chainId,
                    address: depositInfo.denom.cw20,
                  })
                )
              : ''

          const _msg: SecretDaoPreProposeApprovalSingleInstantiateMsg = {
            deposit_info: depositInfo && {
              amount: depositInfo.amount,
              denom: {
                token: {
                  // transform standard deposit info shape into secret network
                  // snip20 shape if necessary
                  denom:
                    'cw20' in depositInfo.denom
                      ? {
                          snip20: [depositInfo.denom.cw20, secretDenomCodeHash],
                        }
                      : depositInfo.denom,
                },
              },
              refund_policy: depositInfo.refund_policy,
            },
            extension: {
              approver,
            },
            // If pre-propose module already exists, check if open to anyone.
            // Otherwise, no pre-propose module is set, and thus anyone can
            // propose.
            open_proposal_submission:
              !m.prePropose || 'anyone' in m.prePropose.submissionPolicy,
            proposal_module_code_hash:
              (isSecretSingle
                ? allCodeHashes?.[m.version]?.DaoProposalSingle
                : allCodeHashes?.[m.version]?.DaoProposalMultiple) || '',
          }
          msg = _msg
        } else {
          const _msg: DaoPreProposeApprovalSingleInstantiateMsg = {
            deposit_info: depositInfo && {
              amount: depositInfo.amount,
              denom: {
                token: {
                  denom: depositInfo.denom,
                },
              },
              refund_policy: depositInfo.refund_policy,
            },
            extension: {
              approver,
            },
            ...(isFeatureSupportedByVersion(
              Feature.GranularSubmissionPolicy,
              m.version
            )
              ? {
                  // If pre-propose module already exists, copy over submission
                  // policy. Otherwise, no pre-propose module is set, and thus
                  // anyone can propose.
                  submission_policy: m.prePropose?.submissionPolicy || {
                    anyone: {
                      denylist: [],
                    },
                  },
                }
              : {
                  // If pre-propose module already exists, check if open to
                  // anyone. Otherwise, no pre-propose module is set, and thus
                  // anyone can propose.
                  open_proposal_submission:
                    !m.prePropose || 'anyone' in m.prePropose.submissionPolicy,
                }),
          }
          msg = _msg
        }

        return makeExecuteSmartContractMessage({
          chainId: this.options.chain.chainId,
          contractAddress: m.address,
          sender: this.options.address,
          msg: {
            update_pre_propose_info: {
              info: {
                module_may_propose: {
                  info: isSecret
                    ? ({
                        admin: { core_module: {} },
                        code_hash: codeHash || '',
                        code_id: codeId,
                        funds: [],
                        label: `dao-pre-propose-approval-${
                          isSingle ? 'single' : 'multiple'
                        }_${Date.now()}`,
                        msg: encodeJsonToBase64(msg),
                      } as SecretModuleInstantiateInfo)
                    : ({
                        admin: { core_module: {} },
                        code_id: codeId,
                        label: `dao-pre-propose-approval-${
                          isSingle ? 'single' : 'multiple'
                        }_${Date.now()}`,
                        msg: encodeJsonToBase64(msg),
                        // Conditionally include funds field.
                        ...(isFeatureSupportedByVersion(
                          Feature.ModuleInstantiateFunds,
                          m.version
                        ) && {
                          funds: [],
                        }),
                      } as ModuleInstantiateInfo),
                },
              } as PreProposeInfo,
            },
          },
        })
      })
    )
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    // Type-check. This is already checked in the constructor.
    if (
      this.options.context.type !== ActionContextType.Dao ||
      this.options.chainContext.type !== ActionChainContextType.Supported
    ) {
      throw new Error('Invalid context for enabling approver')
    }

    const { allCodeIds } = this.options.chainContext.config

    let count = 0
    let approver = ''

    for (const { decodedMessage } of messages) {
      if (
        objectMatchesStructure(decodedMessage, {
          wasm: {
            execute: {
              contract_addr: {},
              msg: {
                update_pre_propose_info: {
                  info: {
                    module_may_propose: {
                      info: {
                        admin: {},
                        code_id: {},
                        label: {},
                        msg: {},
                      },
                    },
                  },
                },
              },
            },
          },
        }) &&
        // Ensure expected label
        decodedMessage.wasm.execute.msg.update_pre_propose_info.info.module_may_propose.info.label.startsWith(
          'dao-pre-propose-approval-'
        ) &&
        // Ensure supported code ID
        Object.values(allCodeIds).some(
          (config) =>
            // TODO(approver-multiple): also check for DaoPreProposeApprovalMultiple
            config.DaoPreProposeApprovalSingle ===
            decodedMessage.wasm.execute.msg.update_pre_propose_info.info
              .module_may_propose.info.code_id
        )
      ) {
        const decodedInstantiate = decodeJsonFromBase64(
          decodedMessage.wasm.execute.msg.update_pre_propose_info.info
            .module_may_propose.info.msg
        )
        if (
          objectMatchesStructure(decodedInstantiate, {
            extension: {
              approver: {},
            },
          })
        ) {
          // Ensure approver is the same for every message, or else we should
          // render a separate action for each different approver. Set approver
          // on the first message match, and validate for the rest.
          if (count === 0) {
            approver = decodedInstantiate.extension.approver
          } else if (approver !== decodedInstantiate.extension.approver) {
            break
          }
          count += 1
        }
      }
    }

    return count
  }

  // The match function ensures all messages have the same approver, so we only
  // need to decode one.
  decode([{ decodedMessage }]: ProcessedMessage[]): EnableApproverData {
    const decodedInstantiate = decodeJsonFromBase64(
      decodedMessage.wasm.execute.msg.update_pre_propose_info.info
        .module_may_propose.info.msg
    )

    return {
      approver: decodedInstantiate.extension.approver,
    }
  }
}
