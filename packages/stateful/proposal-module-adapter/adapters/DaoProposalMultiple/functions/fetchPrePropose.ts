import { daoProposalMultipleQueries, proposalQueries } from '@dao-dao/state'
import { Feature, FetchPreProposeFunction } from '@dao-dao/types'
import { isFeatureSupportedByVersion } from '@dao-dao/utils'

export const fetchPrePropose: FetchPreProposeFunction = async (
  queryClient,
  chainId,
  proposalModuleAddress,
  version
) => {
  if (!version || !isFeatureSupportedByVersion(Feature.PrePropose, version)) {
    return null
  }

  const creationPolicy = await queryClient.fetchQuery(
    daoProposalMultipleQueries.proposalCreationPolicy(queryClient, {
      chainId,
      contractAddress: proposalModuleAddress,
    })
  )

  const preProposeAddress =
    'Module' in creationPolicy && creationPolicy.Module.addr
      ? creationPolicy.Module.addr
      : creationPolicy &&
          'module' in creationPolicy &&
          creationPolicy.module.addr
        ? creationPolicy.module.addr
        : null

  if (!preProposeAddress) {
    return null
  }

  return await queryClient.fetchQuery(
    proposalQueries.preProposeModule(queryClient, {
      chainId,
      address: preProposeAddress,
    })
  )
}
