import { HugeDecimal } from '@dao-dao/math'
import { tokenQueries } from '@dao-dao/state/query'
import { ActionBase, NumbersEmoji } from '@dao-dao/stateless'
import {
  DepositRefundPolicy,
  Feature,
  TokenType,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  ActionChainContextType,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { PercentageThreshold } from '@dao-dao/types/contracts/DaoProposalMultiple'
import { Config as SingleChoiceConfig } from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import { Config as SecretSingleChoiceConfig } from '@dao-dao/types/contracts/SecretDaoProposalSingle'
import {
  ContractName,
  DaoProposalMultipleAdapterId,
  convertCosmosVetoConfigToVeto,
  convertDurationToDurationWithUnits,
  getNativeTokenForChainId,
  isNeutronForkVersion,
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import {
  SecretSingleChoiceProposalModule,
  SingleChoiceProposalModule,
} from '../../../../clients'
import { DaoProposalMultipleAdapter } from '../../../../proposal-module-adapter'
import { makeDefaultNewDao } from '../../../../recoil'
import { EnableMultipleChoiceComponent } from './Component'

export class EnableMultipleChoiceAction extends ActionBase<{}> {
  public readonly key = ActionKey.EnableMultipleChoice
  public readonly Component = EnableMultipleChoiceComponent

  protected _defaults = {}

  constructor(options: ActionOptions) {
    // Disallow usage if:
    // - not a DAO
    // - DAO doesn't support multiple choice proposals
    // - Neutron fork SubDAO
    // - chain is not supported (type-check, implied by DAO check)
    //
    // Disallows creation via `hideWithPicker` (at the bottom) if:
    // - multiple choice proposal module already exists
    // - single-choice approval flow is enabled, since multiple choice doesn't
    //   support approval flow right now and that would be confusing.
    if (
      options.context.type !== ActionContextType.Dao ||
      !options.context.dao.supports(Feature.MultipleChoiceProposals) ||
      // Neutron fork SubDAOs don't support multiple choice proposals due to the
      // timelock/overrule system only being designed for single choice
      // proposals.
      isNeutronForkVersion(options.context.dao.coreVersion) ||
      options.chainContext.type !== ActionChainContextType.Supported
    ) {
      throw new Error('Invalid context for enabling multiple choice proposals')
    }

    super(options, {
      Icon: NumbersEmoji,
      label: options.t('title.enableMultipleChoiceProposals'),
      description: options.t('info.enableMultipleChoiceProposalsDescription'),
      notReusable: true,
      // Disallow creation if:
      // - multiple choice proposal module already exists
      // - single-choice approval flow is enabled, since multiple choice doesn't
      //   support approval flow right now and that would be confusing.
      hideFromPicker: options.context.dao.proposalModules.some(
        ({ contractName, prePropose }) =>
          DaoProposalMultipleAdapter.contractNames.some((name) =>
            contractName.includes(name)
          ) ||
          prePropose?.contractName === ContractName.PreProposeApprovalSingle
      ),
    })
  }

  async encode(): Promise<UnifiedCosmosMsg> {
    // Type-check. This is already checked in the constructor.
    if (
      this.options.context.type !== ActionContextType.Dao ||
      this.options.chainContext.type !== ActionChainContextType.Supported
    ) {
      throw new Error('Invalid context for enabling multiple choice proposals')
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

    const [config, depositInfoWithToken] = await Promise.all([
      this.options.queryClient.fetchQuery<
        SingleChoiceConfig | SecretSingleChoiceConfig
      >(
        // Type-cast since we know the module is either a single choice or
        // secret single choice proposal module.
        singleChoiceProposalModule.getConfigQuery() as any
      ),
      this.options.queryClient
        .fetchQuery(singleChoiceProposalModule.getDepositInfoQuery())
        .then(async (depositInfo) =>
          depositInfo
            ? {
                depositInfo,
                token: await this.options.queryClient.fetchQuery(
                  tokenQueries.info(this.options.queryClient, {
                    chainId: this.options.chain.chainId,
                    type:
                      'cw20' in depositInfo.denom
                        ? TokenType.Cw20
                        : TokenType.Native,
                    denomOrAddress:
                      'cw20' in depositInfo.denom
                        ? depositInfo.denom.cw20
                        : depositInfo.denom.native,
                  })
                ),
              }
            : {
                depositInfo,
              }
        ),
    ])

    const quorum: PercentageThreshold =
      'threshold_quorum' in config.threshold
        ? config.threshold.threshold_quorum.quorum
        : {
            percent: '0.2',
          }

    const newDao = makeDefaultNewDao(this.options.chain.chainId)
    const info = DaoProposalMultipleAdapter.daoCreation.getInstantiateInfo(
      this.options.chainContext.config,
      {
        ...newDao,
        votingConfig: {
          ...newDao.votingConfig,
          quorum: {
            majority: 'majority' in quorum,
            value: 'majority' in quorum ? 50 : Number(quorum.percent) * 100,
          },
          votingDuration: convertDurationToDurationWithUnits(
            config.max_voting_period
          ),
          proposalDeposit: {
            enabled: !!depositInfoWithToken.depositInfo,
            amount: depositInfoWithToken.depositInfo
              ? HugeDecimal.from(
                  depositInfoWithToken.depositInfo.amount
                ).toHumanReadableString(depositInfoWithToken.token.decimals)
              : '10',
            type:
              depositInfoWithToken.depositInfo &&
              'cw20' in depositInfoWithToken.depositInfo.denom
                ? 'cw20'
                : 'native',
            denomOrAddress: depositInfoWithToken.depositInfo
              ? 'cw20' in depositInfoWithToken.depositInfo.denom
                ? depositInfoWithToken.depositInfo.denom.cw20
                : depositInfoWithToken.depositInfo.denom.native
              : getNativeTokenForChainId(this.options.chain.chainId)
                  .denomOrAddress,
            token: depositInfoWithToken.token,
            refundPolicy:
              depositInfoWithToken.depositInfo?.refund_policy ??
              DepositRefundPolicy.OnlyPassed,
          },
          anyoneCanPropose: singleChoiceProposalModule.prePropose
            ? 'anyone' in singleChoiceProposalModule.prePropose.submissionPolicy
            : // If no pre-propose module, default to only members can propose.
              false,
          allowRevoting: config.allow_revoting,
          approver: {
            enabled: false,
            address: '',
          },
          veto: convertCosmosVetoConfigToVeto(
            'veto' in config ? config.veto : null
          ),
        },
      },
      {
        ...makeDefaultNewDao(this.options.chain.chainId).votingConfig,
        enableMultipleChoice: true,
        overrideContractVersion: this.options.context.dao.coreVersion,
      },
      this.options.t
    )

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
    return (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
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
      }) &&
      (decodedMessage.wasm.execute.msg.update_proposal_modules.to_add[0].label.startsWith(
        'dao-proposal-multiple'
      ) ||
        // backwards compatibility
        decodedMessage.wasm.execute.msg.update_proposal_modules.to_add[0].label.endsWith(
          DaoProposalMultipleAdapterId
        ))
    )
  }

  decode() {
    return {}
  }
}
