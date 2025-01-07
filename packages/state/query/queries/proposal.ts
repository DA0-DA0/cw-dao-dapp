import { QueryClient, queryOptions } from '@tanstack/react-query'

import {
  PreProposeModule,
  PreProposeModuleType,
  PreProposeModuleTypedConfig,
} from '@dao-dao/types'
import { PreProposeSubmissionPolicy } from '@dao-dao/types/contracts/DaoPreProposeSingle'
import { Config as NeutronCwdSubdaoTimelockSingleConfig } from '@dao-dao/types/contracts/NeutronCwdSubdaoTimelockSingle'
import {
  ContractName,
  DAO_PRE_PROPOSE_MULTIPLE_CONTRACT_NAMES,
  DAO_PRE_PROPOSE_SINGLE_CONTRACT_NAMES,
  getCosmWasmClientForChainId,
  parseContractVersion,
} from '@dao-dao/utils'

import {
  DaoPreProposeApprovalSingleQueryClient,
  DaoPreProposeApproverQueryClient,
  NeutronCwdSubdaoPreProposeSingleQueryClient,
  NeutronCwdSubdaoTimelockSingleQueryClient,
} from '../../contracts'
import { contractQueries } from './contract'
import { daoPreProposeSingleQueries } from './contracts/DaoPreProposeSingle'
import { indexerQueries } from './indexer'

/**
 * Fetch pre-propose module info.
 */
