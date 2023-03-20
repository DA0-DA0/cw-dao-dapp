import { Buffer } from 'buffer'

import { DaoCreationGetInstantiateInfo } from '@dao-dao/types'
import { InstantiateMsg as CwPreProposeSingleInstantiateMsg } from '@dao-dao/types/contracts/DaoPreProposeSingle'
import { PercentageThreshold } from '@dao-dao/types/contracts/DaoProposalSingle.common'
import { InstantiateMsg as CwProposalSingleInstantiateMsg } from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import {
  CODE_ID_CONFIG,
  convertDenomToMicroDenomWithDecimals,
  convertDurationWithUnitsToDuration,
} from '@dao-dao/utils'
import { makeValidateMsg } from '@dao-dao/utils/validation/makeValidateMsg'

import { DaoProposalSingleAdapter } from '../../index'
import { DaoCreationConfig, ThresholdValue } from '../types'
import instantiateSchema from './instantiate_schema.json'
import preProposeInstantiateSchema from './pre_propose_instantiate_schema.json'

export const getInstantiateInfo: DaoCreationGetInstantiateInfo<
  DaoCreationConfig
> = (
  { name },
  {
    threshold,
    quorumEnabled,
    quorum,
    votingDuration,
    proposalDeposit,
    anyoneCanPropose,
    allowRevoting,
  },
  t
) => {
  const decimals = proposalDeposit.token?.decimals ?? 0

  const preProposeSingleInstantiateMsg: CwPreProposeSingleInstantiateMsg = {
    deposit_info: proposalDeposit.enabled
      ? {
          amount: convertDenomToMicroDenomWithDecimals(
            proposalDeposit.amount,
            decimals
          ).toString(),
          denom:
            proposalDeposit.type === 'voting_module_token'
              ? {
                  voting_module_token: {},
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
    extension: {},
    open_proposal_submission: anyoneCanPropose,
  }

  // Validate and throw error if invalid according to JSON schema.
  makeValidateMsg<CwPreProposeSingleInstantiateMsg>(
    preProposeInstantiateSchema,
    t
  )(preProposeSingleInstantiateMsg)

  const msg: CwProposalSingleInstantiateMsg = {
    allow_revoting: allowRevoting,
    close_proposal_on_execution_failure: true,
    max_voting_period: convertDurationWithUnitsToDuration(votingDuration),
    min_voting_period: null,
    only_members_execute: true,
    pre_propose_info: {
      module_may_propose: {
        info: {
          admin: { core_module: {} },
          code_id: CODE_ID_CONFIG.DaoPreProposeSingle,
          label: `DAO_${name}_pre-propose-${DaoProposalSingleAdapter.id}`,
          msg: Buffer.from(
            JSON.stringify(preProposeSingleInstantiateMsg),
            'utf8'
          ).toString('base64'),
        },
      },
    },
    threshold: quorumEnabled
      ? {
          threshold_quorum: {
            quorum: convertThresholdValueToPercentageThreshold(quorum),
            threshold: convertThresholdValueToPercentageThreshold(threshold),
          },
        }
      : {
          absolute_percentage: {
            percentage: convertThresholdValueToPercentageThreshold(threshold),
          },
        },
  }

  // Validate and throw error if invalid according to JSON schema.
  makeValidateMsg<CwProposalSingleInstantiateMsg>(instantiateSchema, t)(msg)

  return {
    admin: { core_module: {} },
    code_id: CODE_ID_CONFIG.DaoProposalSingle,
    label: `DAO_${name}_${DaoProposalSingleAdapter.id}`,
    msg: Buffer.from(JSON.stringify(msg), 'utf8').toString('base64'),
  }
}

const convertThresholdValueToPercentageThreshold = ({
  majority,
  value,
}: ThresholdValue): PercentageThreshold =>
  majority ? { majority: {} } : { percent: (value / 100).toFixed(2) }
