import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useRecoilValue, useSetRecoilState, waitForAll } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  CommonNftSelectors,
  DaoVotingCw721StakedSelectors,
  blockHeightSelector,
  contractVersionSelector,
  daoVotingCw721StakedQueries,
  refreshClaimsIdAtom,
  refreshWalletBalancesIdAtom,
} from '@dao-dao/state'
import {
  useCachedLoadable,
  useCachedLoadingWithError,
  useDao,
} from '@dao-dao/stateless'
import { LazyNftCardInfo } from '@dao-dao/types'
import { claimAvailable, getNftKey } from '@dao-dao/utils'

import { useQueryLoadingDataWithError, useWallet } from '../../../../hooks'
import { UseStakingInfoOptions, UseStakingInfoResponse } from '../types'
import { useGovernanceCollectionInfo } from './useGovernanceCollectionInfo'

export const useStakingInfo = ({
  fetchClaims = false,
  fetchTotalStakedValue = false,
  fetchWalletStakedValue = false,
  fetchWalletUnstakedNfts = false,
}: UseStakingInfoOptions = {}): UseStakingInfoResponse => {
  const dao = useDao()
  const { address: walletAddress = '' } = useWallet()
  const queryClient = useQueryClient()

  const { collectionAddress: governanceTokenAddress } =
    useGovernanceCollectionInfo()

  const [stakingContractVersion, { unstaking_duration: unstakingDuration }] =
    useRecoilValue(
      waitForAll([
        contractVersionSelector({
          chainId: dao.chainId,
          contractAddress: dao.votingModule.address,
        }),
        DaoVotingCw721StakedSelectors.configSelector({
          chainId: dao.chainId,
          contractAddress: dao.votingModule.address,
          params: [],
        }),
      ])
    )

  const setRefreshTotalBalancesId = useSetRecoilState(
    refreshWalletBalancesIdAtom(undefined)
  )
  // Refresh NFTs owned by staking contract.
  const setRefreshStakedNftsId = useSetRecoilState(
    refreshWalletBalancesIdAtom(dao.votingModule.address)
  )
  // Refresh totals, mostly for total staked power.
  const refreshTotals = useCallback(() => {
    setRefreshTotalBalancesId((id) => id + 1)
    setRefreshStakedNftsId((id) => id + 1)
  }, [setRefreshStakedNftsId, setRefreshTotalBalancesId])

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
    blockHeightLoadable.state === 'hasValue' ? blockHeightLoadable.contents : 0

  const _setClaimsId = useSetRecoilState(refreshClaimsIdAtom(walletAddress))
  const refreshClaims = useCallback(
    () => _setClaimsId((id) => id + 1),
    [_setClaimsId]
  )

  const loadingClaims = useQueryLoadingDataWithError({
    ...daoVotingCw721StakedQueries.nftClaims(queryClient, {
      chainId: dao.chainId,
      contractAddress: dao.votingModule.address,
      args: { address: walletAddress },
    }),
    enabled: !!fetchClaims && !!walletAddress,
  })
  const nftClaims =
    loadingClaims.loading || loadingClaims.errored
      ? []
      : loadingClaims.data.nft_claims

  const claimsPending = blockHeight
    ? nftClaims?.filter((c) => !claimAvailable(c, blockHeight))
    : undefined
  const claimsAvailable = blockHeight
    ? nftClaims?.filter((c) => claimAvailable(c, blockHeight))
    : undefined
  const sumClaimsAvailable = HugeDecimal.from(claimsAvailable?.length || 0)

  // Total staked value
  const loadingTotalStakedValue = useQueryLoadingDataWithError({
    ...daoVotingCw721StakedQueries.totalPowerAtHeight(queryClient, {
      chainId: dao.chainId,
      contractAddress: dao.votingModule.address,
      args: {},
    }),
    enabled: !!fetchTotalStakedValue,
  })

  // Wallet staked value
  const loadingWalletStakedNfts = useQueryLoadingDataWithError(
    {
      ...daoVotingCw721StakedQueries.stakedNfts(queryClient, {
        chainId: dao.chainId,
        contractAddress: dao.votingModule.address,
        args: { address: walletAddress },
      }),
      enabled: !!fetchWalletStakedValue && !!walletAddress,
    },
    (data) =>
      data.map(
        (tokenId): LazyNftCardInfo => ({
          key: getNftKey(dao.chainId, governanceTokenAddress, tokenId),
          chainId: dao.chainId,
          collectionAddress: governanceTokenAddress,
          tokenId,
        })
      )
  )

  const loadingWalletUnstakedNfts = useCachedLoadingWithError(
    fetchWalletUnstakedNfts && walletAddress && governanceTokenAddress
      ? CommonNftSelectors.unpaginatedAllTokensForOwnerSelector({
          chainId: dao.chainId,
          contractAddress: governanceTokenAddress,
          owner: walletAddress,
        })
      : undefined,
    (data) =>
      data.map(
        (tokenId): LazyNftCardInfo => ({
          key: getNftKey(dao.chainId, governanceTokenAddress, tokenId),
          chainId: dao.chainId,
          collectionAddress: governanceTokenAddress,
          tokenId,
        })
      )
  )

  return {
    stakingContractVersion,
    stakingContractAddress: dao.votingModule.address,
    unstakingDuration: unstakingDuration ?? undefined,
    refreshTotals,
    /// Optional
    // Claims
    blockHeight:
      blockHeightLoadable.state === 'hasValue'
        ? blockHeightLoadable.contents
        : 0,
    refreshClaims: fetchClaims ? refreshClaims : undefined,
    claims: nftClaims,
    claimsPending,
    claimsAvailable,
    sumClaimsAvailable,
    // Total staked value
    loadingTotalStakedValue: loadingTotalStakedValue.loading
      ? { loading: true }
      : loadingTotalStakedValue.errored
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingTotalStakedValue.data.power),
          },
    // Wallet staked value
    loadingWalletStakedValue: loadingWalletStakedNfts.loading
      ? { loading: true }
      : loadingWalletStakedNfts.errored
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingWalletStakedNfts.data.length),
          },
    loadingWalletStakedNfts,
    loadingWalletUnstakedNfts,
  }
}
