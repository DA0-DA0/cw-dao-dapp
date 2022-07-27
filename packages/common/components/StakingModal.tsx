import { useWallet } from '@noahsaso/cosmodal'
import React, { FunctionComponent, ReactNode, useState } from 'react'
import toast from 'react-hot-toast'
import { constSelector, useRecoilState, useRecoilValue } from 'recoil'

import {
  Cw20BaseHooks,
  StakeCw20Hooks,
  StakeCw20Selectors,
  stakingLoadingAtom,
  useGovernanceTokenInfo,
  useProposalModule,
  useStakingInfo,
  useWalletBalance,
} from '@dao-dao/state'
import {
  Modal,
  StakingMode,
  StakingModal as StatelessStakingModal,
  SuspenseLoader,
} from '@dao-dao/ui'
import {
  convertDenomToMicroDenomWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  processError,
} from '@dao-dao/utils'

interface StakingModalProps {
  mode: StakingMode
  onClose: () => void
  connectWalletButton: ReactNode
  loader: ReactNode
  coreAddress: string
}

export const StakingModal: FunctionComponent<StakingModalProps> = (props) => (
  <SuspenseLoader fallback={<StakingModalLoader {...props} />}>
    <InnerStakingModal {...props} />
  </SuspenseLoader>
)

const InnerStakingModal: FunctionComponent<StakingModalProps> = ({
  mode,
  onClose,
  connectWalletButton,
  coreAddress,
}) => {
  const { address: walletAddress, connected } = useWallet()
  const { refreshBalances } = useWalletBalance()

  const [stakingLoading, setStakingLoading] = useRecoilState(stakingLoadingAtom)
  const [amount, setAmount] = useState(0)

  const {
    governanceTokenAddress,
    governanceTokenInfo,
    walletBalance: unstakedBalance,
  } = useGovernanceTokenInfo(coreAddress, {
    fetchWalletBalance: true,
  })
  const {
    stakingContractAddress,
    stakingContractConfig,
    refreshStakingContractBalances,
    refreshTotals,
    sumClaimsAvailable,
    walletStakedValue,
    refreshClaims,
  } = useStakingInfo(coreAddress, {
    fetchClaims: true,
    fetchWalletStakedValue: true,
  })
  const { proposalModuleConfig } = useProposalModule(coreAddress)

  const totalStakedBalance = useRecoilValue(
    stakingContractAddress
      ? StakeCw20Selectors.totalStakedAtHeightSelector({
          contractAddress: stakingContractAddress,
          params: [{}],
        })
      : constSelector(undefined)
  )

  const walletStakedBalance = useRecoilValue(
    stakingContractAddress && walletAddress
      ? StakeCw20Selectors.stakedBalanceAtHeightSelector({
          contractAddress: stakingContractAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined)
  )

  const totalValue = useRecoilValue(
    stakingContractAddress
      ? StakeCw20Selectors.totalValueSelector({
          contractAddress: stakingContractAddress,
        })
      : constSelector(undefined)
  )

  if (
    !governanceTokenInfo ||
    !stakingContractAddress ||
    !stakingContractConfig ||
    sumClaimsAvailable === undefined ||
    unstakedBalance === undefined ||
    walletStakedValue === undefined ||
    totalStakedBalance === undefined ||
    walletStakedBalance === undefined ||
    totalValue === undefined
  ) {
    throw new Error('Failed to load data.')
  }

  const doStake = Cw20BaseHooks.useSend({
    contractAddress: governanceTokenAddress ?? '',
    sender: walletAddress ?? '',
  })
  const doUnstake = StakeCw20Hooks.useUnstake({
    contractAddress: stakingContractAddress ?? '',
    sender: walletAddress ?? '',
  })
  const doClaim = StakeCw20Hooks.useClaim({
    contractAddress: stakingContractAddress ?? '',
    sender: walletAddress ?? '',
  })

  const onAction = async (mode: StakingMode, amount: number) => {
    if (!connected) {
      toast.error('Connect your wallet before doing that.')
    }

    setStakingLoading(true)

    switch (mode) {
      case StakingMode.Stake: {
        setStakingLoading(true)

        try {
          await doStake({
            amount: convertDenomToMicroDenomWithDecimals(
              amount,
              governanceTokenInfo.decimals
            ),
            contract: stakingContractAddress,
            msg: btoa('{"stake": {}}'),
          })

          // TODO: Figure out better solution for detecting block.
          // New balances will not appear until the next block.
          await new Promise((resolve) => setTimeout(resolve, 6500))

          refreshBalances()
          refreshTotals()
          refreshStakingContractBalances()

          setAmount(0)
          toast.success(
            `Staked ${amount.toLocaleString(undefined, {
              maximumFractionDigits: governanceTokenInfo.decimals,
            })} $${governanceTokenInfo.symbol}`
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

        // In the UI we display staked value as `amount_staked +
        // rewards` and is the value used to compute voting power. When we actually
        // process an unstake call, the contract expects this value in terms of
        // amount_staked.
        //
        // value = amount_staked * total_value / staked_total
        //
        // => amount_staked = staked_total * value / total_value
        let amountToUnstake =
          (Number(totalStakedBalance.total) * amount) / Number(totalValue.total)

        // We have limited precision and on the contract side division rounds
        // down, so division and multiplication don't commute. Handle the common
        // case here where someone is attempting to unstake all of their funds.
        if (
          Math.abs(
            Number(walletStakedBalance.balance) -
              Number(
                convertDenomToMicroDenomWithDecimals(
                  amountToUnstake,
                  governanceTokenInfo.decimals
                )
              )
          ) <= 1
        ) {
          amountToUnstake = Number(
            convertMicroDenomToDenomWithDecimals(
              walletStakedBalance.balance,
              governanceTokenInfo.decimals
            )
          )
        }

        try {
          await doUnstake({
            amount: convertDenomToMicroDenomWithDecimals(
              amountToUnstake,
              governanceTokenInfo.decimals
            ),
          })

          // TODO: Figure out better solution for detecting block.
          // New balances will not appear until the next block.
          await new Promise((resolve) => setTimeout(resolve, 6500))

          refreshBalances()
          refreshTotals()
          refreshClaims?.()
          refreshStakingContractBalances()

          setAmount(0)
          toast.success(
            `Unstaked ${amount.toLocaleString(undefined, {
              maximumFractionDigits: governanceTokenInfo.decimals,
            })} $${governanceTokenInfo.symbol}`
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
        if (sumClaimsAvailable === 0) {
          return toast.error('No claims available.')
        }

        setStakingLoading(true)
        try {
          await doClaim()

          // TODO: Figure out better solution for detecting block.
          // New balances will not appear until the next block.
          await new Promise((resolve) => setTimeout(resolve, 6500))

          refreshBalances()
          refreshTotals()
          refreshClaims?.()
          refreshStakingContractBalances()

          setAmount(0)

          toast.success(
            `Claimed ${convertMicroDenomToDenomWithDecimals(
              sumClaimsAvailable,
              governanceTokenInfo.decimals
            ).toLocaleString(undefined, {
              maximumFractionDigits: governanceTokenInfo.decimals,
            })} $${governanceTokenInfo.symbol}`
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

  // If not connected, show connect button.
  if (!connected) {
    return (
      <StakingModalWrapper onClose={onClose}>
        {connectWalletButton}
      </StakingModalWrapper>
    )
  }

  return (
    <StatelessStakingModal
      amount={amount}
      claimableTokens={sumClaimsAvailable}
      error={connected ? undefined : 'Please connect your wallet.'}
      loading={stakingLoading}
      mode={mode}
      onAction={onAction}
      onClose={onClose}
      proposalDeposit={
        proposalModuleConfig?.deposit_info?.deposit
          ? convertMicroDenomToDenomWithDecimals(
              proposalModuleConfig.deposit_info.deposit,
              governanceTokenInfo.decimals
            )
          : undefined
      }
      setAmount={(newAmount) => setAmount(newAmount)}
      stakableTokens={convertMicroDenomToDenomWithDecimals(
        unstakedBalance,
        governanceTokenInfo.decimals
      )}
      tokenDecimals={governanceTokenInfo.decimals}
      tokenSymbol={governanceTokenInfo.symbol}
      unstakableTokens={convertMicroDenomToDenomWithDecimals(
        walletStakedValue,
        governanceTokenInfo.decimals
      )}
      unstakingDuration={stakingContractConfig.unstaking_duration ?? null}
    />
  )
}

type StakingModalWrapperProps = Pick<StakingModalProps, 'onClose'>
export const StakingModalWrapper: FunctionComponent<
  StakingModalWrapperProps
> = ({ children, onClose }) => (
  <Modal containerClassName="!p-40" onClose={onClose}>
    {children}
  </Modal>
)

const StakingModalLoader: FunctionComponent<
  Omit<StakingModalWrapperProps, 'children'> & { loader: ReactNode }
> = (props) => (
  <StakingModalWrapper {...props}>{props.loader}</StakingModalWrapper>
)