export const fetchPreProposeModule = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<PreProposeModule> => {
  const { info: contractInfo } = await queryClient.fetchQuery(
    contractQueries.info(queryClient, {
      chainId,
      address: address,
    })
  )
  const contractVersion = parseContractVersion(contractInfo.version)

  let typedConfig: PreProposeModuleTypedConfig = {
    // If normal DAO DAO pre-propose module, use normal. Otherwise, default to
    // other.
    type: [
      ...DAO_PRE_PROPOSE_SINGLE_CONTRACT_NAMES,
      ...DAO_PRE_PROPOSE_MULTIPLE_CONTRACT_NAMES,
    ].includes(contractInfo.contract)
      ? PreProposeModuleType.Normal
      : PreProposeModuleType.Other,
  }

  // All pre-propose modules share the same config.
  const moduleConfig = await queryClient
    .fetchQuery(
      daoPreProposeSingleQueries.config(queryClient, {
        chainId,
        contractAddress: address,
      })
    )
    // If failed to query config, fail gracefully since a DAO may use any custom
    // pre-propose module.
    .catch(() => undefined)

  switch (contractInfo.contract) {
    case ContractName.PreProposeApprovalSingle:
    case ContractName.PreProposeApprovalMultiple: {
      let approver: string | undefined
      let preProposeApproverContract: string | null = null

      // Try indexer first.
      try {
        approver = await queryClient.fetchQuery(
          indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: address,
            formula: 'daoPreProposeApprovalSingle/approver',
          })
        )
      } catch (err) {
        // Ignore error.
        console.error(err)
      }
      // If indexer fails, fallback to querying chain.
      if (!approver) {
        const client = new DaoPreProposeApprovalSingleQueryClient(
          await getCosmWasmClientForChainId(chainId),
          address
        )

        approver = (await client.queryExtension({
          msg: {
            approver: {},
          },
        })) as string
      }

      // Check if approver is an approver contract.
      const approverContractName = (
        await queryClient
          .fetchQuery(
            contractQueries.info(queryClient, {
              chainId,
              address: approver,
            })
          )
          .catch(() => undefined)
      )?.info.contract
      if (approverContractName === ContractName.PreProposeApprover) {
        preProposeApproverContract = approver
        approver = undefined

        // Get DAO address from approver contract.
        // Try indexer first.
        try {
          approver = await queryClient.fetchQuery(
            indexerQueries.queryContract(queryClient, {
              chainId,
              contractAddress: preProposeApproverContract,
              formula: 'daoPreProposeApprover/dao',
            })
          )
        } catch (err) {
          // Ignore error.
          console.error(err)
        }
        // If indexer fails, fallback to querying chain.
        if (!approver) {
          const client = new DaoPreProposeApproverQueryClient(
            await getCosmWasmClientForChainId(chainId),
            preProposeApproverContract
          )

          approver = await client.dao()
        }
      }

      typedConfig = {
        type: PreProposeModuleType.Approval,
        config: {
          approver,
          preProposeApproverContract,
        },
      }
      break
    }
    case ContractName.PreProposeApprover: {
      let preProposeApprovalContract: string | undefined
      // Try indexer first.
      try {
        preProposeApprovalContract = await queryClient.fetchQuery(
          indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: address,
            formula: 'daoPreProposeApprover/preProposeApprovalContract',
          })
        )
      } catch (err) {
        // Ignore error.
        console.error(err)
      }
      // If indexer fails, fallback to querying chain.
      if (!preProposeApprovalContract) {
        const client = new DaoPreProposeApproverQueryClient(
          await getCosmWasmClientForChainId(chainId),
          address
        )

        preProposeApprovalContract = (await client.queryExtension({
          msg: {
            pre_propose_approval_contract: {},
          },
        })) as string
      }

      let approvalDao: string | undefined
      // Try indexer first.
      try {
        approvalDao = await queryClient.fetchQuery(
          indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: preProposeApprovalContract,
            formula: 'daoPreProposeApprovalSingle/dao',
          })
        )
      } catch (err) {
        // Ignore error.
        console.error(err)
      }
      // If indexer fails, fallback to querying chain.
      if (!approvalDao) {
        const client = new DaoPreProposeApprovalSingleQueryClient(
          await getCosmWasmClientForChainId(chainId),
          preProposeApprovalContract
        )

        approvalDao = await client.dao()
      }

      typedConfig = {
        type: PreProposeModuleType.Approver,
        config: {
          approvalDao,
          preProposeApprovalContract,
        },
      }
      break
    }
    case ContractName.NeutronCwdSubdaoPreProposeSingle: {
      let timelockAddress: string | undefined
      // Try indexer first.
      try {
        timelockAddress = await queryClient.fetchQuery(
          indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: address,
            formula: 'neutron/cwdSubdaoPreProposeSingle/timelockAddress',
          })
        )
      } catch (err) {
        // Ignore error.
        console.error(err)
      }
      // If indexer fails, fallback to querying chain.
      if (!timelockAddress) {
        const client = new NeutronCwdSubdaoPreProposeSingleQueryClient(
          await getCosmWasmClientForChainId(chainId),
          address
        )

        timelockAddress = (await client.queryExtension({
          msg: {
            timelock_address: {},
          },
        })) as string
      }

      let config: NeutronCwdSubdaoTimelockSingleConfig | undefined
      // Try indexer first.
      try {
        config = await queryClient.fetchQuery(
          indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: timelockAddress,
            formula: 'neutron/cwdSubdaoTimelockSingle/config',
          })
        )
      } catch (err) {
        // Ignore error.
        console.error(err)
      }
      // If indexer fails, fallback to querying chain.
      if (!config) {
        const client = new NeutronCwdSubdaoTimelockSingleQueryClient(
          await getCosmWasmClientForChainId(chainId),
          timelockAddress
        )

        config = await client.config()
      }

      typedConfig = {
        type: PreProposeModuleType.NeutronSubdaoSingle,
        config: {
          timelockAddress,
          timelockConfig: config,
        },
      }
      break
    }
    case ContractName.NeutronCwdPreProposeSingleOverrule:
      typedConfig = {
        type: PreProposeModuleType.NeutronOverruleSingle,
      }
      break
  }

  const submissionPolicy: PreProposeSubmissionPolicy = moduleConfig
    ? // < v2.5.0
      'open_proposal_submission' in moduleConfig
      ? moduleConfig.open_proposal_submission
        ? {
            anyone: {
              denylist: [],
            },
          }
        : {
            specific: {
              dao_members: true,
              allowlist: [],
              denylist: [],
            },
          }
      : // >= v2.5.0
        'submission_policy' in moduleConfig && moduleConfig.submission_policy
        ? moduleConfig.submission_policy
        : // If unknown config shape, assume only members can propose.
          {
            specific: {
              dao_members: true,
              allowlist: [],
              denylist: [],
            },
          }
    : // If no config loaded, assume only members can propose.
      {
        specific: {
          dao_members: true,
          allowlist: [],
          denylist: [],
        },
      }

  return {
    contractName: contractInfo.contract,
    version: contractVersion,
    address,
    submissionPolicy,
    ...typedConfig,
  }
}

export const proposalQueries = {
  /**
   * Fetch pre-propose module info.
   */
  preProposeModule: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchPreProposeModule>[1]
  ) =>
    queryOptions({
      queryKey: ['proposal', 'preProposeModule', options],
      queryFn: () => fetchPreProposeModule(queryClient, options),
    }),
}
