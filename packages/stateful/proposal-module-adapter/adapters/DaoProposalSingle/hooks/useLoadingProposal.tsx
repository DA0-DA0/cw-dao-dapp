import { useTranslation } from 'react-i18next'
import TimeAgo from 'react-timeago'
import { constSelector, waitForAll } from 'recoil'

import {
  DaoProposalSingleCommonSelectors,
  NeutronCwdSubdaoTimelockSingleSelectors,
  blockHeightSelector,
  blocksPerYearSelector,
} from '@dao-dao/state'
import {
  useCachedLoadable,
  useCachedLoading,
  useCachedLoadingWithError,
  useTranslatedTimeDeltaFormatter,
} from '@dao-dao/stateless'
import {
  ChainId,
  Feature,
  LoadingData,
  PreProposeModuleType,
  ProposalStatus,
  ProposalStatusEnum,
  ProposalTimestampInfo,
} from '@dao-dao/types'
import {
  convertExpirationToDate,
  formatDate,
  formatDateTimeTz,
  isFeatureSupportedByVersion,
} from '@dao-dao/utils'

import { neutronOverruleProposalForTimelockedProposalSelector } from '../../../../recoil'
import { useProposalModuleAdapterOptions } from '../../../react'
import {
  approvedIdForPreProposeApproverIdSelector,
  approverIdForPreProposeApprovalIdSelector,
} from '../selectors'
import { ProposalWithMetadata } from '../types'

