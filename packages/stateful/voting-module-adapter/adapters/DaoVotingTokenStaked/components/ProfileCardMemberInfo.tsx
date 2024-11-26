import { usePlausible } from 'next-plausible'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilValue } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  blockHeightSelector,
  blocksPerYearSelector,
  stakingLoadingAtom,
} from '@dao-dao/state'
import { useCachedLoadable, useDao } from '@dao-dao/stateless'
import {
  BaseProfileCardMemberInfoProps,
  PlausibleEvents,
  UnstakingTask,
  UnstakingTaskStatus,
} from '@dao-dao/types'
import {
  convertExpirationToDate,
  durationToSeconds,
  processError,
} from '@dao-dao/utils'

import {
  DaoVotingTokenStakedHooks,
  useAwaitNextBlock,
  useWallet,
} from '../../../../hooks'
import { ProfileCardMemberInfoTokens } from '../../../components'
import { useGovernanceTokenInfo, useStakingInfo } from '../hooks'
import { StakingModal } from './StakingModal'

export const ProfileCardMemberInfo = ({
  maxGovernanceTokenDeposit,
  ...props
}: BaseProfileCardMemberInfoProps) => {
  const { t } = useTranslation()
  const { chainId, coreAddress, name: daoName, votingModule } = useDao()
  const {
    address: walletAddress = '',
    isWalletConnected,
    refreshBalances,
  } = useWallet()
  const plausible = usePlausible<PlausibleEvents>()

  const [showStakingModal, setShowStakingModal] = useState(false)
  const [claimingLoading, setClaimingLoading] = useState(false)
  const stakingLoading = useRecoilValue(stakingLoadingAtom)

  const { governanceToken, loadingWalletBalance: loadingUnstakedBalance } =
    useGovernanceTokenInfo({
      fetchWalletBalance: true,
    })

  const {
    unstakingDuration,
    refreshTotals,
    claimsPending,
    claimsAvailable,
    sumClaimsAvailable = HugeDecimal.zero,
    loadingWalletStakedValue,
    loadingTotalStakedValue,
    refreshClaims,
  } = useStakingInfo({
    fetchClaims: true,
    fetchWalletStakedValue: true,
    fetchTotalStakedValue: true,
  })

  const doClaim = DaoVotingTokenStakedHooks.useClaim({
    contractAddress: votingModule.address,
    sender: walletAddress,
  })

  const awaitNextBlock = useAwaitNextBlock()
  const onClaim = useCallback(async () => {
    if (!isWalletConnected) {
      return toast.error(t('error.logInToContinue'))
    }
    if (sumClaimsAvailable.isZero()) {
      return toast.error(t('error.noClaimsAvailable'))
    }

    setClaimingLoading(true)
    try {
      await doClaim()

      plausible('daoVotingClaim', {
        props: {
          chainId,
          dao: coreAddress,
          walletAddress,
          votingModule: votingModule.address,
          votingModuleType: votingModule.contractName,
        },
      })

      // New balances will not appear until the next block.
      await awaitNextBlock()

      refreshBalances()
      refreshTotals()
      refreshClaims?.()

      toast.success(
        t('success.claimedTokens', {
          amount: sumClaimsAvailable.toFormattedString({
            decimals: governanceToken.decimals,
          }),
          tokenSymbol: governanceToken.symbol,
        })
      )
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setClaimingLoading(false)
    }
  }, [
    isWalletConnected,
    sumClaimsAvailable,
    t,
    doClaim,
    plausible,
    chainId,
    coreAddress,
    walletAddress,
    votingModule.address,
    votingModule.contractName,
    awaitNextBlock,
    refreshBalances,
    refreshTotals,
    refreshClaims,
    governanceToken.decimals,
    governanceToken.symbol,
  ])

  const blockHeightLoadable = useCachedLoadable(
    blockHeightSelector({
      chainId: votingModule.chainId,
    })
  )
  const blocksPerYear = useRecoilValue(
    blocksPerYearSelector({
      chainId: votingModule.chainId,
    })
  )

  const unstakingTasks: UnstakingTask[] = [
    ...(claimsPending ?? []).map(({ amount, release_at }) => ({
      token: governanceToken,
      status: UnstakingTaskStatus.Unstaking,
      amount: HugeDecimal.from(amount),
      date: convertExpirationToDate(
        blocksPerYear,
        release_at,
        blockHeightLoadable.state === 'hasValue'
          ? blockHeightLoadable.contents
          : 0
      ),
    })),
    ...(claimsAvailable ?? []).map(({ amount, release_at }) => ({
      token: governanceToken,
      status: UnstakingTaskStatus.ReadyToClaim,
      amount: HugeDecimal.from(amount),
      date: convertExpirationToDate(
        blocksPerYear,
        release_at,
        blockHeightLoadable.state === 'hasValue'
          ? blockHeightLoadable.contents
          : 0
      ),
    })),
  ]

  return (
    <>
      <ProfileCardMemberInfoTokens
        claimingLoading={claimingLoading}
        daoName={daoName}
        loadingTokens={
          !loadingWalletStakedValue ||
          loadingWalletStakedValue.loading ||
          !loadingUnstakedBalance ||
          loadingUnstakedBalance.loading
            ? {
                loading: true,
              }
            : {
                loading: false,
                data: [
                  {
                    token: governanceToken,
                    staked: loadingWalletStakedValue.data,
                    unstaked: loadingUnstakedBalance.data,
                  },
                ],
              }
        }
        loadingVotingPower={
          !loadingWalletStakedValue ||
          loadingWalletStakedValue.loading ||
          !loadingTotalStakedValue ||
          loadingTotalStakedValue.loading
            ? { loading: true }
            : {
                loading: false,
                data: loadingWalletStakedValue.data
                  .div(loadingTotalStakedValue.data)
                  .times(100)
                  .toNumber(),
              }
        }
        onClaim={onClaim}
        onStake={() => setShowStakingModal(true)}
        refreshUnstakingTasks={() => refreshClaims?.()}
        stakingLoading={stakingLoading}
        unstakingDurationSeconds={
          (unstakingDuration &&
            durationToSeconds(blocksPerYear, unstakingDuration)) ||
          undefined
        }
        unstakingTasks={unstakingTasks}
        {...props}
      />

      <StakingModal
        maxDeposit={maxGovernanceTokenDeposit}
        onClose={() => setShowStakingModal(false)}
        visible={showStakingModal}
      />
    </>
  )
}
