import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  chainQueries,
  cwVestingExtraQueries,
  cwVestingQueryKeys,
} from '@dao-dao/state/query'
import {
  nativeUnstakingDurationSecondsSelector,
  validatorsSelector,
} from '@dao-dao/state/recoil'
import {
  StakingModal,
  useCachedLoadable,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import {
  ActionKey,
  StakingModalProps,
  StakingMode,
  TokenStake,
  VestingInfo,
} from '@dao-dao/types'
import {
  getDaoProposalSinglePrefill,
  getNativeTokenForChainId,
  processError,
} from '@dao-dao/utils'

import { useAwaitNextBlock, useWallet } from '../../hooks'
import {
  useDelegate,
  useRedelegate,
  useUndelegate,
} from '../../hooks/contracts/CwVesting'

export type VestingStakingModalProps = Pick<
  StakingModalProps,
  'visible' | 'onClose'
> & {
  vestingInfo: VestingInfo
  stakes: TokenStake[] | undefined
  recipientIsDao: boolean
}

export const VestingStakingModal = ({
  vestingInfo: {
    chainId,
    vestingContractAddress,
    stakable,
    vest: { recipient },
  },
  stakes,
  recipientIsDao,
  ...props
}: VestingStakingModalProps) => {
  const { t } = useTranslation()
  const { goToDaoProposal } = useDaoNavHelpers()
  const queryClient = useQueryClient()

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

  const awaitNextBlock = useAwaitNextBlock()

  const [amount, setAmount] = useState(HugeDecimal.zero)
  const [loading, setLoading] = useState(false)

  const { address: walletAddress = '' } = useWallet({
    chainId,
  })
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

  if (validatorsLoadable.state !== 'hasValue') {
    return null
  }

  const nativeToken = getNativeTokenForChainId(chainId)

  const onAction = async (
    mode: StakingMode,
    amount: HugeDecimal,
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
        const data = {
          amount: amount.toFixed(0),
          validator,
        }

        if (recipientIsDao) {
          await goToDaoProposal(recipient, 'create', {
            prefill: getDaoProposalSinglePrefill({
              actions: [
                {
                  actionKey: ActionKey.Execute,
                  data: {
                    chainId,
                    address: vestingContractAddress,
                    message: JSON.stringify(
                      {
                        delegate: data,
                      },
                      null,
                      2
                    ),
                    funds: [],
                    cw20: false,
                  },
                },
              ],
            }),
          })
        } else {
          await delegate(data)
        }
      } else if (mode === StakingMode.Unstake) {
        const data = {
          amount: amount.toFixed(0),
          validator,
        }

        if (recipientIsDao) {
          await goToDaoProposal(recipient, 'create', {
            prefill: getDaoProposalSinglePrefill({
              actions: [
                {
                  actionKey: ActionKey.Execute,
                  data: {
                    chainId,
                    address: vestingContractAddress,
                    message: JSON.stringify(
                      {
                        undelegate: data,
                      },
                      null,
                      2
                    ),
                    funds: [],
                    cw20: false,
                  },
                },
              ],
            }),
          })
        } else {
          await undelegate(data)
        }
      } else if (mode === StakingMode.Restake) {
        if (!fromValidator) {
          toast.error(t('error.noFromValidatorSelected'))
          return
        }

        if (recipientIsDao) {
          await goToDaoProposal(recipient, 'create', {
            prefill: getDaoProposalSinglePrefill({
              actions: [
                {
                  actionKey: ActionKey.Execute,
                  data: {
                    chainId,
                    address: vestingContractAddress,
                    message: JSON.stringify(
                      {
                        redelegate: {
                          amount: amount.toFixed(0),
                          src_validator: fromValidator,
                          dst_validator: validator,
                        },
                      },
                      null,
                      2
                    ),
                    funds: [],
                    cw20: false,
                  },
                },
              ],
            }),
          })
        } else {
          await redelegate({
            amount: amount.toFixed(0),
            srcValidator: fromValidator,
            dstValidator: validator,
          })
        }
      }

      if (!recipientIsDao) {
        // Wait a block for balances to update.
        await awaitNextBlock()

        // Invalidate validators.
        queryClient.invalidateQueries({
          queryKey: ['chain', 'validator', { chainId }],
        })
        // Invalidate staking info.
        queryClient.invalidateQueries({
          queryKey: chainQueries.nativeDelegationInfo(queryClient, {
            chainId,
            address: vestingContractAddress,
          }).queryKey,
        })
        // Invalidate vesting indexer queries.
        queryClient.invalidateQueries({
          queryKey: [
            'indexer',
            'query',
            {
              chainId,
              address: vestingContractAddress,
            },
          ],
        })
        // Then invalidate contract queries that depend on indexer queries.
        queryClient.invalidateQueries({
          queryKey: cwVestingQueryKeys.address(chainId, vestingContractAddress),
        })
        // Then info query.
        queryClient.invalidateQueries({
          queryKey: cwVestingExtraQueries.info(queryClient, {
            chainId,
            address: vestingContractAddress,
          }).queryKey,
        })

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
      }

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
      actionPrefix={recipientIsDao ? t('button.propose') + ': ' : undefined}
      amount={amount}
      claimableTokens={
        // Tokens are claimable somewhere else.
        HugeDecimal.zero
      }
      enableRestaking
      initialMode={StakingMode.Stake}
      loading={loading}
      loadingStakableTokens={{
        loading: false,
        data: HugeDecimal.from(stakable),
      }}
      onAction={onAction}
      setAmount={setAmount}
      token={nativeToken}
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
