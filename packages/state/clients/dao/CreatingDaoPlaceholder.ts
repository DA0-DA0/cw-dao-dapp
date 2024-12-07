import {
  FetchQueryOptions,
  QueryClient,
  skipToken,
} from '@tanstack/react-query'

import {
  AccountType,
  AnyChain,
  ContractVersion,
  DaoInfo,
  IProposalModuleBase,
  IVotingModuleBase,
  InstantiateInfo,
} from '@dao-dao/types'
import {
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoDaoCore'
import { getChainForChainId } from '@dao-dao/utils'

import { DaoBase } from './base'

/**
 * A placeholder DAO class used when creating a DAO. This is necessary for the
 * widget editors since some depend on the DAO context.
 */
export class CreatingDaoPlaceholder extends DaoBase {
  protected _info: DaoInfo

  constructor(
    protected readonly options: {
      chainId: string
      coreAddress: string
      coreVersion: ContractVersion
      name: string
      description: string
      imageUrl: string
    }
  ) {
    super(new QueryClient())

    this._info = {
      chainId: options.chainId,
      coreAddress: options.coreAddress,
      coreVersion: options.coreVersion,
      votingModuleAddress: '',
      votingModuleInfo: {
        contract: '',
        version: '',
      },
      proposalModules: [],
      contractAdmin: '',
      admin: '',
      name: options.name,
      description: options.description,
      imageUrl: options.imageUrl,
      created: Date.now(),
      isActive: true,
      activeThreshold: null,
      items: {},
      polytoneProxies: {},
      accounts: [
        {
          type: AccountType.Base,
          chainId: options.chainId,
          address: options.coreAddress,
        },
      ],
      parentDao: null,
    }
  }

  static generateInstantiateInfo(): InstantiateInfo {
    throw new Error('Not implemented')
  }

  async init() {}

  get initialized() {
    return true
  }

  get info(): DaoInfo {
    return this._info
  }

  get chainId(): string {
    return this.options.chainId
  }

  get chain(): AnyChain {
    return getChainForChainId(this.chainId)
  }

  get coreAddress(): string {
    return this.options.coreAddress
  }

  get votingModule(): IVotingModuleBase {
    throw new Error('Not implemented')
  }

  get proposalModules(): readonly IProposalModuleBase[] {
    return []
  }

  getVotingPowerQuery(): FetchQueryOptions<VotingPowerAtHeightResponse> {
    return {
      queryKey: [],
      queryFn: skipToken,
    }
  }

  getTotalVotingPowerQuery(): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return {
      queryKey: [],
      queryFn: skipToken,
    }
  }

  async getProposalCount(): Promise<number> {
    return 0
  }
}
