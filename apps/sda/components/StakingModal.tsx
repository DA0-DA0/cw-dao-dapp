import { useState, FunctionComponent, Suspense } from 'react'

import { constSelector, useRecoilValue } from 'recoil'

import { useWallet, blockHeightSelector } from '@dao-dao/state'
import { useSend } from '@dao-dao/state/hooks/cw20-base'
import { useClaim, useUnstake } from '@dao-dao/state/hooks/stake-cw20'
import { stakingContractSelector } from '@dao-dao/state/recoil/selectors/clients/cw20-staked-balance-voting'
import {
  claimsSelector,
  getConfigSelector,
} from '@dao-dao/state/recoil/selectors/clients/stake-cw20'
import {
  StakingMode,
  StakingModal as StatelessStakingModal,
  Modal,
} from '@dao-dao/ui'
import {
  claimAvailable,
  convertDenomToMicroDenomWithDecimals,
} from '@dao-dao/utils'
import { XIcon } from '@heroicons/react/outline'
import toast from 'react-hot-toast'

import { Logo } from '.'
import { useGovernanceTokenInfo } from '@/hooks'
import { cleanChainError } from '@/util'

interface StakingModalProps {
  defaultMode: StakingMode
  onClose: () => void
}

export const StakingModal: FunctionComponent<StakingModalProps> = (props) => (
  <Suspense fallback={<LoadingStakingModal {...props} />}>
    <InnerStakingModal {...props} />
  </Suspense>
)

const InnerStakingModal: FunctionComponent<StakingModalProps> = ({
  defaultMode,
  onClose,
}) => {
  const { address: walletAddress, connected } = useWallet()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(0)

  const unstakedBalance = 2500.1234
  const stakedBalance = 1025.4321

  const {
    votingModuleAddress,
    governanceTokenContractAddress,
    governanceTokenInfo,
  } = useGovernanceTokenInfo()
  const stakingContractAddress = useRecoilValue(
    votingModuleAddress
      ? stakingContractSelector({ contractAddress: votingModuleAddress })
      : constSelector(undefined)
  )
  const stakingContractConfig = useRecoilValue(
    stakingContractAddress
      ? getConfigSelector({ contractAddress: stakingContractAddress })
      : constSelector(undefined)
  )

  const unstakingDuration = stakingContractConfig?.unstaking_duration ?? null

  const blockHeight = useRecoilValue(blockHeightSelector)
  const claims =
    useRecoilValue(
      walletAddress && stakingContractAddress
        ? claimsSelector({
            contractAddress: stakingContractAddress,
            params: [{ address: walletAddress }],
          })
        : constSelector(undefined)
    )?.claims ?? []
  const sumClaimsAvailable =
    blockHeight !== undefined
      ? claims
          .filter((c) => claimAvailable(c, blockHeight))
          .reduce((p, c) => p + Number(c.amount), 0)
      : 0

  const doStake = useSend({
    contractAddress: governanceTokenContractAddress ?? '',
    sender: walletAddress ?? '',
  })
  const doUnstake = useUnstake({
    contractAddress: stakingContractAddress ?? '',
    sender: walletAddress ?? '',
  })
  const doClaim = useClaim({
    contractAddress: stakingContractAddress ?? '',
    sender: walletAddress ?? '',
  })

  const onAction = async (mode: StakingMode, amount: number) => {
    if (!connected || !governanceTokenInfo || !stakingContractAddress) return

    setLoading(true)

    switch (mode) {
      case StakingMode.Stake: {
        const microAmount = convertDenomToMicroDenomWithDecimals(
          amount,
          governanceTokenInfo.decimals
        )

        setLoading(true)

        try {
          await doStake({
            amount: microAmount,
            contract: stakingContractAddress,
            msg: btoa('{"stake":{}}'),
          })
          toast.success(`Staked ${amount} tokens`)
          setAmount(0)
        } catch (err) {
          toast.error(cleanChainError(err.message))
        }

        setLoading(false)

        // TODO: Figure out what to do about this.
        // New staking balances will not appear until the next block has been added.
        // setTimeout(() => {
        //   setWalletTokenBalanceUpdateCount((p) => p + 1)
        // }, 6500)

        break
      }
      case StakingMode.Unstake: {
        const microAmount = convertDenomToMicroDenomWithDecimals(
          amount,
          governanceTokenInfo.decimals
        )

        setLoading(true)
        try {
          await doUnstake({ amount: microAmount })
          toast.success(`Unstaked ${amount} tokens`)
          setAmount(0)
        } catch (err) {
          toast.error(cleanChainError(err.message))
        }

        setLoading(false)

        // TODO: Figure out what to do about this.
        // New staking balances will not appear until the next block has been added.
        // setTimeout(() => {
        //   setWalletTokenBalanceUpdateCount((p) => p + 1)
        // }, 6500)

        break
      }
      case StakingMode.Claim: {
        if (sumClaimsAvailable === 0) {
          return toast.error('No claims available.')
        }

        setLoading(true)
        try {
          await doClaim()
          toast.success(`Claimed ${sumClaimsAvailable} tokens`)
          setAmount(0)
        } catch (err) {
          toast.error(cleanChainError(err.message))
        }

        setLoading(false)

        // TODO: Figure out what to do about this.
        // New staking balances will not appear until the next block has been added.
        // setTimeout(() => {
        //   setWalletTokenBalanceUpdateCount((p) => p + 1)
        // }, 6500)

        break
      }
      default:
        toast.error('Internal error while staking. Unrecognized mode.')
    }
  }

  // Don't render until ready.
  if (!governanceTokenInfo) return null

  return (
    <StatelessStakingModal
      amount={amount}
      claimableTokens={sumClaimsAvailable}
      defaultMode={defaultMode}
      error={connected ? undefined : 'Please connect your wallet.'}
      loading={loading}
      onAction={onAction}
      onClose={onClose}
      setAmount={(newAmount) => setAmount(newAmount)}
      stakableTokens={unstakedBalance}
      tokenDecimals={governanceTokenInfo.decimals}
      tokenSymbol={governanceTokenInfo.symbol}
      unstakableTokens={stakedBalance}
      unstakingDuration={unstakingDuration}
    />
  )
}

const LoadingStakingModal: FunctionComponent<StakingModalProps> = ({
  onClose,
}) => (
  <Modal onClose={onClose}>
    <div className="relative p-40 bg-white rounded-lg border border-focus cursor-auto">
      <button
        className="absolute top-2 right-2 p-1 hover:bg-secondary rounded-full transition"
        onClick={onClose}
      >
        <XIcon className="w-4 h-4" />
      </button>

      <div className="animate-spin">
        <Logo height={40} width={40} />
      </div>
    </div>
  </Modal>
)
