import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query'
import { constSelector } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  Cw20BaseSelectors,
  cw20BaseQueries,
  daoVotingCw20StakedQueries,
  tokenQueries,
  usdPriceSelector,
} from '@dao-dao/state'
import { useCachedLoading, useDao } from '@dao-dao/stateless'
import { TokenType } from '@dao-dao/types'

import { useWallet } from '../../../../hooks/useWallet'
import {
  UseGovernanceTokenInfoOptions,
  UseGovernanceTokenInfoResponse,
} from '../types'

export const useGovernanceTokenInfo = ({
  fetchWalletBalance = false,
  fetchTreasuryBalance = false,
  fetchUsdcPrice = false,
}: UseGovernanceTokenInfoOptions = {}): UseGovernanceTokenInfoResponse => {
  const dao = useDao()
  const { address: walletAddress } = useWallet()
  const queryClient = useQueryClient()

  const [{ data: stakingContractAddress }, { data: governanceTokenAddress }] =
    useSuspenseQueries({
      queries: [
        daoVotingCw20StakedQueries.stakingContract(queryClient, {
          chainId: dao.chainId,
          contractAddress: dao.votingModule.address,
        }),
        daoVotingCw20StakedQueries.tokenContract(queryClient, {
          chainId: dao.chainId,
          contractAddress: dao.votingModule.address,
        }),
      ],
    })

  const [{ data: governanceToken }, { data: cw20TokenInfo }] =
    useSuspenseQueries({
      queries: [
        tokenQueries.info(queryClient, {
          chainId: dao.chainId,
          type: TokenType.Cw20,
          denomOrAddress: governanceTokenAddress,
        }),
        cw20BaseQueries.tokenInfo(queryClient, {
          chainId: dao.chainId,
          contractAddress: governanceTokenAddress,
        }),
      ],
    })

  /// Optional

  // Wallet balance
  const loadingWalletBalance = useCachedLoading(
    fetchWalletBalance && walletAddress
      ? Cw20BaseSelectors.balanceSelector({
          chainId: dao.chainId,
          contractAddress: governanceTokenAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined),
    undefined
  )

  // Treasury balance
  const loadingTreasuryBalance = useCachedLoading(
    fetchTreasuryBalance
      ? Cw20BaseSelectors.balanceSelector({
          chainId: dao.chainId,
          contractAddress: governanceTokenAddress,
          params: [{ address: dao.coreAddress }],
        })
      : constSelector(undefined),
    undefined
  )

  // Price info
  const loadingPrice = useCachedLoading(
    fetchUsdcPrice
      ? usdPriceSelector({
          chainId: dao.chainId,
          type: TokenType.Cw20,
          denomOrAddress: governanceTokenAddress,
        })
      : constSelector(undefined),
    undefined
  )

  return {
    governanceToken,
    supply: HugeDecimal.from(cw20TokenInfo.total_supply),
    stakingContractAddress,
    /// Optional
    // Wallet balance
    loadingWalletBalance: loadingWalletBalance.loading
      ? { loading: true }
      : !loadingWalletBalance.data
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingWalletBalance.data.balance),
          },
    // Treasury balance
    loadingTreasuryBalance: loadingTreasuryBalance.loading
      ? { loading: true }
      : !loadingTreasuryBalance.data
        ? undefined
        : {
            loading: false,
            data: HugeDecimal.from(loadingTreasuryBalance.data.balance),
          },
    // Price
    loadingPrice: loadingPrice.loading
      ? { loading: true }
      : !loadingPrice.data
        ? undefined
        : {
            loading: false,
            data: loadingPrice.data,
          },
  }
}
