import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import { Button, TokenAmountDisplay, UnstakingModal } from '@dao-dao/stateless'
import {
  BaseProfileCardMemberInfoProps,
  GenericToken,
  LoadingData,
  UnstakingTask,
  UnstakingTaskStatus,
} from '@dao-dao/types'
import {
  formatPercentOf100,
  humanReadableList,
  secondsToWdhms,
} from '@dao-dao/utils'

export interface ProfileCardMemberInfoTokensProps
  extends Omit<BaseProfileCardMemberInfoProps, 'maxGovernanceTokenDeposit'> {
  daoName: string
  claimingLoading: boolean
  stakingLoading: boolean
  unstakingTasks: UnstakingTask[]
  unstakingDurationSeconds: number | undefined
  onClaim: () => void
  onStake: () => void
  refreshUnstakingTasks: () => void
  loadingVotingPower: LoadingData<number>
  loadingTokens: LoadingData<
    {
      token: GenericToken
      staked: HugeDecimal
      unstaked: HugeDecimal
    }[]
  >
  hideUnstaking?: boolean
}

export const ProfileCardMemberInfoTokens = ({
  daoName,
  claimingLoading,
  stakingLoading,
  unstakingTasks,
  unstakingDurationSeconds,
  onClaim,
  onStake,
  refreshUnstakingTasks,
  cantVoteOnProposal,
  loadingVotingPower,
  loadingTokens,
  hideUnstaking,
}: ProfileCardMemberInfoTokensProps) => {
  const { t } = useTranslation()

  const claimableBalance = useMemo(
    () =>
      unstakingTasks.reduce(
        (acc, task) =>
          acc.plus(
            // Only include balance of ready to claim tasks.
            task.status === UnstakingTaskStatus.ReadyToClaim
              ? task.amount
              : HugeDecimal.zero
          ),
        HugeDecimal.zero
      ),
    [unstakingTasks]
  )
  const totalUnstakingBalance = useMemo(
    () =>
      unstakingTasks.reduce(
        (acc, task) =>
          acc.plus(
            // Only include balance of unstaking tasks.
            task.status === UnstakingTaskStatus.Unstaking
              ? task.amount
              : HugeDecimal.zero
          ),
        HugeDecimal.zero
      ),
    [unstakingTasks]
  )
  const unstakingBalanceByToken = useMemo(
    () =>
      unstakingTasks.reduce(
        (acc, task) => ({
          ...acc,
          [task.token.denomOrAddress]: (
            acc[task.token.denomOrAddress] || HugeDecimal.zero
          ).plus(
            task.status === UnstakingTaskStatus.Unstaking
              ? task.amount
              : HugeDecimal.zero
          ),
        }),
        {} as Partial<Record<string, HugeDecimal>>
      ),
    [unstakingTasks]
  )

  const [showUnstakingTokens, setShowUnstakingTokens] = useState(false)

  const hasStaked =
    !loadingTokens.loading &&
    loadingTokens.data.some(({ staked }) => staked.isPositive())
  const hasUnstaked =
    !loadingTokens.loading &&
    loadingTokens.data.some(({ unstaked }) => unstaked.isPositive())
  const isMember = !loadingVotingPower.loading && loadingVotingPower.data > 0
  const canBeMemberButIsnt = !isMember && hasUnstaked

  const onlyOneToken = !loadingTokens.loading && loadingTokens.data.length === 1
  const onlyTokenSymbol =
    loadingTokens.loading || loadingTokens.data.length === 0
      ? '...'
      : loadingTokens.data[0].token.symbol

  // If cannot vote on proposal, this means they did not have voting power at
  // the time of proposal creation. Show proposal-specific message when in a
  // proposal.
  return cantVoteOnProposal ? (
    <p className="legend-text break-words">
      {t('info.tokenDaoNotMemberInfo', {
        context: 'proposal',
        tokenSymbol: loadingTokens.loading
          ? '...'
          : humanReadableList(
              loadingTokens.data.map(({ token }) => token.symbol)
            ),
        daoName,
      })}
    </p>
  ) : (
    <>
      <div className="secondary-text space-y-3">
        {!isMember && (
          <p className="secondary-text mb-4 break-words text-text-body">
            {t('info.tokenDaoNotMemberInfo', {
              context: 'dao',
              tokenSymbol: loadingTokens.loading
                ? '...'
                : humanReadableList(
                    loadingTokens.data.map(({ token }) => token.symbol)
                  ),
              daoName,
            })}
          </p>
        )}

        <div className="flex flex-row items-start justify-between gap-6">
          <p>{t('title.balances')}</p>

          <div
            className={clsx(
              'flex min-w-0 items-end gap-1',
              // If can't vote on proposal or has staked tokens, show staked
              // tokens first since it is most relevant. Otherwise, show
              // unstaked tokens first.
              cantVoteOnProposal || hasStaked ? 'flex-col' : 'flex-col-reverse'
            )}
          >
            {loadingTokens.loading ? (
              // Loading placeholder.
              <TokenAmountDisplay
                amount={{ loading: true }}
                className="text-right font-mono text-text-tertiary"
                decimals={0}
                suffix={` ${t('info.staked')}`}
                symbol=""
              />
            ) : (
              loadingTokens.data.map(({ token, staked }) => (
                <TokenAmountDisplay
                  key={token.denomOrAddress}
                  amount={staked}
                  className={clsx(
                    'text-right font-mono',
                    !staked && 'text-text-tertiary'
                  )}
                  decimals={token.decimals}
                  suffix={` ${t('info.staked')}`}
                  symbol={token.symbol}
                />
              ))
            )}

            {loadingTokens.loading ? (
              // Loading placeholder.
              <TokenAmountDisplay
                amount={{ loading: true }}
                className="text-right font-mono text-text-tertiary"
                decimals={0}
                symbol=""
              />
            ) : (
              loadingTokens.data.map(({ token, unstaked }) => (
                <TokenAmountDisplay
                  key={token.denomOrAddress}
                  amount={unstaked}
                  className={clsx(
                    'text-right font-mono',
                    unstaked
                      ? 'text-icon-interactive-valid'
                      : 'text-text-tertiary'
                  )}
                  decimals={token.decimals}
                  suffix={` ${t('info.available')}`}
                  symbol={token.symbol}
                />
              ))
            )}
          </div>
        </div>

        {/* Only show voting power if loading or non-zero. */}
        {(loadingVotingPower.loading || loadingVotingPower.data > 0) && (
          <div className="flex flex-row items-center justify-between">
            <p>{t('title.votingPower')}</p>
            <p
              className={clsx(
                'text-right font-mono',
                loadingVotingPower.loading
                  ? 'animate-pulse text-text-tertiary'
                  : 'text-text-brand-secondary'
              )}
            >
              {loadingVotingPower.loading
                ? '...'
                : formatPercentOf100(loadingVotingPower.data)}
            </p>
          </div>
        )}

        {/* Show unstaking balance if any are unstaking or claimable or if they are a member. */}
        {!hideUnstaking &&
          (isMember ||
            totalUnstakingBalance.isPositive() ||
            claimableBalance.isPositive()) && (
            <div className="flex flex-row items-center justify-between">
              <p>{t('title.unstakingTokens')}</p>

              <Button
                className={clsx(
                  'text-right font-mono underline-offset-2',
                  totalUnstakingBalance.isZero() && 'text-text-tertiary'
                )}
                contentContainerClassName="justify-end flex flex-col items-end"
                onClick={() => setShowUnstakingTokens(true)}
                variant={
                  totalUnstakingBalance.isPositive() ? 'underline' : 'none'
                }
              >
                {!loadingTokens.loading &&
                  (onlyOneToken
                    ? loadingTokens.data
                    : loadingTokens.data.filter(
                        ({ token }) =>
                          unstakingBalanceByToken[token.denomOrAddress]
                      )
                  ).map(({ token }) => (
                    <TokenAmountDisplay
                      key={token.denomOrAddress}
                      amount={
                        unstakingBalanceByToken[token.denomOrAddress] ||
                        HugeDecimal.zero
                      }
                      decimals={token.decimals}
                      symbol={token.symbol}
                    />
                  ))}
              </Button>
            </div>
          )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {claimableBalance.isPositive() && (
          <Button
            contentContainerClassName="justify-center"
            disabled={stakingLoading}
            loading={claimingLoading}
            onClick={onClaim}
            size="lg"
            variant={
              // If stake button below is brand, don't make this brand.
              canBeMemberButIsnt ? 'secondary' : 'brand'
            }
          >
            {loadingTokens.loading ||
            loadingTokens.data.length === 0 ||
            !onlyOneToken
              ? t('button.claimYourTokens')
              : t('button.claimNumTokens', {
                  amount:
                    claimableBalance.toInternationalizedHumanReadableString({
                      decimals: loadingTokens.data[0].token.decimals,
                    }),
                  tokenSymbol: onlyTokenSymbol,
                })}
          </Button>
        )}

        <Button
          contentContainerClassName="justify-center"
          disabled={claimingLoading || (!isMember && !hasUnstaked)}
          loading={stakingLoading}
          onClick={onStake}
          size="lg"
          variant={canBeMemberButIsnt ? 'brand' : 'secondary'}
        >
          {loadingTokens.loading || !hasStaked
            ? onlyOneToken
              ? t('button.stakeTokenSymbol', { tokenSymbol: onlyTokenSymbol })
              : t('button.stakeTokens')
            : onlyOneToken
              ? t('button.manageStake', { tokenSymbol: onlyTokenSymbol })
              : t('button.manageYourStake')}
        </Button>
      </div>

      {!hideUnstaking && (
        <UnstakingModal
          claimingLoading={claimingLoading}
          onClaim={onClaim}
          onClose={() => setShowUnstakingTokens(false)}
          refresh={refreshUnstakingTasks}
          tasks={unstakingTasks}
          unstakingDuration={
            unstakingDurationSeconds
              ? secondsToWdhms(unstakingDurationSeconds)
              : undefined
          }
          visible={showUnstakingTokens}
        />
      )}
    </>
  )
}
