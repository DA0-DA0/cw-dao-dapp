import {
  RecoilValueReadOnly,
  constSelector,
  selectorFamily,
  waitForAll,
} from 'recoil'

import {
  CwProposalSingleV1Selectors,
  DaoPreProposeApprovalSingleSelectors,
  DaoPreProposeSingleSelectors,
  DaoProposalSingleCommonSelectors,
  blockHeightTimestampSafeSelector,
} from '@dao-dao/state'
import {
  CheckedDepositInfo,
  ContractVersion,
  DepositRefundPolicy,
  Duration,
  Feature,
  ProposalStatusEnum,
  WithChainId,
} from '@dao-dao/types'
import { Proposal as PreProposeApprovalSingleProposal } from '@dao-dao/types/contracts/DaoPreProposeApprovalSingle'
import {
  CommonProposalListInfo,
  DepositInfoSelector,
} from '@dao-dao/types/proposal-module-adapter'
import { isFeatureSupportedByVersion } from '@dao-dao/utils'

export const proposalCountSelector = selectorFamily<
  number,
  WithChainId<{
    proposalModuleAddress: string
  }>
>({
  key: 'daoProposalSingleProposalCount',
  get:
    ({ chainId, proposalModuleAddress }) =>
    ({ get }) =>
      get(
        DaoProposalSingleCommonSelectors.proposalCountSelector({
          contractAddress: proposalModuleAddress,
          chainId,
        })
      ),
})

export const maxVotingPeriodSelector = selectorFamily<
  Duration,
  WithChainId<{
    proposalModuleAddress: string
  }>
>({
  key: 'daoProposalSingleMaxVotingPeriod',
  get:
    ({ chainId, proposalModuleAddress }) =>
    ({ get }) => {
      const config = get(
        DaoProposalSingleCommonSelectors.configSelector({
          contractAddress: proposalModuleAddress,
          chainId,
        })
      )

      return config.max_voting_period
    },
})

export const reverseProposalInfosSelector: (
  info: WithChainId<{
    proposalModuleAddress: string
    proposalModulePrefix: string
    startBefore: number | undefined
    limit: number | undefined
  }>
) => RecoilValueReadOnly<CommonProposalListInfo[]> = selectorFamily({
  key: 'daoProposalSingleReverseProposalInfos',
  get:
    ({
      chainId,
      proposalModuleAddress,
      proposalModulePrefix,
      startBefore,
      limit,
    }) =>
    async ({ get }) => {
      const proposalResponses = get(
        DaoProposalSingleCommonSelectors.reverseProposalsSelector({
          contractAddress: proposalModuleAddress,
          chainId,
          params: [
            {
              startBefore,
              limit,
            },
          ],
        })
      ).proposals

      const timestamps = get(
        waitForAll(
          proposalResponses.map(({ proposal: { start_height }, ...response }) =>
            // Indexer returns createdAt, so check its existence and fetch from
            // chain if not present.
            typeof response.createdAt === 'string'
              ? constSelector(new Date(response.createdAt))
              : blockHeightTimestampSafeSelector({
                  blockHeight: start_height,
                  chainId,
                })
          )
        )
      )

      const proposalInfos: CommonProposalListInfo[] = proposalResponses.map(
        ({ id, proposal: { status } }, index) => ({
          id: `${proposalModulePrefix}${id}`,
          proposalNumber: id,
          timestamp: timestamps[index],
          status,
        })
      )

      return proposalInfos
    },
})

