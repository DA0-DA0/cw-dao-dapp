import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { constSelector, useSetRecoilState } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  Cw20StakeSelectors,
  blockHeightSelector,
  cw20StakeQueries,
  daoVotingCw20StakedQueries,
  refreshClaimsIdAtom,
  refreshWalletBalancesIdAtom,
} from '@dao-dao/state'
import { useCachedLoadable, useCachedLoading, useDao } from '@dao-dao/stateless'
import { claimAvailable } from '@dao-dao/utils'

import { useWallet } from '../../../../hooks/useWallet'
import { UseStakingInfoOptions, UseStakingInfoResponse } from '../types'

export const useStakingInfo = ({
  fetchClaims = false,
  fetchTotalStakedValue = false,
  fetchWalletStakedValue = false,
}: UseStakingInfoOptions = {}): UseStakingInfoResponse => {
  const dao = useDao()
  const { address: walletAddress } = useWallet()
  const queryClient = useQueryClient()

  const { data: stakingContractAddress } = useSuspenseQuery(
    daoVotingCw20StakedQueries.stakingContract(queryClient, {
      chainId: dao.chainId,
      contractAddress: dao.votingModule.address,
    })
  )

  const unstakingDuration =
    useSuspenseQuery(
      cw20StakeQueries.getConfig(queryClient, {
        chainId: dao.chainId,
        contractAddress: stakingContractAddress,
      })
    ).data.unstaking_duration ?? undefined

  const setRefreshTotalBalancesId = useSetRecoilState(
    refreshWalletBalancesIdAtom(undefined)
  )
  // Refresh totals, mostly for total staked power.
  const refreshTotals = useCallback(
    () => setRefreshTotalBalancesId((id) => id + 1),
    [setRefreshTotalBalancesId]
  )

  /// Optional

  // Claims
  const blockHeightLoadable = useCachedLoadable(
    fetchClaims
      ? blockHeightSelector({
          chainId: dao.chainId,
        })
      : undefined
  )
  const blockHeight =
    blockHeightLoadable.state === 'hasValue'
      ? blockHeightLoadable.contents
      : undefined

  const _setClaimsId = useSetRecoilState(refreshClaimsIdAtom(walletAddress))
  const refreshClaims = useCallback(
    () => _setClaimsId((id) => id + 1),
    [_setClaimsId]
  )

  const loadingClaims = useCachedLoading(
    fetchClaims && walletAddress
      ? Cw20StakeSelectors.claimsSelector({
          chainId: dao.chainId,
          contractAddress: stakingContractAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined),
    undefined
  )
  const claims = loadingClaims.loading
    ? []
    : !loadingClaims.data
      ? undefined
      : loadingClaims.data.claims

  const claimsPending = blockHeight
    ? claims?.filter((c) => !claimAvailable(c, blockHeight))
    : undefined
  const claimsAvailable = blockHeight
    ? claims?.filter((c) => claimAvailable(c, blockHeight))
    : undefined
  const sumClaimsAvailable = claimsAvailable?.reduce(
    (sum, c) => sum.plus(c.amount),
    HugeDecimal.zero
  )

  // Total staked value
  const loadingTotalStakedValue = useCachedLoading(
    fetchTotalStakedValue
      ? Cw20StakeSelectors.totalValueSelector({
          chainId: dao.chainId,
          contractAddress: stakingContractAddress,
          params: [],
        })
      : constSelector(undefined),
    undefined
  )

  // Wallet staked value
  const loadingWalletStakedValue = useCachedLoading(
    fetchWalletStakedValue && walletAddress
      ? Cw20StakeSelectors.stakedValueSelector({
          chainId: dao.chainId,
          contractAddress: stakingContractAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined),
    undefined
  )

  return {
    stakingContractAddress,
    unstakingDuration,
    refreshTotals,
    /// Optional
    // Claims
    blockHeight:
      blockHeightLoadable.state === 'hasValue'
        ? blockHeightLoadable.contents
        : 0,
    refreshClaims: fetchClaims ? refreshClaims : undefined,
    claims,
    claimsPending,
    claimsAvailable,
    sumClaimsAvailable,
    // Total staked value
    loadingTotalStakedValue: loadingTotalStakedValue.loading
      ? { loading: true }
      : !loadingTotalStakedValue.data
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingTotalStakedValue.data.total),
          },
    // Wallet staked value
    loadingWalletStakedValue: loadingWalletStakedValue.loading
      ? { loading: true }
      : !loadingWalletStakedValue.data
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingWalletStakedValue.data.value),
          },
  }
}
