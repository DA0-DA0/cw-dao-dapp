import {
  FetchQueryOptions,
  QueryClient,
  skipToken,
} from '@tanstack/react-query'

import {
  AnyChain,
  DaoInfo,
  IProposalModuleBase,
  IVotingModuleBase,
  InstantiateInfo,
  ModuleInstantiateInfo,
} from '@dao-dao/types'
import {
  InitialItem,
  InstantiateMsg,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoDaoCore'
import {
  encodeJsonToBase64,
  getChainForChainId,
  getFundsFromDaoInstantiateMsg,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { daoDaoCoreQueries, daoQueries } from '../../query'
import { FallbackProposalModule } from '../proposal-module/FallbackProposalModule'
import { MultipleChoiceProposalModule } from '../proposal-module/MultipleChoiceProposalModule'
import { SingleChoiceProposalModule } from '../proposal-module/SingleChoiceProposalModule'
import {
  Cw20StakedVotingModule,
  Cw4VotingModule,
  Cw721StakedVotingModule,
  FallbackVotingModule,
  NativeStakedVotingModule,
  NeutronVotingRegistryVotingModule,
  OnftStakedVotingModule,
  SgCommunityNftVotingModule,
  TokenStakedVotingModule,
} from '../voting-module'
import { DaoBase } from './base'

export const getVotingModuleBases = () => [
  Cw4VotingModule,
  Cw20StakedVotingModule,
  Cw721StakedVotingModule,
  NativeStakedVotingModule,
  TokenStakedVotingModule,
  NeutronVotingRegistryVotingModule,
  OnftStakedVotingModule,
  SgCommunityNftVotingModule,
]

export const getProposalModuleBases = () => [
  SingleChoiceProposalModule,
  MultipleChoiceProposalModule,
]

export class CwDao extends DaoBase {
  protected _info: DaoInfo | undefined
  protected _proposalModules: readonly IProposalModuleBase[] = []
  protected _votingModule: IVotingModuleBase | undefined

  constructor(
    queryClient: QueryClient,
    protected readonly options: {
      chainId: string
      coreAddress: string
    }
  ) {
    super(queryClient)

    // Attempt immediate initialization if query is cached.
    this.setInfo(
      this.queryClient.getQueryData(
        daoQueries.info(this.queryClient, {
          chainId: this.options.chainId,
          coreAddress: this.options.coreAddress,
        }).queryKey
      )
    )
  }

  /**
   * Generate the DAO instantiate info. Use the voting module and proposal
   * module generateModuleInstantiateInfo functions to get the module
   * instantiate info objects.
   */
  static generateInstantiateInfo(
    chainId: string,
    config: {
      admin?: string | null
      uri?: string | null
      name: string
      description: string
      imageUrl?: string | null
      initialItems?: InitialItem[] | null
      /**
       * Defaults to true.
       */
      automaticallyAddCw20s?: boolean
      /**
       * Defaults to true.
       */
      automaticallyAddCw721s?: boolean
    },
    votingModule: ModuleInstantiateInfo,
    proposalModules: ModuleInstantiateInfo[]
  ): InstantiateInfo {
    return {
      admin: config.admin || null,
      codeId: mustGetSupportedChainConfig(chainId).codeIds.DaoDaoCore,
      label: `DAO DAO DAO (${Date.now()})`,
      msg: encodeJsonToBase64({
        admin: config.admin,
        automatically_add_cw20s: config.automaticallyAddCw20s ?? true,
        automatically_add_cw721s: config.automaticallyAddCw721s ?? true,
        dao_uri: config.uri,
        description: config.description,
        // Replace empty strings with null.
        image_url: config.imageUrl?.trim() || null,
        initial_items: config.initialItems,
        name: config.name,
        proposal_modules_instantiate_info: proposalModules,
        voting_module_instantiate_info: votingModule,
      } as InstantiateMsg),
      funds: getFundsFromDaoInstantiateMsg({
        voting_module_instantiate_info: votingModule,
        proposal_modules_instantiate_info: proposalModules,
      }),
    }
  }

  async init() {
    if (this.initialized) {
      return
    }

    // Ensure info is loaded.
    if (!this._info) {
      this.setInfo(
        await this.queryClient.fetchQuery(
          daoQueries.info(this.queryClient, {
            chainId: this.options.chainId,
            coreAddress: this.options.coreAddress,
          })
        )
      )
    }

    // Ensure proposal modules are initialized.
    await Promise.all(
      this.proposalModules.map((p) =>
        p.initialized ? Promise.resolve() : p.init()
      )
    )
  }

  protected setInfo(info: DaoInfo | undefined) {
    this._info = info

    if (info) {
      const VotingModule =
        getVotingModuleBases().find((Base) =>
          Base.contractNames.includes(info.votingModuleInfo.contract)
        ) || FallbackVotingModule

      if (VotingModule === FallbackVotingModule) {
        console.error(
          `Voting module not found for contract: ${info.votingModuleInfo.contract}. Using fallback.`
        )
      }

      this._votingModule = new VotingModule(
        this.queryClient,
        this,
        info.votingModuleAddress,
        info.votingModuleInfo
      )

      const proposalModuleBases = getProposalModuleBases()
      this._proposalModules = info.proposalModules.map((proposalModule) => {
        const ProposalModule =
          proposalModuleBases.find((Base) =>
            Base.contractNames.includes(proposalModule.info.contract)
          ) || FallbackProposalModule

        if (ProposalModule === FallbackProposalModule) {
          console.error(
            `Proposal module not found for contract: ${proposalModule.info.contract}. Using fallback.`
          )
        }

        return new ProposalModule(
          this.queryClient,
          this,
          this.chainId,
          proposalModule.address,
          proposalModule.prefix
        )
      })
    }
  }

  get initialized() {
    return !!this._info && this.proposalModules.every((p) => p.initialized)
  }

  get info(): DaoInfo {
    if (!this._info) {
      throw new Error('Not initialized')
    }
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
    if (!this._votingModule) {
      throw new Error('Not initialized')
    }
    return this._votingModule
  }

  get proposalModules(): readonly IProposalModuleBase[] {
    return this._proposalModules
  }

  getVotingPowerQuery(
    address?: string,
    height?: number
  ): FetchQueryOptions<VotingPowerAtHeightResponse> {
    // If no address, return query in loading state.
    if (!address) {
      return {
        queryKey: [],
        queryFn: skipToken,
      }
    }

    return daoDaoCoreQueries.votingPowerAtHeight(this.queryClient, {
      chainId: this.options.chainId,
      contractAddress: this.options.coreAddress,
      args: {
        address,
        height,
      },
    })
  }

  getTotalVotingPowerQuery(
    height?: number
  ): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return daoDaoCoreQueries.totalPowerAtHeight(this.queryClient, {
      chainId: this.options.chainId,
      contractAddress: this.options.coreAddress,
      args: {
        height,
      },
    })
  }

  async getProposalCount(): Promise<number> {
    return (
      await Promise.all(this.proposalModules.map((p) => p.getProposalCount()))
    ).reduce((a, b) => a + b, 0)
  }
}
