import { EyeIcon, EyeOffIcon } from '@heroicons/react/outline'
import clsx from 'clsx'
import { FC, ReactNode, useMemo, useState } from 'react'

import { ActionsRenderer } from '@dao-dao/actions'
import { Trans, useTranslation } from '@dao-dao/i18n'
import {
  Proposal,
  Status,
  Vote as VoteChoice,
} from '@dao-dao/state/clients/cw-proposal-single'
import {
  VotingModuleType,
  decodeMessages,
  decodedMessagesString,
} from '@dao-dao/utils'

import { Button } from '../Button'
import { CosmosMessageDisplay } from '../CosmosMessageDisplay'
import { Execute } from '../Execute'
import { MarkdownPreview } from '../MarkdownPreview'
import { Vote } from '../Vote'
import { VoteDisplay } from './VoteDisplay'

interface ProposalDetailsProps {
  coreAddress: string
  votingModuleType: VotingModuleType
  proposal: Proposal
  proposalId: number
  walletVote: VoteChoice | undefined
  walletWeightPercent: number
  loading: boolean
  showStaking: boolean
  setShowStaking: (value: boolean) => void
  stakingModal?: ReactNode
  onExecute: () => void
  onVote: (choice: VoteChoice) => Promise<void>
  connected: boolean
  connectWalletButton?: ReactNode
  allowRevoting: boolean
}

export const ProposalDetails: FC<ProposalDetailsProps> = ({
  coreAddress,
  votingModuleType,
  proposal,
  proposalId,
  walletVote,
  walletWeightPercent,
  loading,
  stakingModal,
  showStaking,
  setShowStaking,
  onExecute,
  onVote,
  connected,
  connectWalletButton,
  allowRevoting,
}) => {
  const { t } = useTranslation()
  const decodedMessages = useMemo(
    () => decodeMessages(proposal.msgs),
    [proposal.msgs]
  )
  const [showRaw, setShowRaw] = useState(false)

  const canVote =
    proposal.status === Status.Open &&
    (allowRevoting || !walletVote) &&
    walletWeightPercent !== 0

  return (
    <div>
      <div className="max-w-prose">
        <h1 className="header-text">{proposal.title}</h1>
      </div>
      <div className="mt-6">
        <MarkdownPreview markdown={proposal.description} />
      </div>
      {!!decodedMessages?.length && (
        <>
          <div className="mt-9 mb-3 font-mono caption-text">
            {t('title.actions', { count: decodedMessages.length })}
          </div>
          {showRaw ? (
            <CosmosMessageDisplay
              value={decodedMessagesString(proposal.msgs)}
            />
          ) : (
            <ActionsRenderer
              coreAddress={coreAddress}
              messages={decodedMessages}
              proposalId={proposalId}
              votingModuleType={votingModuleType}
            />
          )}
        </>
      )}
      {!!decodedMessages.length && (
        <div className="mt-4">
          <Button
            onClick={() => setShowRaw((s) => !s)}
            size="sm"
            variant="secondary"
          >
            {showRaw ? (
              <>
                {t('button.hideRawData')}
                <EyeOffIcon className="inline ml-1 h-4 stroke-current" />
              </>
            ) : (
              <>
                {t('button.showRawData')}
                <EyeIcon className="inline ml-1 h-4 stroke-current" />
              </>
            )}
          </Button>
        </div>
      )}
      {proposal.status === Status.Passed && (
        <>
          <p className="mt-6 mb-4 link-text">{t('title.status')}</p>
          <Execute
            loading={loading}
            messages={proposal.msgs.length}
            onExecute={onExecute}
          />
        </>
      )}

      <p className="mt-6 mb-4 link-text">{t('title.vote')}</p>

      {connected ? (
        <>
          {walletVote && (
            <p
              className={clsx('flex flex-row gap-2 items-center body-text', {
                'mb-2': allowRevoting && canVote,
              })}
            >
              <Trans
                components={[<VoteDisplay key="vote" vote={walletVote} />]}
                i18nKey="info.votedOnProposal"
              />
              {allowRevoting && canVote && ' ' + t('info.voteAgain')}
            </p>
          )}
          {canVote && (
            <Vote
              loading={loading}
              onVote={onVote}
              voterWeightPercent={walletWeightPercent}
            />
          )}
          {proposal.status !== Status.Open && !walletVote && (
            <p className="body-text">{t('info.didNotVote')}</p>
          )}
          {walletWeightPercent === 0 && (
            <p className="max-w-prose body-text">
              {t('info.mustHaveVotingPowerAtCreation')}{' '}
              {/* Only show staking modal if using staked balance to vote. */}
              {votingModuleType === VotingModuleType.Cw20StakedBalanceVoting &&
                stakingModal && (
                  <>
                    <button
                      className="underline"
                      onClick={() => setShowStaking(true)}
                    >
                      {t('button.stakeTokensSuggestion')}
                    </button>
                    {showStaking && stakingModal}
                  </>
                )}
            </p>
          )}
        </>
      ) : (
        connectWalletButton
      )}
    </div>
  )
}