// Returns a proposal wrapped in a LoadingData object to allow the UI to respond
// to its loading state.
export const useLoadingProposal = (): LoadingData<ProposalWithMetadata> => {
  const { t } = useTranslation()
  const {
    proposalModule: { address: proposalModuleAddress, version, prePropose },
    proposalNumber,
    chain: { chainId },
  } = useProposalModuleAdapterOptions()

  const loadingProposalResponse = useCachedLoading(
    DaoProposalSingleCommonSelectors.proposalSelector({
      contractAddress: proposalModuleAddress,
      chainId,
      params: [
        {
          proposalId: proposalNumber,
        },
      ],
    }),
    undefined,
    (err) => console.error(err)
  )

  let proposalStatus: ProposalStatus | undefined =
    loadingProposalResponse.loading
      ? undefined
      : loadingProposalResponse.data?.proposal.status
  // Update status to take into account Neutron pre-propose timelock/overrule
  // system.
  const usesNeutronPreProposeTimelockOverruleSystem =
    chainId === ChainId.NeutronMainnet &&
    prePropose?.type === PreProposeModuleType.NeutronSubdaoSingle &&
    proposalStatus === ProposalStatusEnum.Executed
  const loadingNeutronTimelockInfo = useCachedLoading(
    usesNeutronPreProposeTimelockOverruleSystem
      ? waitForAll([
          // Proposal timelock state.
          NeutronCwdSubdaoTimelockSingleSelectors.proposalSelector({
            chainId,
            contractAddress: prePropose.config.timelockAddress,
            params: [
              {
                proposalId: proposalNumber,
              },
            ],
          }),
          // Overrule proposal created in main DAO that controls the timelock
          // state.
          neutronOverruleProposalForTimelockedProposalSelector({
            chainId,
            preProposeOverruleAddress:
              prePropose.config.timelockConfig.overrule_pre_propose,
            timelockAddress: prePropose.config.timelockAddress,
            subdaoProposalId: proposalNumber,
          }),
        ])
      : constSelector(undefined),
    undefined,
    (err) => console.error(err)
  )
  if (
    usesNeutronPreProposeTimelockOverruleSystem &&
    !loadingNeutronTimelockInfo.loading &&
    loadingNeutronTimelockInfo.data
  ) {
    const timelockProposalStatus = loadingNeutronTimelockInfo.data[0].status
    proposalStatus =
      timelockProposalStatus === 'timelocked'
        ? ProposalStatusEnum.NeutronTimelocked
        : timelockProposalStatus === 'overruled'
          ? ProposalStatusEnum.NeutronOverruled
          : timelockProposalStatus === 'executed'
            ? ProposalStatusEnum.Executed
            : timelockProposalStatus === 'execution_failed'
              ? ProposalStatusEnum.ExecutionFailed
              : // Should never happen.
                proposalStatus
  }

  const timeAgoFormatter = useTranslatedTimeDeltaFormatter({ words: false })

  const blocksPerYearLoadable = useCachedLoadable(
    blocksPerYearSelector({
      chainId,
    })
  )
  const blockHeightLoadable = useCachedLoadable(
    blockHeightSelector({
      chainId,
    })
  )

  //! If this proposal was approved by another proposal via the
  //! pre-propose-approver setup.
  const approverProposalId = useCachedLoadingWithError(
    prePropose?.type === PreProposeModuleType.Approval &&
      !!prePropose.config.preProposeApproverContract
      ? approverIdForPreProposeApprovalIdSelector({
          chainId,
          preProposeAddress: prePropose.address,
          proposalNumber,
          isPreProposeApprovalProposal: false,
          approver: prePropose.config.approver,
          preProposeApproverContract:
            prePropose.config.preProposeApproverContract,
        })
      : constSelector(undefined)
  )

  //! If this is an approver proposal that approved another proposal.
  const approvedProposalId = useCachedLoadingWithError(
    prePropose?.type === PreProposeModuleType.Approver &&
      proposalStatus === ProposalStatusEnum.Executed
      ? approvedIdForPreProposeApproverIdSelector({
          chainId,
          preProposeAddress: prePropose.address,
          proposalNumber,
          approvalDao: prePropose.config.approvalDao,
          preProposeApprovalContract:
            prePropose.config.preProposeApprovalContract,
        })
      : constSelector(undefined)
  )

  if (
    loadingProposalResponse.loading ||
    !loadingProposalResponse.data ||
    blocksPerYearLoadable.state !== 'hasValue' ||
    blockHeightLoadable.state !== 'hasValue' ||
    approverProposalId.loading ||
    approvedProposalId.loading ||
    loadingNeutronTimelockInfo.loading
  ) {
    return { loading: true }
  }

  // Indexer may provide dates.
  const { proposal, completedAt, executedAt, closedAt } =
    loadingProposalResponse.data

  const expirationDate = convertExpirationToDate(
    blocksPerYearLoadable.contents,
    proposal.expiration,
    blockHeightLoadable.contents
  )

  const vetoTimelockExpiration =
    typeof proposalStatus === 'object' && 'veto_timelock' in proposalStatus
      ? convertExpirationToDate(
          blocksPerYearLoadable.contents,
          proposalStatus.veto_timelock.expiration,
          blockHeightLoadable.contents
        )
      : proposalStatus === ProposalStatusEnum.NeutronTimelocked &&
          loadingNeutronTimelockInfo.data
        ? convertExpirationToDate(
            blocksPerYearLoadable.contents,
            loadingNeutronTimelockInfo.data[1].proposal.proposal.expiration,
            blockHeightLoadable.contents
          )
        : undefined

  const votingOpen =
    proposalStatus === ProposalStatusEnum.Open ||
    (!!version &&
      // Voting up until expiration on finished proposals may be supported.
      isFeatureSupportedByVersion(Feature.VoteUntilExpiration, version) &&
      // `expirationDate` will be undefined if expiration is set to never, which
      // the contract does not allow, so this is just a type-check.
      !!expirationDate &&
      expirationDate.getTime() > Date.now())

  const completionDate =
    typeof completedAt === 'string' && new Date(completedAt)
  const executionDate = typeof executedAt === 'string' && new Date(executedAt)
  const closeDate = typeof closedAt === 'string' && new Date(closedAt)

  const dateDisplay: ProposalTimestampInfo['display'] | undefined = votingOpen
    ? expirationDate && expirationDate.getTime() > Date.now()
      ? {
          label: vetoTimelockExpiration
            ? t('title.votingTimeLeft')
            : t('title.timeLeft'),
          tooltip: formatDateTimeTz(expirationDate),
          content: (
            <TimeAgo date={expirationDate} formatter={timeAgoFormatter} />
          ),
        }
      : 'at_height' in proposal.expiration &&
          proposal.expiration.at_height > blockHeightLoadable.contents
        ? {
            label: t('title.votingEndBlock'),
            tooltip: t('info.votingEndBlockTooltip'),
            content: BigInt(proposal.expiration.at_height).toLocaleString(),
          }
        : undefined
    : executionDate
      ? {
          label: t('proposalStatusTitle.executed'),
          tooltip: formatDateTimeTz(executionDate),
          content: formatDate(executionDate),
        }
      : closeDate
        ? {
            label: t('proposalStatusTitle.closed'),
            tooltip: formatDateTimeTz(closeDate),
            content: formatDate(closeDate),
          }
        : completionDate
          ? {
              label: t('title.completed'),
              tooltip: formatDateTimeTz(completionDate),
              content: formatDate(completionDate),
            }
          : expirationDate
            ? {
                label:
                  // If voting is closed, expiration should not be in the future, but
                  // just in case...
                  expirationDate.getTime() > Date.now()
                    ? t('title.expires')
                    : t('title.completed'),
                tooltip: formatDateTimeTz(expirationDate),
                content: formatDate(expirationDate),
              }
            : 'at_height' in proposal.expiration
              ? {
                  label: t('title.blockCompleted'),
                  tooltip: t('info.votingEndedBlockTooltip'),
                  content: BigInt(
                    proposal.expiration.at_height
                  ).toLocaleString(),
                }
              : undefined

  const timestampInfo: ProposalTimestampInfo = {
    display: dateDisplay,
    expirationDate,
  }

  return {
    loading: false,
    updating:
      !loadingProposalResponse.loading && loadingProposalResponse.updating,
    data: {
      ...proposal,
      timestampInfo,
      votingOpen,
      executedAt:
        typeof executedAt === 'string' ? new Date(executedAt) : undefined,
      // On error, just return undefined so we still render the proposal.
      approverProposalId: approverProposalId.errored
        ? undefined
        : approverProposalId.data,
      // On error, just return undefined so we still render the proposal.
      approvedProposalId: approvedProposalId.errored
        ? undefined
        : approvedProposalId.data,
      vetoTimelockExpiration,
      neutronTimelockOverrule: loadingNeutronTimelockInfo.data?.[1],
    },
  }
}
