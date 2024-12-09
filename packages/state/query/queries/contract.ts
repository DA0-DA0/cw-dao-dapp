import { instantiate2Address } from '@cosmjs/cosmwasm-stargate'
import { fromUtf8, toUtf8 } from '@cosmjs/encoding'
import { QueryClient, queryOptions, skipToken } from '@tanstack/react-query'

import { InfoResponse } from '@dao-dao/types'
import {
  ArrayOfVestingContract,
  VestingContract,
} from '@dao-dao/types/contracts/CwPayrollFactory'
import { CodeInfoResponse } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/query'
import { AccessType } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/types'
import {
  ContractName,
  DAO_CORE_CONTRACT_NAMES,
  cosmwasmProtoRpcClientRouter,
  getChainForChainId,
  getCosmWasmClientForChainId,
  isInvalidContractError,
  isSecretNetwork,
  isValidBech32Address,
  objectMatchesStructure,
  secretCosmWasmClientRouter,
} from '@dao-dao/utils'

import { chainQueries } from './chain'
import { cwVestingQueries } from './contracts'
import { indexerQueries } from './indexer'

/**
 * Fetch contract info stored in state, which contains its name and version.
 */
export const fetchContractInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<InfoResponse> => {
  try {
    return {
      info: await queryClient.fetchQuery(
        indexerQueries.queryContract(queryClient, {
          chainId,
          contractAddress: address,
          formula: 'info',
        })
      ),
    }
  } catch (error) {
    // Rethrow contract not found errors.
    if (
      error instanceof Error &&
      error.message.includes('contract not found')
    ) {
      throw error
    }

    console.error(error)
  }

  // If indexer fails, fallback to querying chain.
  const client = await getCosmWasmClientForChainId(chainId)

  if (isSecretNetwork(chainId)) {
    // Secret Network does not allow accessing raw state directly, so this will
    // only work if the contract has an `info` query, which all our DAO
    // contracts do, but not all contracts do.
    const info = await client.queryContractSmart(address, {
      info: {},
    })

    // Verify it looks like a valid info response.
    if (
      objectMatchesStructure(info, {
        info: {
          contract: {},
          version: {},
        },
      })
    ) {
      return info
    }
  } else {
    const { data: contractInfo } = await client[
      'forceGetQueryClient'
    ]().wasm.queryContractRaw(address, toUtf8('contract_info'))
    if (contractInfo) {
      const info: InfoResponse = {
        info: JSON.parse(fromUtf8(contractInfo)),
      }
      return info
    }
  }

  throw new Error('Failed to query contract info for contract: ' + address)
}

/**
 * Check if a contract is a specific contract by name.
 */
export const fetchIsContract = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    nameOrNames,
  }: {
    chainId: string
    address: string
    nameOrNames: string | string[]
  }
): Promise<boolean> => {
  if (
    !isValidBech32Address(address, getChainForChainId(chainId).bech32Prefix)
  ) {
    return false
  }

  try {
    const {
      info: { contract },
    } = await queryClient.fetchQuery(
      contractQueries.info(queryClient, {
        chainId,
        address,
      })
    )

    return Array.isArray(nameOrNames)
      ? nameOrNames.some((name) => contract.includes(name))
      : contract.includes(nameOrNames)
  } catch (err) {
    if (
      isInvalidContractError(err) ||
      // On Secret Network, just return false, since there are weird failures
      // for failed contract queries.
      isSecretNetwork(chainId)
    ) {
      return false
    }

    // Rethrow other errors because it should not have failed.
    throw err
  }
}

/**
 * Fetch contract instantiation time.
 */
export const fetchContractInstantiationTime = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<number> => {
  try {
    return new Date(
      await queryClient.fetchQuery(
        indexerQueries.queryContract(queryClient, {
          chainId,
          contractAddress: address,
          formula: 'instantiatedAt',
          // This never changes, and the fallback is unreliable, so attempt to
          // query even if the indexer is behind.
          noFallback: true,
        })
      )
    ).getTime()
  } catch {}

  // If indexer fails, fallback to querying chain.
  const client = await getCosmWasmClientForChainId(chainId)
  const events = await client.searchTx([
    { key: 'instantiate._contract_address', value: address },
  ])

  if (events.length === 0) {
    throw new Error(
      'Failed to find instantiation time due to no instantiation events for contract: ' +
        address
    )
  }

  return await queryClient.fetchQuery(
    chainQueries.blockTimestamp(queryClient, {
      chainId,
      height: events[0].height,
    })
  )
}