export const reversePreProposePendingProposalInfosSelector: (
  info: WithChainId<{
    proposalModuleAddress: string
    proposalModulePrefix: string
    startBefore: number | undefined
    limit: number | undefined
  }>
) => RecoilValueReadOnly<CommonProposalListInfo[]> = selectorFamily({
  key: 'daoProposalSingleReversePreProposePendingProposalInfos',
  get:
    ({
      chainId,
      proposalModuleAddress,
      proposalModulePrefix,
      startBefore,
      limit,
    }) =>
    async ({ get }) => {
      const pendingProposals = get(
        DaoPreProposeApprovalSingleSelectors.queryExtensionSelector({
          contractAddress: proposalModuleAddress,
          chainId,
          params: [
            {
              msg: {
                reverse_pending_proposals: {
                  start_before: startBefore,
                  limit,
                },
              },
            },
          ],
        })
      ) as PreProposeApprovalSingleProposal[]

      const proposalInfos: CommonProposalListInfo[] = pendingProposals.map(
        ({ approval_id: id, createdAt }) => ({
          id: `${proposalModulePrefix}*${id}`,
          proposalNumber: id,
          timestamp: createdAt ? new Date(createdAt) : undefined,
          status: ProposalStatusEnum.Open,
        })
      )

      return proposalInfos
    },
})

export const reversePreProposeCompletedProposalInfosSelector: (
  info: WithChainId<{
    proposalModuleAddress: string
    proposalModulePrefix: string
    startBefore: number | undefined
    limit: number | undefined
  }>
) => RecoilValueReadOnly<CommonProposalListInfo[]> = selectorFamily({
  key: 'daoProposalSingleReversePreProposeCompletedProposalInfos',
  get:
    ({
      chainId,
      proposalModuleAddress,
      proposalModulePrefix,
      startBefore,
      limit,
    }) =>
    async ({ get }) => {
      const completedProposals = get(
        DaoPreProposeApprovalSingleSelectors.queryExtensionSelector({
          contractAddress: proposalModuleAddress,
          chainId,
          params: [
            {
              msg: {
                reverse_completed_proposals: {
                  start_before: startBefore,
                  limit,
                },
              },
            },
          ],
        })
      ) as PreProposeApprovalSingleProposal[]

      const proposalInfos: CommonProposalListInfo[] = completedProposals.map(
        ({ approval_id: id, status, createdAt }) => ({
          id: `${proposalModulePrefix}*${id}`,
          proposalNumber: id,
          timestamp: createdAt ? new Date(createdAt) : undefined,
          status:
            'pending' in status
              ? ProposalStatusEnum.Open
              : 'approved' in status
                ? ProposalStatusEnum.Executed
                : ProposalStatusEnum.Closed,
          // Hide approved proposals from the list since they show up as normal
          // proposals. No need to show duplicates. But we still want to show
          // rejected pre-propose proposals.
          hideFromList: 'approved' in status,
        })
      )

      return proposalInfos
    },
})

export const depositInfoSelector: (
  info: WithChainId<{
    proposalModuleAddress: string
    version: ContractVersion | null
    preProposeAddress: string | null
  }>
) => DepositInfoSelector = selectorFamily({
  key: 'daoProposalSingleDepositInfo',
  get:
    ({ chainId, proposalModuleAddress, version, preProposeAddress }) =>
    ({ get }) => {
      let depositInfo: CheckedDepositInfo | undefined
      if (
        !version ||
        !isFeatureSupportedByVersion(Feature.PrePropose, version)
      ) {
        const config = get(
          CwProposalSingleV1Selectors.configSelector({
            contractAddress: proposalModuleAddress,
            chainId,
          })
        )

        if (config.deposit_info) {
          depositInfo = {
            amount: config.deposit_info.deposit,
            denom: {
              cw20: config.deposit_info.token,
            },
            refund_policy: config.deposit_info.refund_failed_proposals
              ? DepositRefundPolicy.Always
              : DepositRefundPolicy.OnlyPassed,
          }
        }
      } else if (preProposeAddress) {
        const config = get(
          DaoPreProposeSingleSelectors.configSelector({
            contractAddress: preProposeAddress,
            chainId,
            params: [],
          })
        )
        if (config.deposit_info) {
          depositInfo = config.deposit_info ?? undefined
        }
      }

      return depositInfo
    },
})
