import { usePlausible } from 'next-plausible'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilState, useSetRecoilState } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  refreshDaoVotingPowerAtom,
  refreshFollowingDaosAtom,
  stakingLoadingAtom,
} from '@dao-dao/state'
import {
  ModalLoader,
  StakingModal as StatelessStakingModal,
  useVotingModule,
} from '@dao-dao/stateless'
import {
  BaseStakingModalProps,
  PlausibleEvents,
  StakingMode,
} from '@dao-dao/types'
import { CHAIN_GAS_MULTIPLIER, processError } from '@dao-dao/utils'

import { SuspenseLoader } from '../../../../components'
import {
  DaoVotingTokenStakedHooks,
  useAwaitNextBlock,
  useWallet,
} from '../../../../hooks'
import { useGovernanceTokenInfo, useStakingInfo } from '../hooks'

export const StakingModal = (props: BaseStakingModalProps) => (
  <SuspenseLoader
    fallback={<ModalLoader onClose={props.onClose} visible={props.visible} />}
  >
    <InnerStakingModal {...props} />
  </SuspenseLoader>
)

const InnerStakingModal = ({
  visible,
  onClose,
  initialMode = StakingMode.Stake,
  maxDeposit,
}: BaseStakingModalProps) => {
  const { t } = useTranslation()
  const {
    address: walletAddress = '',
    isWalletConnected,
    refreshBalances,
  } = useWallet()
  const votingModule = useVotingModule()
  const plausible = usePlausible<PlausibleEvents>()

  const [stakingLoading, setStakingLoading] = useRecoilState(stakingLoadingAtom)

  const { governanceToken, loadingWalletBalance: loadingUnstakedBalance } =
    useGovernanceTokenInfo({
      fetchWalletBalance: true,
    })
  const {
    unstakingDuration,
    refreshTotals,
    sumClaimsAvailable = HugeDecimal.zero,
    loadingWalletStakedValue,
    refreshClaims,
  } = useStakingInfo({
    fetchClaims: true,
    fetchWalletStakedValue: true,
  })

  const [amount, setAmount] = useState(HugeDecimal.zero)

  const doStake = DaoVotingTokenStakedHooks.useStake({
    contractAddress: votingModule.address,
    sender: walletAddress,
  })
  const doUnstake = DaoVotingTokenStakedHooks.useUnstake({
    contractAddress: votingModule.address,
    sender: walletAddress,
  })
  const doClaim = DaoVotingTokenStakedHooks.useClaim({
    contractAddress: votingModule.address,
    sender: walletAddress,
  })

  const setRefreshDaoVotingPower = useSetRecoilState(
    refreshDaoVotingPowerAtom(votingModule.dao.coreAddress)
  )
  const setRefreshFollowedDaos = useSetRecoilState(refreshFollowingDaosAtom)
  const refreshDaoVotingPower = () => {
    setRefreshDaoVotingPower((id) => id + 1)
    setRefreshFollowedDaos((id) => id + 1)
  }

  const awaitNextBlock = useAwaitNextBlock()
  const onAction = async (mode: StakingMode, amount: HugeDecimal) => {
    if (!isWalletConnected) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setStakingLoading(true)

    switch (mode) {
      case StakingMode.Stake: {
        setStakingLoading(true)

        try {
          await doStake(
            CHAIN_GAS_MULTIPLIER,
            undefined,
            amount.toCoins(governanceToken.denomOrAddress)
          )

          plausible('daoVotingStake', {
            props: {
              chainId: votingModule.chainId,
              dao: votingModule.dao.coreAddress,
              walletAddress,
              votingModule: votingModule.address,
              votingModuleType: votingModule.contractName,
            },
          })

          // New balances will not appear until the next block.
          await awaitNextBlock()

          refreshBalances()
          refreshTotals()
          refreshDaoVotingPower()

          setAmount(HugeDecimal.zero)
          toast.success(
            t('success.stakedTokens', {
              amount: amount.toFormattedString({
                decimals: governanceToken.decimals,
              }),
              tokenSymbol: governanceToken.symbol,
            })
          )

          // Close once done.
          onClose()
        } catch (err) {
          console.error(err)
          toast.error(processError(err))
        } finally {
          setStakingLoading(false)
        }

        break
      }
      case StakingMode.Unstake: {
        setStakingLoading(true)

        try {
          await doUnstake({
            amount: amount.toFixed(0),
          })

          plausible('daoVotingUnstake', {
            props: {
              chainId: votingModule.chainId,
              dao: votingModule.dao.coreAddress,
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
          refreshDaoVotingPower()

          setAmount(HugeDecimal.zero)
          toast.success(
            t('success.unstakedTokens', {
              amount: amount.toFormattedString({
                decimals: governanceToken.decimals,
              }),
              tokenSymbol: governanceToken.symbol,
            })
          )

          // Close once done.
          onClose()
        } catch (err) {
          console.error(err)
          toast.error(processError(err))
        } finally {
          setStakingLoading(false)
        }

        break
      }
      case StakingMode.Claim: {
        if (sumClaimsAvailable.isZero()) {
          toast.error(t('error.noClaimsAvailable'))
          return
        }

        setStakingLoading(true)
        try {
          await doClaim()

          plausible('daoVotingClaim', {
            props: {
              chainId: votingModule.chainId,
              dao: votingModule.dao.coreAddress,
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

          setAmount(HugeDecimal.zero)

          toast.success(
            t('success.claimedTokens', {
              amount: sumClaimsAvailable.toFormattedString({
                decimals: governanceToken.decimals,
              }),
              tokenSymbol: governanceToken.symbol,
            })
          )

          // Close once done.
          onClose()
        } catch (err) {
          console.error(err)
          toast.error(processError(err))
        } finally {
          setStakingLoading(false)
        }

        break
      }
      default:
        toast.error('Internal error while staking. Unrecognized mode.')
    }
  }

  return (
    <StatelessStakingModal
      amount={amount}
      claimableTokens={sumClaimsAvailable}
      error={isWalletConnected ? undefined : t('error.logInToContinue')}
      initialMode={initialMode}
      loading={stakingLoading}
      loadingStakableTokens={
        !loadingUnstakedBalance || loadingUnstakedBalance.loading
          ? { loading: true }
          : {
              loading: false,
              data: HugeDecimal.from(loadingUnstakedBalance.data),
            }
      }
      loadingUnstakableTokens={
        !loadingWalletStakedValue || loadingWalletStakedValue.loading
          ? { loading: true }
          : {
              loading: false,
              data: HugeDecimal.from(loadingWalletStakedValue.data),
            }
      }
      onAction={onAction}
      onClose={onClose}
      proposalDeposit={maxDeposit ? HugeDecimal.from(maxDeposit) : undefined}
      setAmount={(newAmount) => setAmount(newAmount)}
      token={governanceToken}
      unstakingDuration={unstakingDuration ?? null}
      visible={visible}
    />
  )
}
