import {
  IProposalModuleAdapterCommon,
  IProposalModuleAdapterCommonInitialOptions,
  IProposalModuleAdapterInitialOptions,
  IProposalModuleAdapterOptions,
  IProposalModuleCommonContext,
  IProposalModuleContext,
  ProposalModule,
  ProposalModuleAdapter,
} from '@dao-dao/types'

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
  proposalModule: ProposalModule,
  initialOptions: IProposalModuleAdapterCommonInitialOptions
): IProposalModuleAdapterCommon & { id: string } => {
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
      ...initialOptions,
      proposalModule,
    }),
  }
}

export const matchAndLoadAdapter = (
  proposalModules: ProposalModule[],
  proposalId: string,
  initialOptions: IProposalModuleAdapterInitialOptions
): IProposalModuleContext => {
  // Prefix is alphabetical, followed by numeric prop number. If there is an
  // asterisk between the prefix and the prop number, this is a pre-propose
  // proposal. Allow the prefix to be empty for backwards compatibility. Default
  // to first proposal module if no alphabetical prefix.
  const proposalIdParts = proposalId.match(/^([A-Z]*)(\*)?(\d+)$/)
  if (proposalIdParts?.length !== 4) {
    throw new ProposalModuleAdapterError('Failed to parse proposal ID.')
  }

  // Undefined if matching group doesn't exist, i.e. no prefix exists.
  const proposalPrefix = proposalIdParts[1] ?? ''
  const isPreProposeApprovalProposal = proposalIdParts[2] === '*'
  const proposalNumber = Number(proposalIdParts[3])

  if (isNaN(proposalNumber)) {
    throw new ProposalModuleAdapterError(
      `Invalid proposal number "${proposalNumber}".`
    )
  }

  const proposalModule = proposalPrefix
    ? proposalModules.find(({ prefix }) => prefix === proposalPrefix)
    : // If no proposalPrefix (i.e. proposalId is just a number), and there is
    // only one proposal module, return it. This should handle backwards
    // compatibility when there were no prefixes and every DAO used a single
    // choice proposal module.
    proposalModules.length === 1
    ? proposalModules[0]
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
    ...initialOptions,
    proposalModule,
    proposalId,
    proposalNumber,
    isPreProposeApprovalProposal,
  }

  return {
    id: adapter.id,
    options: adapterOptions,
    adapter: adapter.load(adapterOptions),
    common: adapter.loadCommon({
      ...initialOptions,
      proposalModule,
    }),
  }
}

export const commonContextFromAdapterContext = (
  adapterContext: IProposalModuleContext
): IProposalModuleCommonContext => ({
  id: adapterContext.id,
  common: adapterContext.common,
  options: {
    chain: adapterContext.options.chain,
    coreAddress: adapterContext.options.coreAddress,
    proposalModule: adapterContext.options.proposalModule,
  },
})

export const matchAndLoadCommonContext = (
  ...params: Parameters<typeof matchAndLoadCommon>
): IProposalModuleCommonContext => {
  const { id, ...common } = matchAndLoadCommon(...params)

  return {
    id,
    common,
    options: {
      ...params[1],
      proposalModule: params[0],
    },
  }
}

export class ProposalModuleAdapterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProposalModuleAdapterError'
  }
}
