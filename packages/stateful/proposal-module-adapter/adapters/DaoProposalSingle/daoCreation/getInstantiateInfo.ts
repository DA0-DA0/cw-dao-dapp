import { HugeDecimal } from '@dao-dao/math'
import {
  SecretSingleChoiceProposalModule,
  SingleChoiceProposalModule,
} from '@dao-dao/state/clients'
import {
  DaoCreationGetInstantiateInfo,
  PercentOrMajorityValue,
  TokenType,
} from '@dao-dao/types'
import { PercentageThreshold } from '@dao-dao/types/contracts/DaoProposalSingle.common'
import {
  TokenBasedCreatorId,
  convertDurationWithUnitsToDuration,
  convertVetoConfigToCosmos,
  isSecretNetwork,
} from '@dao-dao/utils'

import { CreatorData as TokenBasedCreatorData } from '../../../../creators/TokenBased/types'
import { DaoCreationExtraVotingConfig } from '../types'

export const getInstantiateInfo: DaoCreationGetInstantiateInfo<
  DaoCreationExtraVotingConfig
> = (
  { chainId },
  {
    creator: { id, data },
    votingConfig: {
      quorum,
      votingDuration,
      proposalDeposit,
      anyoneCanPropose,
      onlyMembersExecute,
      allowRevoting,
      approver,
      veto,
    },
  },
  { quorumEnabled, threshold }
) => {
  const commonConfig = {
    threshold: quorumEnabled
      ? {
          threshold_quorum: {
            quorum: convertPercentOrMajorityValueToPercentageThreshold(quorum),
            threshold:
              convertPercentOrMajorityValueToPercentageThreshold(threshold),
          },
        }
      : {
          absolute_percentage: {
            percentage:
              convertPercentOrMajorityValueToPercentageThreshold(threshold),
          },
        },
    maxVotingPeriod: convertDurationWithUnitsToDuration(votingDuration),
    allowRevoting,
    veto: convertVetoConfigToCosmos(veto),
    approver: approver.enabled ? approver.address : undefined,
    submissionPolicy: anyoneCanPropose ? 'anyone' : 'members',
    onlyMembersExecute: onlyMembersExecute,
  } as const

  const votingModuleTokenType =
    (id === TokenBasedCreatorId &&
      (data as TokenBasedCreatorData).selectedTokenType) ||
    undefined

  if (isSecretNetwork(chainId)) {
    if (
      proposalDeposit.enabled &&
      proposalDeposit.type === 'cw20' &&
      !proposalDeposit.token?.snip20CodeHash
    ) {
      throw new Error('SNIP20 proposal deposit token code hash not loaded')
    }

    return SecretSingleChoiceProposalModule.generateModuleInstantiateInfo(
      chainId,
      {
        ...commonConfig,
        deposit: proposalDeposit.enabled
          ? {
              amount: HugeDecimal.fromHumanReadable(
                proposalDeposit.amount,
                proposalDeposit.token?.decimals ?? 0
              ).toString(),
              denom:
                proposalDeposit.type === 'voting_module_token'
                  ? {
                      voting_module_token: {
                        token_type:
                          votingModuleTokenType === TokenType.Cw20
                            ? 'cw20'
                            : 'native',
                      },
                    }
                  : {
                      token: {
                        denom:
                          proposalDeposit.type === 'native'
                            ? {
                                native: proposalDeposit.denomOrAddress,
                              }
                            : // proposalDeposit.type === 'cw20'
                              {
                                snip20: [
                                  proposalDeposit.denomOrAddress,
                                  // Type-checked above.
                                  proposalDeposit.token!.snip20CodeHash!,
                                ],
                              },
                      },
                    },
              refund_policy: proposalDeposit.refundPolicy,
            }
          : null,
      }
    )
  } else {
    return SingleChoiceProposalModule.generateModuleInstantiateInfo(chainId, {
      ...commonConfig,
      deposit: proposalDeposit.enabled
        ? {
            amount: HugeDecimal.fromHumanReadable(
              proposalDeposit.amount,
              proposalDeposit.token?.decimals ?? 0
            ).toString(),
            denom:
              proposalDeposit.type === 'voting_module_token'
                ? {
                    voting_module_token: {
                      token_type:
                        votingModuleTokenType === TokenType.Cw20
                          ? 'cw20'
                          : 'native',
                    },
                  }
                : {
                    token: {
                      denom:
                        proposalDeposit.type === 'native'
                          ? {
                              native: proposalDeposit.denomOrAddress,
                            }
                          : // proposalDeposit.type === 'cw20'
                            {
                              cw20: proposalDeposit.denomOrAddress,
                            },
                    },
                  },
            refund_policy: proposalDeposit.refundPolicy,
          }
        : null,
    })
  }
}

const convertPercentOrMajorityValueToPercentageThreshold = ({
  majority,
  value,
}: PercentOrMajorityValue): PercentageThreshold =>
  majority ? { majority: {} } : { percent: (value / 100).toFixed(2) }
