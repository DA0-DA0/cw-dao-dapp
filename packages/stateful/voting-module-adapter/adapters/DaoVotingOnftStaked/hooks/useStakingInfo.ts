import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  blockHeightSelector,
  contractQueries,
  daoVotingOnftStakedQueries,
  daoVotingOnftStakedQueryKeys,
  omniflixQueries,
  refreshDaoVotingPowerAtom,
} from '@dao-dao/state'
import { useCachedLoadable, useDao } from '@dao-dao/stateless'
import { LazyNftCardInfo } from '@dao-dao/types'
import { NftClaimsResponse } from '@dao-dao/types/contracts/DaoVotingOnftStaked'
import { claimAvailable, getNftKey, parseContractVersion } from '@dao-dao/utils'

import {
  useQueryLoadingData,
  useQueryLoadingDataWithError,
} from '../../../../hooks'
import { useWallet } from '../../../../hooks/useWallet'
import { UseStakingInfoOptions, UseStakingInfoResponse } from '../types'
import { useGovernanceCollectionInfo } from './useGovernanceCollectionInfo'

export const useStakingInfo = ({
  fetchClaims = false,
  fetchTotalStakedValue = false,
  fetchWalletStakedValue = false,
  fetchWalletUnstakedNfts = false,
}: UseStakingInfoOptions = {}): UseStakingInfoResponse => {
  const dao = useDao()
  const { address: walletAddress } = useWallet()
  const { collectionAddress } = useGovernanceCollectionInfo()
  const queryClient = useQueryClient()

  const { votingModule } = dao

  const [stakingContractVersion, unstakingDuration] = useSuspenseQueries({
    queries: [
      contractQueries.info(queryClient, {
        chainId: votingModule.chainId,
        address: votingModule.address,
      }),
      daoVotingOnftStakedQueries.config(queryClient, {
        chainId: votingModule.chainId,
        contractAddress: votingModule.address,
      }),
    ],
    combine: ([
      {
        data: { info },
      },
      { data: config },
    ]) => [
      parseContractVersion(info.version),
      config.unstaking_duration || undefined,
    ],
  })

  const setRefreshDaoVotingPower = useSetRecoilState(
    refreshDaoVotingPowerAtom(dao.coreAddress)
  )

  // Refresh totals, mostly for total staked power.
  const refreshTotals = useCallback(() => {
    setRefreshDaoVotingPower((id) => id + 1)
    queryClient.invalidateQueries({
      queryKey: dao.getVotingPowerQuery(walletAddress).queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: dao.getTotalVotingPowerQuery().queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: dao.votingModule.getVotingPowerQuery(walletAddress).queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: dao.votingModule.getTotalVotingPowerQuery().queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: omniflixQueries.onftCollectionSupply({
        chainId: votingModule.chainId,
        id: collectionAddress,
      }).queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: [
        'omniflix',
        'paginatedOnfts',
        {
          chainId: votingModule.chainId,
          id: collectionAddress,
        },
      ],
    })
    queryClient.invalidateQueries({
      queryKey: [
        'omniflix',
        'allOnfts',
        {
          chainId: votingModule.chainId,
          id: collectionAddress,
        },
      ],
    })
    queryClient.invalidateQueries({
      queryKey: [
        'indexer',
        'query',
        {
          chainId: votingModule.chainId,
          contractAddress: votingModule.address,
          formula: 'daoVotingOnftStaked/topStakers',
        },
      ],
    })

    // Invalidate indexer query first.
    queryClient.invalidateQueries({
      queryKey: [
        'indexer',
        'query',
        {
          chainId: votingModule.chainId,
          contractAddress: votingModule.address,
          formula: 'daoVotingOnftStaked/stakedNfts',
          args: {
            address: walletAddress,
          },
        },
      ],
    })
    // Then invalidate contract query that uses indexer query.
    queryClient.invalidateQueries({
      queryKey: daoVotingOnftStakedQueryKeys.stakedNfts(
        votingModule.chainId,
        votingModule.address,
        {
          address: walletAddress,
        }
      ),
    })
  }, [
    votingModule,
    dao,
    collectionAddress,
    queryClient,
    setRefreshDaoVotingPower,
    walletAddress,
  ])

  /// Optional

  // Claims
  const blockHeightLoadable = useCachedLoadable(
    fetchClaims
      ? blockHeightSelector({
          chainId: votingModule.chainId,
        })
      : undefined
  )
  const blockHeight =
    blockHeightLoadable.state === 'hasValue' ? blockHeightLoadable.contents : 0

  const refreshClaims = useCallback(() => {
    // Invalidate indexer query first.
    queryClient.invalidateQueries({
      queryKey: [
        'indexer',
        'query',
        {
          chainId: votingModule.chainId,
          contractAddress: votingModule.address,
          formula: 'daoVotingOnftStaked/nftClaims',
          args: {
            address: walletAddress,
          },
        },
      ],
    })
    // Then invalidate contract query that uses indexer query.
    queryClient.invalidateQueries({
      queryKey: daoVotingOnftStakedQueryKeys.nftClaims(
        votingModule.chainId,
        votingModule.address,
        {
          address: walletAddress,
        }
      ),
    })
  }, [votingModule, queryClient, walletAddress])

  const loadingClaims = useQueryLoadingData(
    daoVotingOnftStakedQueries.nftClaims(queryClient, {
      chainId: votingModule.chainId,
      contractAddress: votingModule.address,
      args: {
        address: walletAddress || '',
      },
      options: {
        enabled: fetchClaims && !!walletAddress,
      },
    }),
    { nft_claims: [] } as NftClaimsResponse
  )
  const nftClaims = loadingClaims.loading ? [] : loadingClaims.data.nft_claims

  const claimsPending = blockHeight
    ? nftClaims?.filter((c) => !claimAvailable(c, blockHeight))
    : undefined
  const claimsAvailable = blockHeight
    ? nftClaims?.filter((c) => claimAvailable(c, blockHeight))
    : undefined
  const sumClaimsAvailable = HugeDecimal.from(claimsAvailable?.length || 0)

  // Total staked value
  const loadingTotalStakedValue = useQueryLoadingDataWithError({
    ...dao.votingModule.getTotalVotingPowerQuery(),
    enabled: fetchTotalStakedValue,
  })

  // Wallet staked value
  const loadingWalletStakedNfts = useQueryLoadingDataWithError(
    daoVotingOnftStakedQueries.stakedNfts(queryClient, {
      chainId: votingModule.chainId,
      contractAddress: votingModule.address,
      args: {
        address: walletAddress ?? '',
      },
      options: {
        enabled: fetchWalletStakedValue && !!walletAddress,
      },
    }),
    (data) =>
      data.map(
        (tokenId): LazyNftCardInfo => ({
          key: getNftKey(votingModule.chainId, collectionAddress, tokenId),
          chainId: votingModule.chainId,
          collectionAddress,
          tokenId,
        })
      )
  )

  const loadingWalletUnstakedNfts = useQueryLoadingDataWithError(
    {
      ...omniflixQueries.allOnfts(queryClient, {
        chainId: votingModule.chainId,
        id: collectionAddress,
        owner: walletAddress ?? '',
      }),
      enabled: fetchWalletUnstakedNfts && !!walletAddress,
    },
    ([{ onfts }]) =>
      onfts.map(
        ({ id }): LazyNftCardInfo => ({
          key: getNftKey(votingModule.chainId, collectionAddress, id),
          chainId: votingModule.chainId,
          collectionAddress,
          tokenId: id,
        })
      )
  )

  return {
    stakingContractVersion,
    stakingContractAddress: votingModule.address,
    unstakingDuration,
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
    loadingTotalStakedValue:
      !fetchTotalStakedValue || loadingTotalStakedValue.errored
        ? undefined
        : loadingTotalStakedValue.loading
          ? { loading: true }
          : {
              loading: false,
              data: HugeDecimal.from(loadingTotalStakedValue.data.power),
            },
    // Wallet staked value
    loadingWalletStakedValue:
      !fetchWalletStakedValue || loadingWalletStakedNfts.errored
        ? undefined
        : loadingWalletStakedNfts.loading
          ? { loading: true }
          : {
              loading: false,
              data: HugeDecimal.from(loadingWalletStakedNfts.data.length),
            },
    loadingWalletStakedNfts,
    loadingWalletUnstakedNfts,
  }
}
