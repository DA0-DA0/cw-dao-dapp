import { QueryClient } from '@tanstack/react-query'

import { IDaoBase } from '@dao-dao/types'
import {
  getSupportedChainConfig,
  isConfiguredChainName,
  isSecretNetwork,
} from '@dao-dao/utils'

import { ChainXGovDao } from './ChainXGovDao'
import { CwDao } from './CwDao'
import { SecretCwDao } from './CwDao.secret'

/**
 * Function that returns the correct DAO client based on the provided chain ID
 * and core address.
 */
export const getDao = ({
  queryClient,
  chainId,
  coreAddress,
}: {
  queryClient: QueryClient
  chainId: string
  coreAddress: string
}): IDaoBase => {
  let daoAddress = coreAddress

  // Native chain x/gov governance.
  if (isConfiguredChainName(chainId, coreAddress)) {
    // Use real gov DAO if exists.
    const chainConfigGovAddress =
      getSupportedChainConfig(chainId)?.govContractAddress
    if (chainConfigGovAddress) {
      daoAddress = chainConfigGovAddress
    } else {
      // Chain x/gov DAO.
      return new ChainXGovDao(queryClient, {
        chainId,
      })
    }
  }

  const DaoType = isSecretNetwork(chainId) ? SecretCwDao : CwDao

  return new DaoType(queryClient, {
    chainId,
    coreAddress: daoAddress,
  })
}
