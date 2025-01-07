import { QueryClient } from '@tanstack/react-query'

import {
  CwCoreV1QueryClient,
  DaoDaoCoreQueryClient,
} from '@dao-dao/state/contracts'
import { contractQueries, indexerQueries } from '@dao-dao/state/query'
import {
  ContractVersion,
  ProposalModuleInfo,
  ProposalModuleType,
} from '@dao-dao/types'
import {
  ContractVersionInfo,
  InfoResponse,
} from '@dao-dao/types/contracts/common'
import { ProposalModuleWithInfo } from '@dao-dao/types/contracts/DaoDaoCore'
import {
  DaoProposalMultipleAdapterId,
  DaoProposalSingleAdapterId,
  getCosmWasmClientForChainId,
  indexToProposalModulePrefix,
  parseContractVersion,
} from '@dao-dao/utils'

import { matchAdapter } from '../proposal-module-adapter'

export const fetchProposalModules = async (
  queryClient: QueryClient,
  chainId: string,
  coreAddress: string,
  coreVersion: ContractVersion,
  // If already fetched (from indexer), use that.
  activeProposalModules?: ProposalModuleWithInfo[]
): Promise<ProposalModuleInfo[]> => {
  // Try indexer first.
  if (!activeProposalModules) {
    try {
      activeProposalModules = await queryClient.fetchQuery(
        indexerQueries.queryContract(queryClient, {
          chainId,
          contractAddress: coreAddress,
          formula: 'daoCore/activeProposalModules',
        })
      )
    } catch (err) {
      // Ignore error.
      console.error(err)
    }
  }
  // If indexer fails, fallback to querying chain.
  if (!activeProposalModules) {
    activeProposalModules = await fetchProposalModulesWithInfoFromChain(
      chainId,
      coreAddress,
      coreVersion
    )
  }

  return await Promise.all(
    activeProposalModules.map(async ({ info, address, prefix }) =>
      fetchProposalModule({
        queryClient,
        chainId,
        address,
        prefix,
        info,
      })
    )
  )
}

export const fetchProposalModule = async ({
  queryClient,
  chainId,
  address,
  prefix,
  info,
}: {
  queryClient: QueryClient
  chainId: string
  address: string
  prefix: string
  /**
   * If not provided, it will be fetched.
   */
  info?: ContractVersionInfo
}): Promise<ProposalModuleInfo> => {
  // If no info, fetch it.
  if (!info) {
    info = (
      await queryClient.fetchQuery(
        contractQueries.info(queryClient, {
          chainId,
          address,
        })
      )
    ).info
  }

  const version =
    (info && parseContractVersion(info.version)) ?? ContractVersion.Unknown

  // Get adapter for this contract.
  const adapter = info && matchAdapter(info.contract)

  // Get proposal module type from adapter.
  const type: ProposalModuleType =
    adapter?.id === DaoProposalSingleAdapterId
      ? ProposalModuleType.Single
      : adapter?.id === DaoProposalMultipleAdapterId
        ? ProposalModuleType.Multiple
        : ProposalModuleType.Other

  const [prePropose, veto] = await Promise.allSettled([
    // Get pre-propose address if exists.
    adapter?.functions.fetchPrePropose?.(
      queryClient,
      chainId,
      address,
      version
    ),
    // Get veto config if exists.
    adapter?.functions.fetchVetoConfig?.(chainId, address, version),
  ])

  return {
    address,
    prefix,
    contractName: info?.contract || '',
    version,
    prePropose: (prePropose.status === 'fulfilled' && prePropose.value) || null,
    ...(type !== ProposalModuleType.Other
      ? {
          type,
          config: {
            veto: (veto.status === 'fulfilled' && veto.value) || null,
          },
        }
      : {
          type,
        }),
  }
}

const LIMIT = 10
const fetchProposalModulesWithInfoFromChain = async (
  chainId: string,
  coreAddress: string,
  coreVersion: ContractVersion
): Promise<ProposalModuleWithInfo[]> => {
  const cwClient = await getCosmWasmClientForChainId(chainId)

  let paginationStart: string | undefined

  const proposalModules: ProposalModuleWithInfo[] = []
  const getV1ProposalModules = async () =>
    (
      await new CwCoreV1QueryClient(cwClient, coreAddress).proposalModules({
        startAt: paginationStart,
        limit: LIMIT,
        // Ignore first address if startAt was set.
      })
    )
      .slice(paginationStart !== undefined ? 1 : 0)
      .map(async (address, index) => {
        // All InfoResponses are the same, so just use core's.
        const { info }: InfoResponse = await cwClient.queryContractSmart(
          address,
          {
            info: {},
          }
        )

        return {
          address,
          prefix: indexToProposalModulePrefix(index),
          // V1 are all enabled.
          status: 'Enabled' as const,
          info,
        }
      })

  const getV2ProposalModules = async () =>
    (
      await new DaoDaoCoreQueryClient(
        cwClient,
        coreAddress
      ).activeProposalModules({
        startAfter: paginationStart,
        limit: LIMIT,
      })
    ).map(async (data) => {
      // All InfoResponses are the same, so just use core's.
      const { info }: InfoResponse = await cwClient.queryContractSmart(
        data.address,
        {
          info: {},
        }
      )

      return {
        ...data,
        info,
      }
    })

  while (true) {
    const _proposalModules = await Promise.all(
      coreVersion === ContractVersion.V1
        ? await getV1ProposalModules()
        : await getV2ProposalModules()
    )
    if (!_proposalModules.length) {
      break
    }

    paginationStart = _proposalModules[_proposalModules.length - 1].address
    proposalModules.push(..._proposalModules)

    if (_proposalModules.length < LIMIT) {
      break
    }
  }

  return proposalModules
}
