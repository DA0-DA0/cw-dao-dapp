/* eslint-disable @next/next/no-img-element */

import { useRecoilValue } from 'recoil'

import {
  CwCoreSelectors,
  useGovernanceTokenInfo,
  useProposalModule,
  useStakingInfo,
  useVotingModule,
} from '@dao-dao/state'
import {
  VotingModuleType,
  convertMicroDenomToDenomWithDecimals,
  humanReadableDuration,
  processThresholdData,
} from '@dao-dao/utils'

import { useDAOInfoContext } from '../DAOInfoContext'
import { Loader } from '../Loader'
import { VoteHero } from './Hero'
import { useApr } from '@/hooks'
import { DAO_ADDRESS, DEFAULT_IMAGE_URL, VOTE_EXTERNAL_URL } from '@/util'

export const VoteHeroContentLoader = () => (
  <>
    <VoteHero.Header image={<Loader size="100%" />} />
    <VoteHero.Stats votingModuleType={useDAOInfoContext().votingModuleType} />
  </>
)

export const VoteHeroContent = () => {
  const { votingModuleType } = useDAOInfoContext()
  const config = useRecoilValue(
    CwCoreSelectors.configSelector({ contractAddress: DAO_ADDRESS })
  )
  const { governanceTokenInfo } = useGovernanceTokenInfo(DAO_ADDRESS)
  const apr = useApr()
  const { stakingContractConfig, totalStaked } = useStakingInfo(DAO_ADDRESS, {
    fetchTotalStaked: true,
  })
  const { proposalModuleConfig } = useProposalModule(DAO_ADDRESS, {
    fetchProposalDepositTokenInfo: true,
  })
  const { cw4VotingMembers } = useVotingModule(DAO_ADDRESS, {
    fetchCw4VotingMembers: votingModuleType === VotingModuleType.Cw4Voting,
  })

  const { threshold } = proposalModuleConfig
    ? processThresholdData(proposalModuleConfig.threshold)
    : { threshold: undefined }

  if (!config || !proposalModuleConfig || !threshold)
    return <VoteHeroContentLoader />

  return (
    <>
      <VoteHero.Header
        description={config.description}
        image={
          <img
            alt="logo"
            className="w-full h-full"
            src={config.image_url ?? DEFAULT_IMAGE_URL}
          />
        }
        title={config.name}
      />
      <VoteHero.Stats
        data={{
          members: cw4VotingMembers?.length,
          denom: governanceTokenInfo?.name,
          totalSupply: governanceTokenInfo
            ? convertMicroDenomToDenomWithDecimals(
                governanceTokenInfo.total_supply,
                governanceTokenInfo.decimals
              )
            : undefined,
          stakedPercent:
            totalStaked !== undefined && governanceTokenInfo
              ? Number(
                  (
                    (totalStaked / Number(governanceTokenInfo.total_supply)) *
                    100
                  ).toLocaleString()
                )
              : undefined,
          aprReward: apr !== undefined ? apr * 100 : undefined,
          unstakingDuration: stakingContractConfig
            ? stakingContractConfig.unstaking_duration
              ? humanReadableDuration(stakingContractConfig.unstaking_duration)
              : 'None'
            : undefined,
          link: VOTE_EXTERNAL_URL
            ? {
                title: 'junoswap.com',
                url: VOTE_EXTERNAL_URL,
              }
            : undefined,
        }}
        votingModuleType={votingModuleType}
      />
    </>
  )
}
