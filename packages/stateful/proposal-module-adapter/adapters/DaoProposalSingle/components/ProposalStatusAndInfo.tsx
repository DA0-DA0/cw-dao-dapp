import {
  AccountCircleOutlined,
  ArrowOutwardRounded,
  HourglassTopRounded,
  Redo,
  RotateRightOutlined,
  Tag,
  ThumbUpOutlined,
} from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentProps, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TimeAgo from 'react-timeago'
import { useRecoilValue } from 'recoil'

import { DaoProposalSingleCommonSelectors } from '@dao-dao/state'
import {
  CopyToClipboardUnderline,
  IconButtonLink,
  Logo,
  ProposalStatusAndInfoProps,
  ProposalStatusAndInfo as StatelessProposalStatusAndInfo,
  Tooltip,
  useConfiguredChainContext,
  useDao,
  useDaoNavHelpers,
  useExecuteAt,
  useTranslatedTimeDeltaFormatter,
} from '@dao-dao/stateless'
import {
  BaseProposalStatusAndInfoProps,
  CheckedDepositInfo,
  DepositRefundPolicy,
  PreProposeModuleType,
  ProposalStatusEnum,
} from '@dao-dao/types'
import {
  formatDateTimeTz,
  formatPercentOf100,
  getProposalStatusKey,
} from '@dao-dao/utils'

import { ButtonLink, SuspenseLoader } from '../../../../components'
import { EntityDisplay } from '../../../../components/EntityDisplay'
import {
  useAwaitNextBlock,
  useProposalActionState,
  useProposalRelayState,
  useProposalVetoState,
} from '../../../../hooks'
import { useProposalModuleAdapterOptions } from '../../../react'
import {
  useLoadingDepositInfo,
  useLoadingProposal,
  useLoadingProposalExecutionTxHash,
  useLoadingVotesInfo,
  useLoadingWalletVoteInfo,
  useProposalRefreshers,
} from '../hooks'
import { ProposalWithMetadata, VotesInfo } from '../types'
import { ProposalStatusAndInfoLoader } from './ProposalStatusAndInfoLoader'
import { ProposalVoter } from './ProposalVoter'

export const ProposalStatusAndInfo = (
  props: BaseProposalStatusAndInfoProps
) => {
  const loadingProposal = useLoadingProposal()
  const loadingVotesInfo = useLoadingVotesInfo()
  const loadingDepositInfo = useLoadingDepositInfo()

  return (
    <SuspenseLoader
      fallback={<ProposalStatusAndInfoLoader {...props} />}
      forceFallback={
        loadingProposal.loading ||
        loadingVotesInfo.loading ||
        loadingDepositInfo.loading
      }
    >
      {!loadingProposal.loading &&
        !loadingVotesInfo.loading &&
        !loadingDepositInfo.loading && (
          <InnerProposalStatusAndInfo
            {...props}
            depositInfo={loadingDepositInfo.data}
            proposal={loadingProposal.data}
            votesInfo={loadingVotesInfo.data}
          />
        )}
    </SuspenseLoader>
  )
}

