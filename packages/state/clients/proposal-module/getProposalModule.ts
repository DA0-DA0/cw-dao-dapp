import { QueryClient } from '@tanstack/react-query'

import { IProposalModuleBase } from '@dao-dao/types'
import { isSecretNetwork } from '@dao-dao/utils'

import { contractQueries } from '../../query'
import { getDao } from '../dao'
import { getProposalModuleBases as cwGetProposalModuleBases } from '../dao/CwDao'
import { getProposalModuleBases as secretCwGetProposalModuleBases } from '../dao/CwDao.secret'

/**
 * Returns the class of the proposal module client based on the provided chain
 * ID and address.
 */
export const getProposalModuleType = async ({
  queryClient,
  chainId,
  address,
}: {
  queryClient: QueryClient
  chainId: string
  address: string
}) => {
  const bases = isSecretNetwork(chainId)
    ? secretCwGetProposalModuleBases()
    : cwGetProposalModuleBases()

  const {
    info: { contract },
  } = await queryClient.fetchQuery(
    contractQueries.info(queryClient, {
      chainId,
      address,
    })
  )

  const ProposalModuleType = bases.find((Base) =>
    Base.contractNames.includes(contract)
  )
  if (!ProposalModuleType) {
    throw new Error('Unrecognized proposal module contract: ' + contract)
  }

  return ProposalModuleType
}

/**
 * Returns the correct proposal module client based on the provided chain ID and
 * address.
 */
export const getProposalModule = async ({
  queryClient,
  chainId,
  address,
}: {
  queryClient: QueryClient
  chainId: string
  address: string
}): Promise<IProposalModuleBase> => {
  const ProposalModuleType = await getProposalModuleType({
    queryClient,
    chainId,
    address,
  })

  const daoAddress = await queryClient.fetchQuery(
    ProposalModuleType.getDaoAddressQuery(queryClient, {
      chainId,
      contractAddress: address,
    })
  )

  const dao = getDao({
    queryClient,
    chainId,
    coreAddress: daoAddress,
  })
  await dao.init()

  // Find proposal module in the DAO. If non-existent, just make a new one.
  return (
    dao.proposalModules.find((m) => m.address === address) ||
    new ProposalModuleType(
      queryClient,
      // Force type-cast since it must be the right kind of DAO.
      dao as any,
      chainId,
      address,
      // No prefix since the DAO doesn't seem to have this proposal module
      // registered.
      ''
    )
  )
}
