import {
  AccountCircleOutlined,
  ArrowOutward,
  HourglassTopRounded,
  PollOutlined,
  Redo,
  RotateRightOutlined,
  Tag,
} from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentProps, ComponentType, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TimeAgo from 'react-timeago'
import { useRecoilValue } from 'recoil'

import { DaoProposalMultipleSelectors } from '@dao-dao/state'
import {
  CopyToClipboardUnderline,
  IconButtonLink,
  Logo,
  ProposalStatusAndInfoProps,
  ProposalStatusAndInfo as StatelessProposalStatusAndInfo,
  Tooltip,
  TooltipTruncatedText,
  useConfiguredChainContext,
  useDao,
  useExecuteAt,
  useTranslatedTimeDeltaFormatter,
} from '@dao-dao/stateless'
import {
  BaseProposalStatusAndInfoProps,
  CheckedDepositInfo,
  DepositRefundPolicy,
  ProposalStatusEnum,
} from '@dao-dao/types'
import {
  formatDateTimeTz,
  formatPercentOf100,
  getProposalStatusKey,
} from '@dao-dao/utils'

import { EntityDisplay, SuspenseLoader } from '../../../../components'
import { ButtonLink } from '../../../../components/ButtonLink'
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
import { ProposalVoter } from './ProposalVoter'

export const ProposalStatusAndInfo = (
  props: BaseProposalStatusAndInfoProps
) => {
  const loadingProposal = useLoadingProposal()
  const loadingMultipleChoiceVotesInfo = useLoadingVotesInfo()
  const loadingDepositInfo = useLoadingDepositInfo()

  return (
    <SuspenseLoader
      fallback={<InnerProposalStatusAndInfoLoader {...props} />}
      forceFallback={
        loadingProposal.loading ||
        loadingMultipleChoiceVotesInfo.loading ||
        loadingDepositInfo.loading
      }
    >
      {!loadingProposal.loading &&
        !loadingMultipleChoiceVotesInfo.loading &&
        !loadingDepositInfo.loading && (
          <InnerProposalStatusAndInfo
            {...props}
            depositInfo={loadingDepositInfo.data}
            proposal={loadingProposal.data}
            votesInfo={loadingMultipleChoiceVotesInfo.data}
          />
        )}
    </SuspenseLoader>
  )
}

const InnerProposalStatusAndInfo = ({
  proposal: { timestampInfo, votingOpen, vetoTimelockExpiration, ...proposal },
  votesInfo: { winningChoice, quorumReached, turnoutPercent, isTie },
  depositInfo,
  onExecuteSuccess,
  onCloseSuccess,
  onVetoSuccess,
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
  const { proposalModule, proposalNumber } = useProposalModuleAdapterOptions()

  const config = useRecoilValue(
    DaoProposalMultipleSelectors.configSelector({
      chainId,
      contractAddress: proposalModule.address,
    })
  )

  const loadingWalletVoteInfo = useLoadingWalletVoteInfo()
  const loadingExecutionTxHash = useLoadingProposalExecutionTxHash()
  const { refreshProposal, refreshProposalAndAll } = useProposalRefreshers()

  const statusKey = getProposalStatusKey(proposal.status)

  const relayState = useProposalRelayState({
    msgs: winningChoice?.msgs || [],
    status: proposal.status,
    executedAt: proposal.executedAt,
    proposalModuleAddress: proposalModule.address,
    proposalNumber,
    openSelfRelayExecute,
    loadingTxHash: loadingExecutionTxHash,
  })
  const { action, footer } = useProposalActionState({
    description: winningChoice?.description || '',
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
      onVetoSuccess,
      onExecuteSuccess,
    })

  const timeAgoFormatter = useTranslatedTimeDeltaFormatter({ words: false })

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
        <EntityDisplay {...props} address={proposal.proposer} noCopy />
      ),
    },
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
                      Icon={ArrowOutward}
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
    ...(winningChoice &&
    (statusKey === ProposalStatusEnum.Passed ||
      statusKey === ProposalStatusEnum.Executed ||
      statusKey === ProposalStatusEnum.ExecutionFailed ||
      statusKey === 'veto_timelock' ||
      statusKey === ProposalStatusEnum.NeutronTimelocked)
      ? ([
          {
            Icon: PollOutlined,
            label: t('title.winningChoice'),
            Value: (props) => (
              <TooltipTruncatedText {...props} text={winningChoice.title} />
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
  ]

  let status: string
  if (statusKey === ProposalStatusEnum.Open) {
    if (quorumReached) {
      if (isTie) {
        status = t('info.proposalStatus.willFailTiedVote')
      } else {
        // Will pass
        status = t('info.proposalStatus.willPass', {
          context: vetoEnabled ? 'vetoEnabled' : undefined,
        })
      }
    } else {
      // Quorum not reached
      status = t('info.proposalStatus.willFailBadQuorum')
    }

    // not open
  } else {
    if (votingOpen) {
      // Proposal status is determined but voting is still open
      status = t('info.proposalStatus.completedAndOpen', {
        context: statusKey === ProposalStatusEnum.Vetoed ? 'vetoed' : undefined,
      })
    } else {
      const hasWinner = quorumReached && !isTie && winningChoice

      status = t('info.proposalStatus.notOpenMultipleChoice', {
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
                      ? hasWinner
                        ? 'vetoedWinner'
                        : 'vetoedNoWinner'
                      : statusKey === 'veto_timelock'
                        ? 'vetoTimelock'
                        : statusKey === ProposalStatusEnum.NeutronOverruled
                          ? 'overruled'
                          : statusKey === ProposalStatusEnum.NeutronTimelocked
                            ? 'overruleTimelock'
                            : undefined,
        turnoutPercent: formatPercentOf100(turnoutPercent),
        turnoutWinningPercent: hasWinner
          ? formatPercentOf100(winningChoice.turnoutVotePercentage)
          : undefined,
        turnoutWinner: hasWinner ? winningChoice.title : undefined,
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

const InnerProposalStatusAndInfoLoader = (
  props: BaseProposalStatusAndInfoProps
) => {
  const { t } = useTranslation()
  const { name: daoName, coreAddress } = useDao()

  const LoaderP: ComponentType<{ className: string }> = ({ className }) => (
    <p className={clsx('animate-pulse', className)}>...</p>
  )
  const info: ProposalStatusAndInfoProps['info'] = [
    {
      Icon: (props) => <Logo {...props} />,
      label: t('title.dao'),
      Value: (props) => (
        <ButtonLink href={`/dao/${coreAddress}`} variant="underline" {...props}>
          {daoName}
        </ButtonLink>
      ),
    },
    {
      Icon: AccountCircleOutlined,
      label: t('title.creator'),
      Value: LoaderP,
    },
    {
      Icon: RotateRightOutlined,
      label: t('title.status'),
      Value: LoaderP,
    },
    {
      Icon: HourglassTopRounded,
      label: t('title.date'),
      Value: LoaderP,
    },
  ]

  return (
    <StatelessProposalStatusAndInfo
      {...props}
      info={info}
      status={t('info.loading')}
    />
  )
}
