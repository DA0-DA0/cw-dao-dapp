import { AccountBalance } from '@mui/icons-material'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import { refreshNativeTokenStakingInfoAtom } from '@dao-dao/state'
import {
  DepositEmoji,
  MoneyEmoji,
  TokenCard as StatelessTokenCard,
  useCachedLoadable,
  useDaoInfoContext,
  useNavHelpers,
} from '@dao-dao/stateless'
import {
  ButtonPopupSection,
  CoreActionKey,
  TokenCardInfo,
} from '@dao-dao/types'
import { NATIVE_DENOM, StakeType, loadableToLoadingData } from '@dao-dao/utils'

import { useActionForKey } from '../../actions'
import { useEncodedDaoProposalSinglePrefill } from '../../hooks'
import { tokenCardLazyInfoSelector } from '../../recoil'
import { useVotingModuleAdapter } from '../../voting-module-adapter'
import { ButtonLink } from '../ButtonLink'
import { DaoTokenDepositModal } from './DaoTokenDepositModal'

export const DaoTokenCard = (props: TokenCardInfo) => {
  const { t } = useTranslation()
  const router = useRouter()
  const { coreAddress } = useDaoInfoContext()
  const { getDaoProposalPath } = useNavHelpers()

  const lazyInfoLoadable = useCachedLoadable(
    tokenCardLazyInfoSelector({
      walletAddress: coreAddress,
      token: props.token,
    })
  )

  //! Loadable errors.
  useEffect(() => {
    if (lazyInfoLoadable.state === 'hasError') {
      console.error(lazyInfoLoadable.contents)
    }
  }, [lazyInfoLoadable.contents, lazyInfoLoadable.state])

  const {
    hooks: { useCommonGovernanceTokenInfo },
    components: { StakingModal },
  } = useVotingModuleAdapter()
  const governanceInfo = useCommonGovernanceTokenInfo?.()
  // If this token is the CW20 governance token for the DAO, hide deposit and
  // show staking modal.
  const isCw20GovernanceToken =
    props.token.type === 'cw20' &&
    props.token.denomOrAddress === governanceInfo?.denomOrAddress

  // Refresh staking info.
  const setRefreshNativeTokenStakingInfo = useSetRecoilState(
    refreshNativeTokenStakingInfoAtom(coreAddress)
  )
  const refreshNativeTokenStakingInfo = useCallback(
    () => setRefreshNativeTokenStakingInfo((id) => id + 1),
    [setRefreshNativeTokenStakingInfo]
  )

  const lazyStakes =
    lazyInfoLoadable.state !== 'hasValue'
      ? []
      : lazyInfoLoadable.contents?.stakingInfo?.stakes ?? []

  const stakesWithRewards = lazyStakes.filter(({ rewards }) => rewards > 0)

  const stakeAction = useActionForKey(CoreActionKey.StakingActions)

  // Does not get used if not native token.
  const encodedProposalPrefillClaim = useEncodedDaoProposalSinglePrefill({
    actions: stakeAction
      ? stakesWithRewards.map(({ validator: { address } }) => ({
          action: stakeAction,
          data: {
            stakeType: StakeType.WithdrawDelegatorReward,
            validator: address,
            // Default values, not needed for displaying this type of message.
            amount: 1,
            denom: props.token.denomOrAddress,
          },
        }))
      : [],
  })
  // Does not get used if not native token.
  const encodedProposalPrefillStakeUnstake = useEncodedDaoProposalSinglePrefill(
    {
      // If has unstaked, show stake action by default.
      actions: stakeAction
        ? props.unstakedBalance > 0
          ? [
              {
                action: stakeAction,
                data: {
                  stakeType: StakeType.Delegate,
                  validator: '',
                  amount: props.unstakedBalance,
                  denom: props.token.denomOrAddress,
                },
              },
            ]
          : // If has only staked, show unstake actions by default.
            lazyStakes.map(({ validator, amount }) => ({
              action: stakeAction,
              data: {
                stakeType: StakeType.Undelegate,
                validator,
                amount,
                denom: props.token.denomOrAddress,
              },
            }))
        : [],
    }
  )

  const proposeClaimHref =
    // Prefill URLs valid if action exists,
    !!stakeAction &&
    // ...if there is something to claim,
    stakesWithRewards.length > 0 &&
    // ...if there is a valid prefill (meaning proposal module adapter exists)
    encodedProposalPrefillClaim &&
    props.token.denomOrAddress === NATIVE_DENOM
      ? getDaoProposalPath(coreAddress, 'create', {
          prefill: encodedProposalPrefillClaim,
        })
      : undefined

  const proposeStakeUnstakeHref =
    // Prefill URLs valid if action exists,
    !!stakeAction &&
    // ...if there is something to stake or unstake,
    (props.unstakedBalance > 0 || lazyStakes.length > 0) &&
    // ...if there is a valid prefill (meaning proposal module adapter exists)
    encodedProposalPrefillStakeUnstake &&
    props.token.denomOrAddress === NATIVE_DENOM
      ? getDaoProposalPath(coreAddress, 'create', {
          prefill: encodedProposalPrefillStakeUnstake,
        })
      : undefined

  const onClaim = proposeClaimHref
    ? () => router.push(proposeClaimHref)
    : undefined

  const [depositVisible, setDepositVisible] = useState(false)
  const showDeposit = useCallback(() => setDepositVisible(true), [])

  const [showCw20StakingModal, setShowCw20StakingModal] = useState(false)

  const extraActionSections: ButtonPopupSection[] =
    proposeStakeUnstakeHref || proposeClaimHref
      ? [
          {
            label: t('title.newProposalTo'),
            buttons: [
              ...(proposeStakeUnstakeHref
                ? [
                    {
                      Icon: DepositEmoji,
                      label: t('button.stakeOrUnstake'),
                      href: proposeStakeUnstakeHref,
                    },
                  ]
                : []),
              ...(proposeClaimHref
                ? [
                    {
                      Icon: MoneyEmoji,
                      label: t('button.claim'),
                      href: proposeClaimHref,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []

  return (
    <>
      <StatelessTokenCard
        {...props}
        ButtonLink={ButtonLink}
        actions={{
          token: isCw20GovernanceToken
            ? [
                // If this is the governance token and a CW20, show manage
                // staking button.
                {
                  Icon: AccountBalance,
                  label: t('button.manageStake', {
                    tokenSymbol: props.token.symbol,
                  }),
                  onClick: () => setShowCw20StakingModal(true),
                },
              ]
            : // Only show deposit button if not governance cw20 token. People
              // accidentally deposit governance tokens into the DAO when
              // they're trying to stake them.
              [
                {
                  Icon: AccountBalance,
                  label: t('button.deposit'),
                  onClick: showDeposit,
                },
              ],
          extraSections: extraActionSections,
        }}
        lazyInfo={loadableToLoadingData(lazyInfoLoadable, {
          usdUnitPrice: undefined,
          stakingInfo: undefined,
        })}
        onClaim={onClaim}
        refreshUnstakingTasks={refreshNativeTokenStakingInfo}
      />

      {isCw20GovernanceToken && showCw20StakingModal && StakingModal && (
        <StakingModal onClose={() => setShowCw20StakingModal(false)} />
      )}

      {!isCw20GovernanceToken && (
        <DaoTokenDepositModal
          onClose={() => setDepositVisible(false)}
          token={props.token}
          visible={depositVisible}
        />
      )}
    </>
  )
}