/**
 * Fetch contract code info.
 */
export const fetchContractCodeInfo = async ({
  chainId,
  codeId,
}: {
  chainId: string
  codeId: number
}): Promise<CodeInfoResponse> => {
  if (isSecretNetwork(chainId)) {
    const client = await secretCosmWasmClientRouter.connect(chainId)
    const code = await client.getCodeDetails(codeId)
    return {
      codeId: BigInt(code.id),
      creator: code.creator,
      dataHash: toUtf8(code.checksum),
      // Secret Network is permissionless.
      instantiatePermission: {
        permission: AccessType.Everybody,
        addresses: [],
      },
    }
  }

  // CosmWasmClient.getContract is not compatible with Terra Classic for some
  // reason, so use protobuf query directly.
  const client = await cosmwasmProtoRpcClientRouter.connect(chainId)
  const codeInfo = (
    await client.wasm.v1.code({
      codeId: BigInt(codeId),
    })
  )?.codeInfo

  if (!codeInfo) {
    throw new Error('Code info not found for code ID: ' + codeId)
  }

  return codeInfo
}

/**
 * Fetch the wasm contract-level admin for a contract.
 */
export const fetchContractAdmin = async ({
  chainId,
  address,
}: {
  chainId: string
  address: string
}): Promise<string | null> => {
  if (isSecretNetwork(chainId)) {
    const client = await secretCosmWasmClientRouter.connect(chainId)
    return (await client.getContract(address))?.admin ?? null
  }

  // CosmWasmClient.getContract is not compatible with Terra Classic for some
  // reason, so use protobuf query directly.
  const client = await cosmwasmProtoRpcClientRouter.connect(chainId)
  return (
    (
      await client.wasm.v1.contractInfo({
        address,
      })
    )?.contractInfo?.admin ?? null
  )
}

/**
 * Get code hash for a Secret Network contract.
 */
export const fetchSecretContractCodeHash = async ({
  chainId,
  address,
}: {
  chainId: string
  address: string
}): Promise<string> => {
  const client = await secretCosmWasmClientRouter.connect(chainId)
  return client.queryCodeHashForContractAddress(address)
}

/**
 * Generate the expected instantiate2 address.
 */
export const generateInstantiate2Address = async (
  queryClient: QueryClient,
  {
    chainId,
    creator,
    codeId,
    salt,
  }: {
    chainId: string
    creator: string
    codeId: number
    salt: string
  }
): Promise<string> => {
  if (isSecretNetwork(chainId)) {
    throw new Error('Secret Network does not support instantiate2.')
  }

  const { dataHash } = await queryClient.fetchQuery(
    contractQueries.codeInfo({
      chainId,
      codeId,
    })
  )

  return instantiate2Address(
    dataHash,
    creator,
    toUtf8(salt),
    getChainForChainId(chainId).bech32Prefix
  )
}

/**
 * List all vesting contracts owned by a given account.
 */
export const listVestingContractsOwnedByAccount = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<{
  chainId: string
  contracts: ArrayOfVestingContract
}> => {
  const vestingContracts = await queryClient.fetchQuery(
    contractQueries.listContractsOwnedByAccount(queryClient, {
      chainId,
      address,
      key: 'cw-vesting',
    })
  )

  const contracts = await Promise.all(
    vestingContracts.map(
      async (contract): Promise<VestingContract> => ({
        contract,
        recipient: (
          await queryClient.fetchQuery(
            cwVestingQueries.info(queryClient, {
              chainId,
              contractAddress: contract,
            })
          )
        ).recipient,
        // Ignore.
        instantiator: '',
      })
    )
  )

  return {
    chainId,
    contracts,
  }
}

