import {
  IDaoBase,
  IProposalModuleAdapterCommon,
  IProposalModuleAdapterOptions,
  IProposalModuleBase,
  IProposalModuleCommonContext,
  IProposalModuleContext,
  ProposalModuleAdapter,
} from '@dao-dao/types'
import { extractProposalInfo } from '@dao-dao/utils'

import {
  DaoProposalMultipleAdapter,
  DaoProposalSingleAdapter,
} from './adapters'

// Adapters need to be loaded lazily like this, as opposed to just defining a
// global array, due to cyclic dependencies. The adapter defintion files include
// components, which include the react folder index, which includes the provider
// file, which includes the core because it uses the matching helpers below,
// which depend on this adapter list. The fix is that no internal components
// should have a dependency chain that leads back to the matching functions
// below, except the react provider, which we should only be used externally.
// This is a problem to solve later.
export const getAdapters = (): readonly ProposalModuleAdapter[] => [
  DaoProposalSingleAdapter,
  DaoProposalMultipleAdapter,
]

export const getAdapterById = (id: string) =>
  getAdapters().find((adapter) => adapter.id === id)

export const matchAdapter = (contractNameToMatch: string) =>
  getAdapters().find((adapter) =>
    adapter.contractNames.some(
      (contractName) => contractNameToMatch === contractName
    )
  )

export const matchAndLoadCommon = (
  dao: IDaoBase,
  proposalModuleAddress: string
): IProposalModuleAdapterCommon & {
  id: string
  proposalModule: IProposalModuleBase
} => {
  const proposalModule = dao.getProposalModule(proposalModuleAddress)
  if (!proposalModule) {
    throw new ProposalModuleAdapterError(
      `Failed to find proposal module with address ${proposalModuleAddress}.`
    )
  }

  const adapter = matchAdapter(proposalModule.contractName)
  if (!adapter) {
    throw new ProposalModuleAdapterError(
      `Failed to find proposal module adapter matching contract "${
        proposalModule.contractName
      }". Available adapters: ${getAdapters()
        .map(({ id: contractName }) => contractName)
        .join(', ')}`
    )
  }

  return {
    id: adapter.id,
    ...adapter.loadCommon({
      proposalModule,
    }),
    proposalModule,
  }
}

export const matchAndLoadAdapter = (
  dao: IDaoBase,
  proposalId: string
): IProposalModuleContext => {
  let proposalPrefix: string
  let proposalNumber: number
  let isPreProposeApprovalProposal: boolean
  try {
    const info = extractProposalInfo(proposalId)
    proposalPrefix = info.prefix
    proposalNumber = info.proposalNumber
    isPreProposeApprovalProposal = info.isPreProposeApprovalProposal
  } catch (err) {
    throw new ProposalModuleAdapterError(
      err instanceof Error ? err.message : 'Failed to parse proposal ID.'
    )
  }

  const proposalModule = proposalPrefix
    ? dao.proposalModules.find((p) => p.info.prefix === proposalPrefix)
    : // If no proposalPrefix (i.e. proposalId is just a number), and there is
      // only one proposal module, return it. This should handle backwards
      // compatibility when there were no prefixes and every DAO used a single
      // choice proposal module.
      dao.proposalModules.length === 1
      ? dao.proposalModules[0]
      : undefined
  if (!proposalModule) {
    throw new ProposalModuleAdapterError(
      `Failed to find proposal module for prefix "${proposalPrefix}".`
    )
  }

  const adapter = matchAdapter(proposalModule.contractName)

  if (!adapter) {
    throw new ProposalModuleAdapterError(
      `Failed to find proposal module adapter matching contract "${
        proposalModule.contractName
      }". Available adapters: ${getAdapters()
        .map(({ id: contractName }) => contractName)
        .join(', ')}`
    )
  }

  const adapterOptions: IProposalModuleAdapterOptions = {
    chain: dao.chain,
    coreAddress: dao.coreAddress,
    proposalModule: proposalModule.info,
    proposalId,
    proposalNumber,
    isPreProposeApprovalProposal,
  }

  return {
    id: adapter.id,
    options: adapterOptions,
    adapter: adapter.load(adapterOptions),
    common: adapter.loadCommon({
      proposalModule,
    }),
    proposalModule,
  }
}

export const commonContextFromAdapterContext = (
  adapterContext: IProposalModuleContext
): IProposalModuleCommonContext => ({
  id: adapterContext.id,
  common: adapterContext.common,
  options: {
    proposalModule: adapterContext.proposalModule,
  },
})

export const matchAndLoadCommonContext = (
  ...params: Parameters<typeof matchAndLoadCommon>
): IProposalModuleCommonContext => {
  const { id, proposalModule, ...common } = matchAndLoadCommon(...params)

  return {
    id,
    common,
    options: {
      proposalModule,
    },
  }
}

export class ProposalModuleAdapterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProposalModuleAdapterError'
  }
}
