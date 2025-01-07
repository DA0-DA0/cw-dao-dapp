import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { constSelector, useRecoilValue, waitForAll } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import { CommonNftSelectors, daoVotingCw721StakedQueries } from '@dao-dao/state'
import { useCachedLoading, useDao } from '@dao-dao/stateless'
import { TokenType } from '@dao-dao/types'

import { useWallet } from '../../../../hooks/useWallet'
import {
  UseGovernanceCollectionInfoOptions,
  UseGovernanceCollectionInfoResponse,
} from '../types'

export const useGovernanceCollectionInfo = ({
  fetchWalletBalance = false,
  fetchTreasuryBalance = false,
}: UseGovernanceCollectionInfoOptions = {}): UseGovernanceCollectionInfoResponse => {
  const dao = useDao()
  const { address: walletAddress } = useWallet()
  const queryClient = useQueryClient()

  const {
    data: { nft_address: collectionAddress },
  } = useSuspenseQuery(
    daoVotingCw721StakedQueries.config(queryClient, {
      chainId: dao.chainId,
      contractAddress: dao.votingModule.address,
    })
  )

  const [contractInfo, tokenSupplyInfo] = useRecoilValue(
    waitForAll([
      CommonNftSelectors.contractInfoSelector({
        chainId: dao.chainId,
        contractAddress: collectionAddress,
        params: [],
      }),
      CommonNftSelectors.numTokensSelector({
        chainId: dao.chainId,
        contractAddress: collectionAddress,
        params: [],
      }),
    ])
  )

  /// Optional

  // Wallet balance
  const loadingWalletBalance = useCachedLoading(
    fetchWalletBalance && walletAddress
      ? CommonNftSelectors.unpaginatedAllTokensForOwnerSelector({
          chainId: dao.chainId,
          contractAddress: collectionAddress,
          owner: walletAddress,
        })
      : constSelector(undefined),
    undefined
  )

  // Treasury balance
  const loadingTreasuryBalance = useCachedLoading(
    fetchTreasuryBalance
      ? CommonNftSelectors.unpaginatedAllTokensForOwnerSelector({
          chainId: dao.chainId,
          contractAddress: collectionAddress,
          owner: dao.coreAddress,
        })
      : constSelector(undefined),
    undefined
  )

  return {
    stakingContractAddress: dao.votingModule.address,
    collectionAddress,
    collectionInfo: {
      name: contractInfo.name,
      symbol: contractInfo.symbol,
      totalSupply: HugeDecimal.from(tokenSupplyInfo.count),
    },
    token: {
      chainId: dao.chainId,
      type: TokenType.Cw721,
      denomOrAddress: collectionAddress,
      symbol: contractInfo.symbol,
      decimals: 0,
      imageUrl: undefined,
      source: {
        chainId: dao.chainId,
        type: TokenType.Cw721,
        denomOrAddress: collectionAddress,
      },
    },
    /// Optional
    // Wallet balance
    loadingWalletBalance: loadingWalletBalance.loading
      ? { loading: true }
      : !loadingWalletBalance.data
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingWalletBalance.data.length),
          },
    // Treasury balance
    loadingTreasuryBalance: loadingTreasuryBalance.loading
      ? { loading: true }
      : !loadingTreasuryBalance.data
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingTreasuryBalance.data.length),
          },
  }
}