const InnerProposalStatusAndInfo = ({
  proposal: {
    timestampInfo,
    votingOpen,
    vetoTimelockExpiration,
    neutronTimelockOverrule,
    ...proposal
  },
  votesInfo: {
    quorum,
    thresholdReached,
    quorumReached,
    turnoutPercent,
    turnoutYesPercent,
  },
  depositInfo,
  onExecuteSuccess,
  onVetoSuccess,
  onCloseSuccess,
  openSelfRelayExecute,
  voter,
  ...props
}: BaseProposalStatusAndInfoProps & {
  proposal: ProposalWithMetadata
  votesInfo: VotesInfo
  depositInfo: CheckedDepositInfo | undefined
}) => {
  const { t } = useTranslation()
  const {
    chain: { chainId },
    config: { explorerUrlTemplates },
  } = useConfiguredChainContext()
  const { coreAddress } = useDao()
  const { getDaoProposalPath } = useDaoNavHelpers()
  const { proposalModule, proposalNumber } = useProposalModuleAdapterOptions()

  const config = useRecoilValue(
    DaoProposalSingleCommonSelectors.configSelector({
      chainId,
      contractAddress: proposalModule.address,
    })
  )

  const creatorAddress =
    proposalModule.prePropose?.type === PreProposeModuleType.Approver
      ? proposalModule.prePropose.config.approvalDao
      : proposal.proposer

  const loadingWalletVoteInfo = useLoadingWalletVoteInfo()
  const loadingExecutionTxHash = useLoadingProposalExecutionTxHash()
  const { refreshProposal, refreshProposalAndAll } = useProposalRefreshers()

  const approver =
    proposalModule.prePropose?.type === PreProposeModuleType.Approval
      ? proposalModule.prePropose.config.approver
      : undefined
  const approverProposalPath =
    proposalModule.prePropose?.type === PreProposeModuleType.Approval &&
    !!proposalModule.prePropose.config.preProposeApproverContract &&
    proposal.approverProposalId
      ? getDaoProposalPath(
          proposalModule.prePropose.config.approver,
          proposal.approverProposalId
        )
      : undefined

  const approvalDao =
    proposalModule.prePropose?.type === PreProposeModuleType.Approver
      ? proposalModule.prePropose.config.approvalDao
      : undefined
  const approvedProposalPath =
    approvalDao && proposal.approvedProposalId
      ? getDaoProposalPath(approvalDao, proposal.approvedProposalId)
      : undefined

  const statusKey = getProposalStatusKey(proposal.status)

  const timeAgoFormatter = useTranslatedTimeDeltaFormatter({ words: false })

  const relayState = useProposalRelayState({
    msgs: proposal.msgs,
    status: proposal.status,
    executedAt: proposal.executedAt,
    proposalModuleAddress: proposalModule.address,
    proposalNumber,
    openSelfRelayExecute,
    loadingTxHash: loadingExecutionTxHash,
  })
  const { action, footer } = useProposalActionState({
    description: proposal.description,
    statusKey,
    relayState,
    loadingExecutionTxHash,
    onExecuteSuccess,
    onCloseSuccess,
  })

  const awaitNextBlock = useAwaitNextBlock()
  // Refresh proposal and list of proposals (for list status) once voting or
  // veto period ends.
  useExecuteAt({
    fn: () => {
      // Refresh immediately so that the timestamp countdown re-renders and
      // hides itself.
      refreshProposal()
      // Refresh again after a block to make sure the status has been updated,
      // and refresh the list of all proposals so the status gets updated there
      // as well.
      awaitNextBlock().then(refreshProposalAndAll)
    },
    date:
      statusKey === ProposalStatusEnum.Open
        ? timestampInfo.expirationDate
        : statusKey === 'veto_timelock'
          ? vetoTimelockExpiration
          : undefined,
  })

  const { vetoEnabled, canBeVetoed, vetoOrEarlyExecute, vetoInfoItems } =
    useProposalVetoState({
      statusKey,
      vetoConfig: 'veto' in config ? config.veto : undefined,
      neutronTimelockOverrule,
      onVetoSuccess,
      onExecuteSuccess,
    })

  const info: ProposalStatusAndInfoProps['info'] = [
    {
      Icon: (props) => <Logo {...props} />,
      label: t('title.dao'),
      Value: (props) => (
        <EntityDisplay {...props} address={coreAddress} noCopy />
      ),
    },
    {
      Icon: AccountCircleOutlined,
      label: t('title.creator'),
      Value: (props) => (
        <EntityDisplay {...props} address={creatorAddress} noCopy />
      ),
    },
    ...(approverProposalPath
      ? ([
          {
            Icon: ThumbUpOutlined,
            label: t('title.approval'),
            Value: (props) => (
              <Tooltip
                morePadding
                title={approver && <EntityDisplay address={approver} noCopy />}
              >
                <ButtonLink
                  href={approverProposalPath}
                  variant="underline"
                  {...props}
                >
                  {t('title.proposalId', {
                    id: proposal.approverProposalId,
                  })}
                </ButtonLink>
              </Tooltip>
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : approver
        ? ([
            {
              Icon: ThumbUpOutlined,
              label: t('title.approver'),
              Value: (props) => (
                <EntityDisplay {...props} address={approver} noCopy />
              ),
            },
          ] as ProposalStatusAndInfoProps['info'])
        : []),
    ...vetoInfoItems,
    {
      Icon: RotateRightOutlined,
      label: t('title.status'),
      Value: (props) => (
        <p {...props}>{t(`proposalStatusTitle.${statusKey}`)}</p>
      ),
    },
    ...(proposal.allow_revoting
      ? ([
          {
            Icon: Redo,
            label: t('title.revoting'),
            Value: (props) => <p {...props}>{t('info.enabled')}</p>,
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
    ...(timestampInfo.display
      ? ([
          {
            Icon: HourglassTopRounded,
            label: timestampInfo.display.label,
            Value: (props) => (
              <Tooltip title={timestampInfo.display!.tooltip}>
                <p {...props}>{timestampInfo.display!.content}</p>
              </Tooltip>
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
    ...(vetoTimelockExpiration
      ? ([
          {
            Icon: HourglassTopRounded,
            label: t('title.vetoTimeLeft'),
            Value: (props) => (
              <Tooltip title={formatDateTimeTz(vetoTimelockExpiration)}>
                <p {...props}>
                  <TimeAgo
                    date={vetoTimelockExpiration}
                    formatter={timeAgoFormatter}
                  />
                </p>
              </Tooltip>
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
    ...(loadingExecutionTxHash.loading || loadingExecutionTxHash.data
      ? ([
          {
            Icon: Tag,
            label: t('info.txAbbr'),
            Value: (props) =>
              loadingExecutionTxHash.loading ? (
                <p className={clsx('animate-pulse', props.className)}>...</p>
              ) : loadingExecutionTxHash.data ? (
                <div className="flex w-full flex-row items-center gap-1 overflow-hidden">
                  <CopyToClipboardUnderline
                    // Will truncate automatically.
                    takeAll
                    value={loadingExecutionTxHash.data}
                    {...props}
                  />

                  {!!explorerUrlTemplates?.tx && (
                    <IconButtonLink
                      Icon={ArrowOutwardRounded}
                      href={explorerUrlTemplates.tx.replace(
                        'REPLACE',
                        loadingExecutionTxHash.data
                      )}
                      size="sm"
                      variant="ghost"
                    />
                  )}
                </div>
              ) : null,
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
    ...(approvedProposalPath
      ? ([
          {
            Icon: ThumbUpOutlined,
            label: t('title.approved'),
            Value: (props) => (
              <Tooltip
                morePadding
                title={
                  approvalDao && <EntityDisplay address={approvalDao} noCopy />
                }
              >
                <ButtonLink
                  href={approvedProposalPath}
                  variant="underline"
                  {...props}
                >
                  {t('title.proposalId', {
                    id: proposal.approvedProposalId,
                  })}
                </ButtonLink>
              </Tooltip>
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
  ]

  let status: string
  if (statusKey === ProposalStatusEnum.Open) {
    if (!quorum || quorumReached) {
      if (thresholdReached) {
        status = t('info.proposalStatus.willPass', {
          context: vetoEnabled ? 'vetoEnabled' : undefined,
        })
      } else {
        status = t('info.proposalStatus.willFailBadThreshold')
      }

      // quorum && !quorumReached
    } else if (thresholdReached) {
      status = t('info.proposalStatus.willFailBadQuorum')
    } else {
      status = t('info.proposalStatus.willFail')
    }

    // not open
  } else {
    if (votingOpen) {
      // Proposal status is determined but voting is still open
      status = t('info.proposalStatus.completedAndOpen', {
        context: statusKey === ProposalStatusEnum.Vetoed ? 'vetoed' : undefined,
      })
    } else {
      status = t('info.proposalStatus.notOpenSingleChoice', {
        context:
          statusKey === ProposalStatusEnum.Passed
            ? 'passed'
            : statusKey === ProposalStatusEnum.Executed
              ? 'executed'
              : statusKey === ProposalStatusEnum.ExecutionFailed
                ? 'executionFailed'
                : statusKey === ProposalStatusEnum.Rejected
                  ? 'rejected'
                  : statusKey === ProposalStatusEnum.Closed
                    ? 'closed'
                    : statusKey === ProposalStatusEnum.Vetoed
                      ? thresholdReached && (!quorum || quorumReached)
                        ? 'vetoedPassed'
                        : 'vetoedNotPassed'
                      : statusKey === 'veto_timelock'
                        ? 'vetoTimelock'
                        : statusKey === ProposalStatusEnum.NeutronOverruled
                          ? thresholdReached && (!quorum || quorumReached)
                            ? 'overruledPassed'
                            : 'overruledNotPassed'
                          : statusKey === ProposalStatusEnum.NeutronTimelocked
                            ? 'overruleTimelock'
                            : undefined,
        turnoutPercent: formatPercentOf100(turnoutPercent),
        turnoutYesPercent: formatPercentOf100(turnoutYesPercent),
      })
    }

    // Add sentence about closing to receive deposit back if it needs to be
    // closed and will refund.
    if (
      statusKey === ProposalStatusEnum.Rejected &&
      depositInfo?.refund_policy === DepositRefundPolicy.Always
    ) {
      status += ' ' + t('info.proposalDepositWillBeRefunded')
    }

    // Add sentence about veto status.
    if (canBeVetoed) {
      status += ' ' + t('info.proposalStatus.canStillBeVetoed')
    }
  }

  const Voter = useCallback(
    (props: ComponentProps<Required<ProposalStatusAndInfoProps>['Voter']>) => (
      <ProposalVoter {...props} onVoteSuccess={voter.onVoteSuccess} />
    ),
    [voter.onVoteSuccess]
  )

  return (
    <StatelessProposalStatusAndInfo
      {...props}
      Voter={
        loadingWalletVoteInfo &&
        !loadingWalletVoteInfo.loading &&
        loadingWalletVoteInfo.data.canVote
          ? Voter
          : undefined
      }
      action={action}
      footer={footer}
      info={info}
      status={status}
      vetoOrEarlyExecute={vetoOrEarlyExecute}
    />
  )
}
