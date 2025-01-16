import {
  AccountBalance,
  ArchiveRounded,
  PaidRounded,
} from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import {
  chainQueries,
  refreshTokenCardLazyInfoAtom,
  tokenCardLazyInfoSelector,
} from '@dao-dao/state'
import {
  ChainProvider,
  TokenCard as StatelessTokenCard,
  useCachedLoading,
  useDao,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import {
  AccountType,
  ActionKey,
  ButtonPopupSection,
  DaoTokenCardProps,
} from '@dao-dao/types'
import {
  StakingActionType,
  getDaoProposalSinglePrefill,
  getDisplayNameForChainId,
  getNativeTokenForChainId,
  tokensEqual,
} from '@dao-dao/utils'

import { useDaoGovernanceToken } from '../../hooks'
import { useVotingModuleAdapter } from '../../voting-module-adapter'
import { ButtonLink } from '../ButtonLink'
import { EntityDisplay } from '../EntityDisplay'
import { DaoTokenDepositModal } from './DaoTokenDepositModal'

export const DaoTokenCard = ({
  noExtraActions = false,
  ...props
}: DaoTokenCardProps) => {
  const { token, owner, unstakedBalance } = props

  const { t } = useTranslation()
  const router = useRouter()
  const { coreAddress } = useDao()
  const { getDaoProposalPath } = useDaoNavHelpers()

  const lazyInfo = useCachedLoading(
    tokenCardLazyInfoSelector({
      owner: owner.address,
      token,
      unstakedBalance: unstakedBalance.toString(),
    }),
    {
      usdUnitPrice: undefined,
      stakingInfo: undefined,
      totalBalance: unstakedBalance,
    }
  )

  const governanceTokenInfo = useDaoGovernanceToken()
  const {
    components: { StakingModal },
  } = useVotingModuleAdapter()
  // If this token is the governance token for the DAO, hide deposit and show
  // staking modal.
  const isGovernanceToken =
    !!governanceTokenInfo && tokensEqual(token, governanceTokenInfo)

  // Refresh staking info.
  const setRefreshTokenCardLazyInfo = useSetRecoilState(
    refreshTokenCardLazyInfoAtom({
      token: token.source,
      owner: owner.address,
    })
  )
  const queryClient = useQueryClient()
  const refreshNativeTokenStakingInfo = useCallback(() => {
    // Invalidate validators.
    queryClient.invalidateQueries({
      queryKey: ['chain', 'validator', { chainId: owner.chainId }],
    })
    // Then native delegation info.
    queryClient.invalidateQueries({
      queryKey: chainQueries.nativeDelegationInfo(queryClient, {
        chainId: owner.chainId,
        address: owner.address,
      }).queryKey,
    })
    // Then token card lazy info.
    setRefreshTokenCardLazyInfo((id) => id + 1)
  }, [owner.address, owner.chainId, queryClient, setRefreshTokenCardLazyInfo])

  const lazyStakes = lazyInfo.loading
    ? []
    : (lazyInfo.data.stakingInfo?.stakes ?? [])
  const stakesWithRewards = lazyStakes.filter(({ rewards }) =>
    rewards.isPositive()
  )

  const nativeToken = getNativeTokenForChainId(token.chainId)

  // Prefill URLs valid...
  const proposeClaimHref =
    // ...there is something to claim
    stakesWithRewards.length > 0 &&
    // ...and this is the native token
    token.denomOrAddress === nativeToken.denomOrAddress
      ? getDaoProposalPath(coreAddress, 'create', {
          prefill: getDaoProposalSinglePrefill({
            actions: stakesWithRewards.map(({ validator: { address } }) => ({
              actionKey: ActionKey.ManageStaking,
              data: {
                chainId: token.chainId,
                stakeType: StakingActionType.WithdrawDelegatorReward,
                validator: address,
                // Default values, not needed for displaying this type of message.
                amount: 1,
                denom: token.denomOrAddress,
              },
            })),
          }),
        })
      : undefined

  // Prefill URL is valid if...
  const proposeStakeUnstakeHref =
    // ...there is something to stake or unstake
    (unstakedBalance.isPositive() || lazyStakes.length > 0) &&
    // ...and this is the native token
    token.denomOrAddress === nativeToken.denomOrAddress
      ? getDaoProposalPath(coreAddress, 'create', {
          prefill: getDaoProposalSinglePrefill({
            // If has unstaked, show stake action by default.
            actions: unstakedBalance.isPositive()
              ? [
                  {
                    actionKey: ActionKey.ManageStaking,
                    data: {
                      chainId: token.chainId,
                      stakeType: StakingActionType.Delegate,
                      validator: '',
                      amount: unstakedBalance,
                      denom: token.denomOrAddress,
                    },
                  },
                ]
              : // If has only staked, show unstake actions by default.
                lazyStakes.map(({ validator, amount }) => ({
                  actionKey: ActionKey.ManageStaking,
                  data: {
                    chainId: token.chainId,
                    stakeType: StakingActionType.Undelegate,
                    validator,
                    amount,
                    denom: token.denomOrAddress,
                  },
                })),
          }),
        })
      : undefined

  const onClaim = proposeClaimHref
    ? () => router.push(proposeClaimHref)
    : undefined

  const [depositVisible, setDepositVisible] = useState(false)
  const showDeposit = useCallback(() => setDepositVisible(true), [])

  const [showGovernanceStakingModal, setShowGovernanceStakingModal] =
    useState(false)

  const extraActionSections: ButtonPopupSection[] =
    !noExtraActions &&
    // Don't show stake actions for ICA accounts.
    owner.type !== AccountType.Ica &&
    (proposeStakeUnstakeHref || proposeClaimHref)
      ? [
          {
            label: t('title.newProposalTo'),
            buttons: [
              ...(proposeStakeUnstakeHref
                ? [
                    {
                      Icon: ArchiveRounded,
                      label: t('button.stakeOrUnstake'),
                      closeOnClick: true,
                      href: proposeStakeUnstakeHref,
                    },
                  ]
                : []),
              ...(proposeClaimHref
                ? [
                    {
                      Icon: PaidRounded,
                      label: t('button.claimStakingRewards'),
                      closeOnClick: true,
                      href: proposeClaimHref,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []

  return (
    <ChainProvider chainId={token.chainId}>
      <StatelessTokenCard
        {...props}
        ButtonLink={ButtonLink}
        EntityDisplay={EntityDisplay}
        actions={{
          token: isGovernanceToken
            ? [
                // If this is the governance token, show manage staking button.
                {
                  Icon: AccountBalance,
                  label: t('button.manageStake', {
                    tokenSymbol: token.symbol,
                  }),
                  closeOnClick: true,
                  onClick: () => setShowGovernanceStakingModal(true),
                },
              ]
            : // Only show deposit button if not governance token. People
              // accidentally deposit governance tokens into the DAO when they're
              // trying to stake them.
              //
              // Also hide for ICA accounts since they may or may not allow
              // spending.
              owner.type !== AccountType.Ica
              ? [
                  {
                    Icon: AccountBalance,
                    label: t('button.deposit'),
                    closeOnClick: true,
                    onClick: showDeposit,
                  },
                ]
              : [],
          extraSections: extraActionSections,
        }}
        lazyInfo={lazyInfo}
        onClaim={onClaim}
        refreshUnstakingTasks={refreshNativeTokenStakingInfo}
        subtitle={getDisplayNameForChainId(token.chainId)}
      />

      {isGovernanceToken && StakingModal && (
        <StakingModal
          onClose={() => setShowGovernanceStakingModal(false)}
          visible={showGovernanceStakingModal}
        />
      )}

      {!isGovernanceToken && (
        <DaoTokenDepositModal
          onClose={() => setDepositVisible(false)}
          owner={owner}
          token={token}
          visible={depositVisible}
        />
      )}
    </ChainProvider>
  )
}