export const contractQueries = {
  /**
   * Fetch contract info stored in state, which contains its name and version.
   */
  info: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchContractInfo>[1]
  ) =>
    queryOptions({
      queryKey: ['contract', 'info', options],
      queryFn: () => fetchContractInfo(queryClient, options),
    }),
  /**
   * Check if a contract is a specific contract by name.
   */
  isContract: (
    queryClient: QueryClient,
    options?: Parameters<typeof fetchIsContract>[1]
  ) =>
    queryOptions({
      queryKey: ['contract', 'isContract', options],
      queryFn: options
        ? () => fetchIsContract(queryClient, options)
        : skipToken,
    }),
  /**
   * Check if a contract is a DAO.
   */
  isDao: (
    queryClient: QueryClient,
    options?: Omit<Parameters<typeof fetchIsContract>[1], 'nameOrNames'>
  ) =>
    contractQueries.isContract(
      queryClient,
      options && {
        ...options,
        nameOrNames: DAO_CORE_CONTRACT_NAMES,
      }
    ),
  /**
   * Check if a contract is a Polytone proxy.
   */
  isPolytoneProxy: (
    queryClient: QueryClient,
    options: Omit<Parameters<typeof fetchIsContract>[1], 'nameOrNames'>
  ) =>
    contractQueries.isContract(queryClient, {
      ...options,
      nameOrNames: ContractName.PolytoneProxy,
    }),
  /**
   * Check if a contract is a Valence account.
   */
  isValenceAccount: (
    queryClient: QueryClient,
    options: Omit<Parameters<typeof fetchIsContract>[1], 'nameOrNames'>
  ) =>
    contractQueries.isContract(queryClient, {
      ...options,
      nameOrNames: ContractName.ValenceAccount,
    }),
  /**
   * Check if a contract is a cw1-whitelist.
   */
  isCw1Whitelist: (
    queryClient: QueryClient,
    options: Omit<Parameters<typeof fetchIsContract>[1], 'nameOrNames'>
  ) =>
    contractQueries.isContract(queryClient, {
      ...options,
      nameOrNames: ContractName.Cw1Whitelist,
    }),
  /**
   * Fetch contract instantiation time.
   */
  instantiationTime: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchContractInstantiationTime>[1]
  ) =>
    queryOptions({
      queryKey: ['contract', 'instantiationTime', options],
      queryFn: () => fetchContractInstantiationTime(queryClient, options),
    }),
  /**
   * Fetch contract code info.
   */
  codeInfo: (options: Parameters<typeof fetchContractCodeInfo>[0]) =>
    queryOptions({
      queryKey: ['contract', 'codeInfo', options],
      queryFn: () => fetchContractCodeInfo(options),
    }),
  /*
   * Fetch the wasm contract-level admin for a contract.
   */
  admin: (options: Parameters<typeof fetchContractAdmin>[0]) =>
    queryOptions({
      queryKey: ['contract', 'admin', options],
      queryFn: () => fetchContractAdmin(options),
    }),
  /**
   * Fetch the code hash for a Secret Network contract.
   */
  secretCodeHash: (
    options: Parameters<typeof fetchSecretContractCodeHash>[0]
  ) =>
    queryOptions({
      queryKey: ['contract', 'secretCodeHash', options],
      queryFn: () => fetchSecretContractCodeHash(options),
    }),
  /**
   * Generate the expected instantiate2 address.
   */
  instantiate2Address: (
    queryClient: QueryClient,
    options: Parameters<typeof generateInstantiate2Address>[1]
  ) =>
    queryOptions({
      queryKey: ['contract', 'instantiate2Address', options],
      queryFn: () => generateInstantiate2Address(queryClient, options),
    }),
  /**
   * List all contracts owned by a given account.
   */
  listContractsOwnedByAccount: (
    queryClient: QueryClient,
    {
      chainId,
      address,
      key,
    }: {
      chainId: string
      address: string
      /**
       * Optionally filter by an indexer code ID key.
       */
      key?: string
    }
  ) =>
    indexerQueries.queryAccount<string[]>(queryClient, {
      chainId,
      address,
      formula: 'contract/ownedBy',
      args: {
        key,
      },
      noFallback: true,
    }),
  /**
   * List all vesting contracts owned by a given account.
   */
  listVestingContractsOwnedByAccount: (
    queryClient: QueryClient,
    options: Parameters<typeof listVestingContractsOwnedByAccount>[1]
  ) =>
    queryOptions({
      queryKey: ['contract', 'listVestingContractsOwnedByAccount', options],
      queryFn: () => listVestingContractsOwnedByAccount(queryClient, options),
    }),
}
