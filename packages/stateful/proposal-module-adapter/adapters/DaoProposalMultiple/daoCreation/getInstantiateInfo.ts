import { HugeDecimal } from '@dao-dao/math'
import { MultipleChoiceProposalModule } from '@dao-dao/state/clients/proposal-module/MultipleChoiceProposalModule'
import { SecretMultipleChoiceProposalModule } from '@dao-dao/state/clients/proposal-module/MultipleChoiceProposalModule.secret'
import { DaoCreationGetInstantiateInfo, TokenType } from '@dao-dao/types'
import {
  TokenBasedCreatorId,
  convertDurationWithUnitsToDuration,
  convertVetoConfigToCosmos,
  isSecretNetwork,
} from '@dao-dao/utils'

import { CreatorData as TokenBasedCreatorData } from '../../../../creators/TokenBased/types'
import { DaoCreationExtraVotingConfig } from '../types'
import { convertPercentOrMajorityValueToPercentageThreshold } from '../utils'

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
      veto,
    },
  },
  { overrideContractVersion }
) => {
  const commonConfig = {
    quorum: convertPercentOrMajorityValueToPercentageThreshold(quorum),
    maxVotingPeriod: convertDurationWithUnitsToDuration(votingDuration),
    allowRevoting,
    veto: convertVetoConfigToCosmos(veto),
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

    return SecretMultipleChoiceProposalModule.generateModuleInstantiateInfo(
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
    return MultipleChoiceProposalModule.generateModuleInstantiateInfo(
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
                                cw20: proposalDeposit.denomOrAddress,
                              },
                      },
                    },
              refund_policy: proposalDeposit.refundPolicy,
            }
          : null,
      },
      {
        overrideContractVersion,
      }
    )
  }
}
