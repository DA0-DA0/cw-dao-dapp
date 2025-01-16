import { Check, Close } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { ProgressBar, Tooltip, TooltipInfoIcon } from '@dao-dao/stateless'
import { ProcessedTQType } from '@dao-dao/types'
import { formatPercentOf100 } from '@dao-dao/utils'

import { VotesInfo } from '../../types'

export type ProposalVoteTallyProps = {
  votesInfo: VotesInfo
  open: boolean
  // Change labels for pre-propose-approver proposals that are responsible for
  // approving another proposal to match vote labels.
  isPreProposeApproverProposal: boolean
}

export const ProposalVoteTally = ({
  votesInfo: {
    threshold,
    quorum,
    // Raw info
    yesVotes,
    noVotes,
    abstainVotes,
    totalVotingPower,
    turnoutTotal,
    // Turnout percents
    turnoutPercent,
    turnoutYesPercent,
    turnoutNoPercent,
    turnoutAbstainPercent,
    // Total percents
    totalYesPercent,
    totalNoPercent,
    totalAbstainPercent,
    // Meta
    thresholdReached,
    quorumReached,
  },
  open,
  isPreProposeApproverProposal,
}: ProposalVoteTallyProps) => {
  const { t } = useTranslation()

  // When only abstain votes have been cast and there is no quorum,
  // align the abstain progress bar to the right to line up with Abstain
  // text.
  const onlyAbstain = yesVotes === 0 && noVotes === 0 && abstainVotes > 0

  const effectiveYesPercent = quorum ? turnoutYesPercent : totalYesPercent
  const effectiveNoPercent = quorum ? turnoutNoPercent : totalNoPercent
  const effectiveAbstainPercent = quorum
    ? turnoutAbstainPercent
    : totalAbstainPercent

  // Convert various threshold types to a relevant percent to use in UI
  // elements.
  const effectivePercentOrMajorityValue =
    threshold.type === ProcessedTQType.Majority
      ? // If there are no abstain votes, this should be 50.
        // If there are 4% abstain votes, this should be 48, since 48%+1 of the 96% non-abstain votes need to be in favor.
        50 -
        (abstainVotes / 2 / ((quorum ? turnoutTotal : totalVotingPower) || 1)) *
          100
      : threshold.type === ProcessedTQType.Percent
        ? threshold.value
        : // If absolute, compute percent of total.
          (threshold.value / totalVotingPower) * 100
  // Quorum does not have an absolute setting.
  const effectiveQuorum = quorum && {
    display: quorum.display,
    value: quorum.type === ProcessedTQType.Majority ? 50 : quorum.value,
  }

  return (
    <div className="rounded-lg border border-border-secondary bg-component-widget">
      <div className="space-y-4 py-4 px-6">
        {/* Threshold title */}
        <p className="link-text text-text-body">
          {quorum ? t('title.ratioOfVotes') : t('title.turnout')}
        </p>

        {/* Vote percentage stats */}
        <div className="caption-text flex flex-row items-center gap-4">
          {[
            <p key="yes" className="text-text-interactive-valid">
              {formatPercentOf100(effectiveYesPercent)}{' '}
              {isPreProposeApproverProposal
                ? t('proposalVoteTitle.approve')
                : t('info.yesVote')}
            </p>,
            <p key="no" className="text-text-interactive-error">
              {formatPercentOf100(effectiveNoPercent)}{' '}
              {isPreProposeApproverProposal
                ? t('proposalVoteTitle.reject')
                : t('info.noVote')}
            </p>,
          ]
            .sort(() => yesVotes - noVotes)
            .map((elem, idx) => (
              <div
                key={idx}
                className={idx === 0 && yesVotes !== noVotes ? 'flex-1' : ''}
              >
                {elem}
              </div>
            ))}
          <p
            className={`text-text-tertiary ${
              yesVotes === noVotes ? 'flex-1 text-right' : ''
            }`}
          >
            {formatPercentOf100(effectiveAbstainPercent)}{' '}
            {t('info.abstainVote')}
          </p>
        </div>

        {/* Threshold progress bar */}
        <div className="my-2">
          <ProgressBar
            // If using an absolute threshold (i.e. no quorum) and there are
            // only abstain votes cast so far, align to the right.
            alignEnd={!quorum && onlyAbstain}
            caretPosition={effectivePercentOrMajorityValue}
            rows={[
              {
                thickness: 10,
                data: [
                  ...[
                    {
                      value: Number(effectiveYesPercent),
                      color: 'var(--icon-interactive-valid)',
                    },
                    {
                      value: Number(effectiveNoPercent),
                      color: 'var(--icon-interactive-error)',
                    },
                  ].sort((a, b) => b.value - a.value),
                  {
                    value: Number(effectiveAbstainPercent),
                    color: 'var(--icon-tertiary)',
                  },
                ],
              },
            ]}
          />
        </div>

        <div className="secondary-text flex flex-row items-center justify-between gap-2">
          <p className="text-text-tertiary">{t('title.passingThreshold')}</p>

          {/* Threshold config display */}
          <p className="flex flex-row items-center gap-1">
            <Tooltip title={t('info.proposalThresholdTooltip')}>
              <p className="text-text-body">{threshold.display}</p>
            </Tooltip>

            {/* A proposal will automatically close once no more votes can affect the outcome, not waiting for the expiration time. This means we can simply check if the proposal is open to know whether the threshold being reached indicates a final verdict or just the current state of the turnout. We could, more verbosely, always display the final verdict (reached/not met) when there is no quorum (i.e. if using an absolute threshold config), but once the final verdict is set, the status will change. Thus, we don't need to check if a quorum exists to choose this status indicator. */}
            {thresholdReached ? (
              <Tooltip title={open ? t('info.passing') : t('info.reached')}>
                <Check className="!h-5 !w-5 text-icon-primary" />
              </Tooltip>
            ) : (
              <Tooltip title={open ? t('info.failing') : t('info.notMet')}>
                <Close className="!h-5 !w-5 text-icon-primary" />
              </Tooltip>
            )}
          </p>
        </div>
      </div>

      {/* Quorum, if present */}
      {effectiveQuorum && (
        <div className="space-y-4 border-t border-border-secondary py-4 px-6">
          {/* Quorum title */}
          <p className="link-text text-text-body">
            {t('title.percentTurnout', {
              value: formatPercentOf100(turnoutPercent),
            })}
          </p>

          {/* Quorum progress bar */}
          <div className="my-2">
            <ProgressBar
              caretPosition={effectiveQuorum.value}
              rows={[
                {
                  thickness: 10,
                  data: [
                    {
                      value: Number(turnoutPercent),
                      color: 'var(--icon-secondary)',
                    },
                  ],
                },
              ]}
            />
          </div>

          {/* Quorum config display */}
          <div className="secondary-text flex flex-row items-center justify-between gap-2">
            <div className="flex flex-row items-center gap-1">
              <p className="text-text-tertiary">{t('title.quorum')}</p>
              <TooltipInfoIcon
                iconClassName="text-icon-tertiary"
                size="sm"
                title={t('info.proposalQuorumTooltip')}
              />
            </div>

            <p className="flex flex-row items-center gap-1">
              <Tooltip title={t('info.proposalQuorumTooltip')}>
                <p className="text-text-body">{effectiveQuorum.display}</p>
              </Tooltip>

              {quorumReached ? (
                <Tooltip title={t('info.reached')}>
                  <Check className="!h-5 !w-5 text-icon-primary" />
                </Tooltip>
              ) : (
                <Tooltip title={t('info.notMet')}>
                  <Close className="!h-5 !w-5 text-icon-primary" />
                </Tooltip>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Provide clarification for what happens in the event of a tie when the threshold is exactly 50%. */}
      {
        // effectivePercentOrMajorityValue is set to 50 when the type is majority, but
        // there are no ties in the majority case, so we can ignore it.
        threshold.type !== ProcessedTQType.Majority &&
          effectivePercentOrMajorityValue === 50 &&
          turnoutTotal > 0 &&
          yesVotes === noVotes && (
            <div className="space-y-2 border-t border-border-secondary py-4 px-6">
              <p className="secondary-text text-text-tertiary">
                {t('title.proposalTieClarification')}
              </p>

              <p className="body-text">
                {t('info.yesWillWinTieClarification')}
              </p>
            </div>
          )
      }

      {/* Provide clarification for what happens in the event that all voters abstain. */}
      {turnoutTotal > 0 && abstainVotes === turnoutTotal && (
        <div className="space-y-2 border-t border-border-secondary py-4 px-6">
          <p className="secondary-text text-text-tertiary">
            {t('title.proposalAllAbstain')}
          </p>

          <p className="body-text">
            {t('info.proposalAllAbstainClarification')}
          </p>
        </div>
      )}
    </div>
  )
}

export const ProposalVoteTallyLoader = ({
  isPreProposeApproverProposal,
}: Pick<ProposalVoteTallyProps, 'isPreProposeApproverProposal'>) => {
  const { t } = useTranslation()

  return (
    <div className="animate-pulse rounded-lg border border-border-secondary bg-component-widget">
      <div className="space-y-4 py-4 px-6">
        {/* Threshold title */}
        <p className="link-text text-text-body">{t('title.ratioOfVotes')}</p>

        {/* Vote percentage stats */}
        <div className="caption-text flex flex-row items-center gap-4">
          <p key="yes" className="text-text-interactive-valid">
            ...{' '}
            {isPreProposeApproverProposal
              ? t('proposalVoteTitle.approve')
              : t('info.yesVote')}
          </p>
          <p key="no" className="text-text-interactive-error">
            ...{' '}
            {isPreProposeApproverProposal
              ? t('proposalVoteTitle.reject')
              : t('info.noVote')}
          </p>
          <p className="text-text-tertiary">... {t('info.abstainVote')}</p>
        </div>

        {/* Threshold progress bar */}
        <div className="my-2">
          <ProgressBar
            rows={[
              {
                thickness: 10,
              },
            ]}
          />
        </div>

        <div className="secondary-text flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-1">
            <p className="text-text-tertiary">{t('title.passingThreshold')}</p>
            <TooltipInfoIcon
              iconClassName="text-icon-tertiary"
              size="sm"
              title={t('info.proposalThresholdTooltip')}
            />
          </div>

          {/* Threshold config display */}
          <p className="flex flex-row items-center">
            <Tooltip title={t('info.proposalThresholdTooltip')}>
              <p className="text-text-body">...</p>
            </Tooltip>
          </p>
        </div>
      </div>

      {/* Quorum, if present */}
      <div className="space-y-4 border-t border-border-secondary py-4 px-6">
        {/* Quorum title */}
        <p className="link-text text-text-body">{t('title.turnout')}</p>

        {/* Quorum progress bar */}
        <div className="my-2">
          <ProgressBar
            rows={[
              {
                thickness: 10,
              },
            ]}
          />
        </div>

        {/* Quorum config display */}
        <div className="secondary-text flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-1">
            <p className="text-text-tertiary">{t('title.quorum')}</p>
            <TooltipInfoIcon
              iconClassName="text-icon-tertiary"
              size="sm"
              title={t('info.proposalQuorumTooltip')}
            />
          </div>

          <p className="flex flex-row items-center">
            <Tooltip title={t('info.proposalQuorumTooltip')}>
              <p className="text-text-body">...</p>
            </Tooltip>
          </p>
        </div>
      </div>
    </div>
  )
}
