import {
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { HugeDecimal } from '@dao-dao/math'
import { daoVotingOnftStakedQueries, omniflixQueries } from '@dao-dao/state'
import { useVotingModule } from '@dao-dao/stateless'
import { TokenType } from '@dao-dao/types'

import { useQueryLoadingDataWithError } from '../../../../hooks'
import { useWallet } from '../../../../hooks/useWallet'
import {
  UseGovernanceCollectionInfoOptions,
  UseGovernanceCollectionInfoResponse,
} from '../types'

export const useGovernanceCollectionInfo = ({
  fetchWalletBalance = false,
  fetchTreasuryBalance = false,
}: UseGovernanceCollectionInfoOptions = {}): UseGovernanceCollectionInfoResponse => {
  const votingModule = useVotingModule()
  const { address: walletAddress } = useWallet()

  const queryClient = useQueryClient()
  const {
    data: { onft_collection_id },
  } = useSuspenseQuery(
    daoVotingOnftStakedQueries.config(queryClient, {
      chainId: votingModule.chainId,
      contractAddress: votingModule.address,
    })
  )

  const [
    {
      data: { name, symbol, previewUri },
    },
    { data: totalSupply },
  ] = useSuspenseQueries({
    queries: [
      omniflixQueries.onftCollectionInfo({
        chainId: votingModule.chainId,
        id: onft_collection_id,
      }),
      omniflixQueries.onftCollectionSupply({
        chainId: votingModule.chainId,
        id: onft_collection_id,
      }),
    ],
  })

  /// Optional

  // Wallet balance
  const loadingWalletBalance = useQueryLoadingDataWithError(
    omniflixQueries.onftCollectionSupply(
      fetchWalletBalance && walletAddress
        ? {
            chainId: votingModule.chainId,
            id: onft_collection_id,
            owner: walletAddress,
          }
        : undefined
    )
  )

  // Treasury balance
  const loadingTreasuryBalance = useQueryLoadingDataWithError(
    omniflixQueries.onftCollectionSupply(
      fetchTreasuryBalance
        ? {
            chainId: votingModule.chainId,
            id: onft_collection_id,
            owner: votingModule.dao.coreAddress,
          }
        : undefined
    )
  )

  return {
    stakingContractAddress: votingModule.address,
    collectionAddress: onft_collection_id,
    collectionInfo: {
      name,
      symbol,
      totalSupply: HugeDecimal.from(totalSupply),
    },
    token: {
      chainId: votingModule.chainId,
      type: TokenType.Onft,
      denomOrAddress: onft_collection_id,
      symbol,
      decimals: 0,
      imageUrl: previewUri,
      source: {
        chainId: votingModule.chainId,
        type: TokenType.Onft,
        denomOrAddress: onft_collection_id,
      },
    },
    /// Optional
    // Wallet balance
    loadingWalletBalance:
      !fetchWalletBalance || loadingWalletBalance.errored
        ? undefined
        : loadingWalletBalance.loading
          ? { loading: true }
          : {
              loading: false,
              data: HugeDecimal.from(loadingWalletBalance.data),
            },
    // Treasury balance
    loadingTreasuryBalance:
      !fetchTreasuryBalance || loadingTreasuryBalance.errored
        ? undefined
        : loadingTreasuryBalance.loading
          ? { loading: true }
          : {
              loading: false,
              data: HugeDecimal.from(loadingTreasuryBalance.data),
            },
  }
}
