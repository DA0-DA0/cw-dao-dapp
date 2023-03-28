import { useWallet } from '@noahsaso/cosmodal'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import {
  CwVestingSelectors,
  nativeUnstakingDurationSecondsSelector,
  refreshNativeTokenStakingInfoAtom,
  refreshVestingAtom,
  refreshWalletBalancesIdAtom,
  validatorsSelector,
} from '@dao-dao/state/recoil'
import {
  StakingModal,
  StakingModalProps,
  StakingMode,
  useCachedLoadable,
  useDaoInfoContext,
} from '@dao-dao/stateless'
import { TokenStake } from '@dao-dao/types'
import {
  NATIVE_DECIMALS,
  NATIVE_DENOM,
  convertDenomToMicroDenomWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  nativeTokenLabel,
  processError,
} from '@dao-dao/utils'

import { useAwaitNextBlock } from '../../../../../hooks'
import {
  useDelegate,
  useRedelegate,
  useUndelegate,
} from '../../../../../hooks/contracts/CwVesting'
import { VestingInfo } from '../../types'

export type NativeStakingModalProps = Pick<
  StakingModalProps,
  'visible' | 'onClose'
> & {
  vestingInfo: VestingInfo
  stakes: TokenStake[] | undefined
}

export const NativeStakingModal = ({
  vestingInfo: { vestingContractAddress, stakable },
  stakes,
  ...props
}: NativeStakingModalProps) => {
  const { t } = useTranslation()
  const { chainId } = useDaoInfoContext()

  const vestLoadable = useCachedLoadable(
    CwVestingSelectors.infoSelector({
      contractAddress: vestingContractAddress,
      chainId,
      params: [],
    })
  )

  const validatorsLoadable = useCachedLoadable(
    validatorsSelector({
      chainId,
    })
  )

  const unstakingDurationLoadable = useCachedLoadable(
    nativeUnstakingDurationSecondsSelector({
      chainId,
    })
  )

  // Refreshes validator balances.
  const setRefreshValidatorBalances = useSetRecoilState(
    refreshWalletBalancesIdAtom('')
  )
  const setRefreshVesting = useSetRecoilState(
    refreshVestingAtom(vestingContractAddress)
  )
  const setRefreshStaking = useSetRecoilState(
    refreshNativeTokenStakingInfoAtom(vestingContractAddress)
  )
  const awaitNextBlock = useAwaitNextBlock()

  const [amount, setAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { address: walletAddress = '' } = useWallet()
  const delegate = useDelegate({
    contractAddress: vestingContractAddress,
    sender: walletAddress,
  })
  const undelegate = useUndelegate({
    contractAddress: vestingContractAddress,
    sender: walletAddress,
  })
  const redelegate = useRedelegate({
    contractAddress: vestingContractAddress,
    sender: walletAddress,
  })

  if (
    vestLoadable.state !== 'hasValue' ||
    validatorsLoadable.state !== 'hasValue'
  ) {
    return null
  }

  const onAction = async (
    mode: StakingMode,
    amount: number,
    validator?: string,
    fromValidator?: string
  ) => {
    // Should never happen.
    if (!validator) {
      toast.error(t('error.noValidatorSelected'))
      return
    }

    setLoading(true)
    try {
      if (mode === StakingMode.Stake) {
        await delegate({
          amount: convertDenomToMicroDenomWithDecimals(
            amount,
            NATIVE_DECIMALS
          ).toString(),
          validator,
        })
      } else if (mode === StakingMode.Unstake) {
        await undelegate({
          amount: convertDenomToMicroDenomWithDecimals(
            amount,
            NATIVE_DECIMALS
          ).toString(),
          validator,
        })
      } else if (mode === StakingMode.Restake) {
        if (!fromValidator) {
          toast.error(t('error.noFromValidatorSelected'))
          return
        }

        await redelegate({
          amount: convertDenomToMicroDenomWithDecimals(
            amount,
            NATIVE_DECIMALS
          ).toString(),
          dstValidator: validator,
          srcValidator: fromValidator,
        })
      }

      // Wait a block for balances to update.
      await awaitNextBlock()
      setRefreshValidatorBalances((id) => id + 1)
      setRefreshVesting((id) => id + 1)
      setRefreshStaking((id) => id + 1)

      toast.success(
        mode === StakingMode.Stake
          ? t('success.staked')
          : mode === StakingMode.Restake
          ? t('success.restaked')
          : mode === StakingMode.Unstake
          ? t('success.unstaked')
          : // Should never happen.
            t('error.loadingData')
      )
      props.onClose()
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <StakingModal
      amount={amount}
      claimableTokens={
        // Tokens are claimable somewhere else.
        0
      }
      enableRestaking
      initialMode={StakingMode.Stake}
      loading={loading}
      loadingStakableTokens={{
        loading: false,
        data: convertMicroDenomToDenomWithDecimals(stakable, NATIVE_DECIMALS),
      }}
      onAction={onAction}
      setAmount={setAmount}
      tokenDecimals={NATIVE_DECIMALS}
      tokenDenom={NATIVE_DENOM}
      tokenSymbol={nativeTokenLabel(NATIVE_DENOM)}
      unstakingDuration={
        unstakingDurationLoadable.state === 'hasValue'
          ? { time: unstakingDurationLoadable.contents }
          : null
      }
      validatorPicker={{
        validators: validatorsLoadable.contents,
        stakes,
      }}
      {...props}
    />
  )
}
