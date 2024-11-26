import { usePlausible } from 'next-plausible'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import {
  constSelector,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
  waitForAll,
} from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  Cw20StakeSelectors,
  refreshDaoVotingPowerAtom,
  refreshFollowingDaosAtom,
  stakingLoadingAtom,
} from '@dao-dao/state'
import {
  ModalLoader,
  StakingModal as StatelessStakingModal,
  useCachedLoadable,
  useVotingModule,
} from '@dao-dao/stateless'
import {
  BaseStakingModalProps,
  PlausibleEvents,
  StakingMode,
} from '@dao-dao/types'
import { encodeJsonToBase64, processError } from '@dao-dao/utils'

import { SuspenseLoader } from '../../../../components'
import {
  Cw20BaseHooks,
  Cw20StakeHooks,
  OraichainCw20StakingHooks,
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
  onClose,
  visible,
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
    stakingContractAddress,
    unstakingDuration,
    refreshTotals,
    sumClaimsAvailable = HugeDecimal.zero,
    loadingWalletStakedValue,
    refreshClaims,
  } = useStakingInfo({
    fetchClaims: true,
    fetchWalletStakedValue: true,
  })

  const [isOraichainCustomStaking, totalStakedBalance, totalValue] =
    useRecoilValue(
      waitForAll([
        Cw20StakeSelectors.isOraichainProxySnapshotContractSelector({
          chainId: votingModule.chainId,
          contractAddress: stakingContractAddress,
        }),
        Cw20StakeSelectors.totalStakedAtHeightSelector({
          chainId: votingModule.chainId,
          contractAddress: stakingContractAddress,
          params: [{}],
        }),
        Cw20StakeSelectors.totalValueSelector({
          chainId: votingModule.chainId,
          contractAddress: stakingContractAddress,
          params: [],
        }),
      ])
    )

  const oraichainCw20StakingConfig = useRecoilValue(
    isOraichainCustomStaking
      ? Cw20StakeSelectors.oraichainProxySnapshotConfigSelector({
          chainId: votingModule.chainId,
          contractAddress: stakingContractAddress,
        })
      : constSelector(undefined)
  )

  // Support Oraichain custom cw20-staking contract.
  const stakingContractToExecute = isOraichainCustomStaking
    ? // If Oraichain proxy snapshot, fallback to empty string so it errors if
      // trying to stake anything. This should never happen.
      oraichainCw20StakingConfig?.staking_contract || ''
    : stakingContractAddress

  const walletStakedBalanceLoadable = useCachedLoadable(
    walletAddress
      ? Cw20StakeSelectors.stakedBalanceAtHeightSelector({
          chainId: votingModule.chainId,
          contractAddress: stakingContractAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined)
  )
  const walletStakedBalance =
    walletStakedBalanceLoadable.state === 'hasValue' &&
    walletStakedBalanceLoadable.contents
      ? walletStakedBalanceLoadable.contents.balance
      : undefined

  const [amount, setAmount] = useState(HugeDecimal.zero)

  const doCw20SendAndExecute = Cw20BaseHooks.useSend({
    contractAddress: governanceToken.denomOrAddress,
    sender: walletAddress,
  })
  const doUnstake = Cw20StakeHooks.useUnstake({
    contractAddress: stakingContractToExecute,
    sender: walletAddress,
  })
  const doOraichainUnbond = OraichainCw20StakingHooks.useUnbond({
    contractAddress: stakingContractToExecute,
    sender: walletAddress,
  })
  const doClaim = Cw20StakeHooks.useClaim({
    contractAddress: stakingContractToExecute,
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
          await doCw20SendAndExecute({
            amount: amount.toString(),
            contract: stakingContractToExecute,
            msg: encodeJsonToBase64({
              [isOraichainCustomStaking ? 'bond' : 'stake']: {},
            }),
          })

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
        if (walletStakedBalance === undefined) {
          toast.error(t('error.loadingData'))
          return
        }

        setStakingLoading(true)

        // In the UI we display staked value as `amount_staked +
        // rewards` and is the value used to compute voting power. When we actually
        // process an unstake call, the contract expects this value in terms of
        // amount_staked.
        //
        // value = amount_staked * total_value / staked_total
        //
        // => amount_staked = staked_total * value / total_value
        let amountToUnstake = amount
          .times(totalStakedBalance.total)
          .div(totalValue.total)

        // We have limited precision and on the contract side division rounds
        // down, so division and multiplication don't commute. Handle the common
        // case here where someone is attempting to unstake all of their funds.
        if (
          HugeDecimal.from(walletStakedBalance)
            .minus(amountToUnstake)
            .abs()
            .lte(1)
        ) {
          amountToUnstake = HugeDecimal.from(walletStakedBalance)
        }

        try {
          if (isOraichainCustomStaking) {
            await doOraichainUnbond({
              amount: amountToUnstake.toString(),
              stakingToken: governanceToken.denomOrAddress,
            })
          } else {
            await doUnstake({
              amount: amountToUnstake.toString(),
            })
          }

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
          if (isOraichainCustomStaking) {
            // Oraichain claiming is an unbond with zero amount.
            await doOraichainUnbond({
              amount: '0',
              stakingToken: governanceToken.denomOrAddress,
            })
          } else {
            await doClaim()
          }

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
      loadingStakableTokens={loadingUnstakedBalance ?? { loading: true }}
      loadingUnstakableTokens={loadingWalletStakedValue}
      onAction={onAction}
      onClose={onClose}
      proposalDeposit={maxDeposit ? HugeDecimal.from(maxDeposit) : undefined}
      setAmount={setAmount}
      token={governanceToken}
      unstakingDuration={unstakingDuration ?? null}
      visible={visible}
    />
  )
}
