import { useWallet } from '@noahsaso/cosmodal'
import { constSelector, useRecoilValue } from 'recoil'

import {
  Cw20BaseSelectors,
  Cw20StakedBalanceVotingSelectors,
  tokenUSDCPriceSelector,
} from '@dao-dao/state'

import { useVotingModuleAdapterOptions } from '../../../react/context'
import {
  UseGovernanceTokenInfoOptions,
  UseGovernanceTokenInfoResponse,
} from '../../../types'

export const useGovernanceTokenInfo = ({
  fetchWalletBalance = false,
  fetchTreasuryBalance = false,
  fetchUSDCPrice,
}: UseGovernanceTokenInfoOptions = {}): UseGovernanceTokenInfoResponse => {
  const { address: walletAddress } = useWallet()
  const { coreAddress, votingModuleAddress } = useVotingModuleAdapterOptions()

  const stakingContractAddress = useRecoilValue(
    Cw20StakedBalanceVotingSelectors.stakingContractSelector({
      contractAddress: votingModuleAddress,
    })
  )

  const governanceTokenAddress = useRecoilValue(
    Cw20StakedBalanceVotingSelectors.tokenContractSelector({
      contractAddress: votingModuleAddress,
    })
  )
  const governanceTokenInfo = useRecoilValue(
    governanceTokenAddress
      ? Cw20BaseSelectors.tokenInfoSelector({
          contractAddress: governanceTokenAddress,
          params: [],
        })
      : constSelector(undefined)
  )
  const governanceTokenMarketingInfo = useRecoilValue(
    governanceTokenAddress
      ? Cw20BaseSelectors.marketingInfoSelector({
          contractAddress: governanceTokenAddress,
          params: [],
        })
      : constSelector(undefined)
  )

  /// Optional

  // Wallet balance
  const walletBalance = useRecoilValue(
    fetchWalletBalance && governanceTokenAddress && walletAddress
      ? Cw20BaseSelectors.balanceSelector({
          contractAddress: governanceTokenAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined)
  )?.balance

  // Treasury balance
  const treasuryBalance = useRecoilValue(
    fetchTreasuryBalance && governanceTokenAddress
      ? Cw20BaseSelectors.balanceSelector({
          contractAddress: governanceTokenAddress,
          params: [{ address: coreAddress }],
        })
      : constSelector(undefined)
  )?.balance

  // Price info
  const price = useRecoilValue(
    fetchUSDCPrice && governanceTokenInfo
      ? tokenUSDCPriceSelector({
          denom: governanceTokenAddress,
          tokenDecimals: governanceTokenInfo.decimals,
        })
      : constSelector(undefined)
  )

  return {
    stakingContractAddress,
    governanceTokenAddress,
    governanceTokenInfo,
    governanceTokenMarketingInfo,
    /// Optional
    // Wallet balance
    walletBalance: walletBalance ? Number(walletBalance) : undefined,
    // Treasury balance
    treasuryBalance: treasuryBalance ? Number(treasuryBalance) : undefined,
    // Price
    price,
  }
}
